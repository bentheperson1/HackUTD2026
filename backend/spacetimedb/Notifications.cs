using System;
using System.Collections.Generic;
using System.Linq;
using SpacetimeDB;

public static partial class Module
{
    static void RecomputeObligations(ReducerContext ctx, string incidentId)
    {
        if (ctx.Db.Incident.Id.Find(incidentId) is not Incident incident) return;

        var reasons = new Dictionary<string, string>();
        var rules = new Dictionary<string, NotificationRule>();

        foreach (var item in ctx.Db.ScopeItem.IncidentId.Filter(incidentId))
        {
            if (item.Status != ScopeExfiltrated && item.Status != ScopeUnknown) continue;

            foreach (var state in item.States ?? new List<string>())
            {
                if (ctx.Db.NotificationRule.State.Find(state) is not NotificationRule rule) continue;
                if (!rule.CoveredData.Contains(item.DataType)) continue;

                string why = $"{item.DataType} records of {state} residents ({ScopeStatusName(item.Status)})";
                reasons[state] = reasons.TryGetValue(state, out var prev) ? prev + "; " + why : why;
                rules[state] = rule;
            }
        }

        var existing = ctx.Db.NotificationObligation.IncidentId.Filter(incidentId).ToList();
        foreach (var ob in existing)
            if (!reasons.ContainsKey(ob.State) && ob.Status == "open")
                ctx.Db.NotificationObligation.Id.Delete(ob.Id);

        foreach (var kv in reasons)
        {
            string state = kv.Key;
            var rule = rules[state];

            Timestamp? due = null;
            if (rule.DeadlineDays is ulong days)
                due = incident.OpenedAt + Secs((long)days * 86_400L);

            bool found = false;
            foreach (var ob in existing)
            {
                if (ob.State != state) continue;
                found = true;
                if (ob.Status == "open")
                {
                    var updated = ob;
                    updated.Reason = kv.Value;
                    updated.DueAt = due;
                    ctx.Db.NotificationObligation.Id.Update(updated);
                }
                break;
            }

            if (!found)
            {
                ctx.Db.NotificationObligation.Insert(new NotificationObligation
                {
                    Id = 0,
                    IncidentId = incidentId,
                    State = state,
                    DueAt = due,
                    Reason = kv.Value,
                    Status = "open",
                });
                LogTimeline(ctx, incidentId, $"Notification obligation triggered: {state}");
            }
        }
    }

    [SpacetimeDB.Reducer]
    public static void SetObligationStatus(ReducerContext ctx, ulong obligationId, string status)
    {
        if (ctx.Db.NotificationObligation.Id.Find(obligationId) is not NotificationObligation ob)
            throw new Exception("No such obligation.");
        RequireRole(ctx, ob.IncidentId, CanMarkNotices);

        if (status != "open" && status != "sent" && status != "not_required") throw new Exception("Unknown status.");
        ob.Status = status;
        ctx.Db.NotificationObligation.Id.Update(ob);
        LogTimeline(ctx, ob.IncidentId, $"Notice for {ob.State} marked {status}");
        RecomputeTriage(ctx, ob.IncidentId);
    }
}