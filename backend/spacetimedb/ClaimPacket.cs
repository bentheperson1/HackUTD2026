using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using SpacetimeDB;

public static partial class Module
{
    static string Fmt(Timestamp t) =>
        DateTimeOffset.FromUnixTimeMilliseconds(t.MicrosecondsSinceUnixEpoch / 1000).UtcDateTime
            .ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture) + " UTC";

    // Incident members, guests, or staff of an insurer this company has linked to
    static bool CanSeeIncident(ReducerContext ctx, Incident inc)
    {
        if (FindIncidentRole(ctx, inc.Id) != null) return true;
        foreach (var pol in ctx.Db.Policy.PolicyholderOrgId.Filter(inc.OrgId))
            if (IsInsurerStaff(ctx, pol.InsurerOrgId)) return true;
        return false;
    }

    [SpacetimeDB.Reducer]
    public static void BuildClaimPacket(ReducerContext ctx, string incidentId)
    {
        if (ctx.Db.Incident.Id.Find(incidentId) is not Incident inc) throw new Exception("No such incident.");
        if (!CanSeeIncident(ctx, inc)) throw new Exception("You don't have access to this incident.");

        string company = ctx.Db.Organization.Id.Find(inc.OrgId) is Organization o ? o.Name : "Unknown company";
        string by = ctx.Db.User.Id.Find(ctx.Sender) is User u ? u.DisplayName : "system";
        var sb = new StringBuilder();

        sb.AppendLine($"# First Notice of Loss: {inc.Name}");
        sb.AppendLine();
        sb.AppendLine($"- Incident ID: {inc.Id}");
        sb.AppendLine($"- Company: {company}");
        sb.AppendLine($"- Opened: {Fmt(inc.OpenedAt)}");
        sb.AppendLine($"- Phase: {PhaseNames[Math.Clamp(inc.Phase, 0, PhaseNames.Length - 1)]}");
        sb.AppendLine($"- Status: {(inc.Status == StatusClosed ? "Closed" : "Open")}");
        sb.AppendLine($"- Declared severity: {inc.Severity}");
        if (ctx.Db.TriageAssessment.IncidentId.Find(incidentId) is TriageAssessment tri)
            sb.AppendLine($"- Triage: {tri.Level} ({tri.Score}/100)");
        if (ctx.Db.EventIncident.IncidentId.Find(incidentId) is EventIncident link
            && ctx.Db.CatastropheEvent.Id.Find(link.EventId) is CatastropheEvent ev)
            sb.AppendLine($"- Related event: {ev.Title}");
        sb.AppendLine($"- Prepared: {Fmt(ctx.Timestamp)} by {by}");

        sb.AppendLine();
        sb.AppendLine("## Summary and current status");
        sb.AppendLine(string.IsNullOrWhiteSpace(inc.Summary) ? "(not yet entered)" : inc.Summary);
        sb.AppendLine();
        sb.AppendLine(string.IsNullOrWhiteSpace(inc.CurrentStatus) ? "(no current status entered)" : inc.CurrentStatus);

        sb.AppendLine();
        sb.AppendLine("## Scope of compromised data");
        bool anyScope = false;
        foreach (var item in ctx.Db.ScopeItem.IncidentId.Filter(incidentId))
        {
            anyScope = true;
            string states = string.Join(", ", item.States ?? new List<string>());
            sb.AppendLine($"- {item.DataType}: {item.RecordCount} records, {ScopeStatusName(item.Status)}, states: {(states.Length == 0 ? "none listed" : states)}");
        }
        if (!anyScope) sb.AppendLine("- No scope recorded yet.");

        sb.AppendLine();
        sb.AppendLine("## Notification obligations (guidance for counsel to review, not legal advice)");
        bool anyOb = false;
        foreach (var ob in ctx.Db.NotificationObligation.IncidentId.Filter(incidentId))
        {
            anyOb = true;
            string due = ob.DueAt is Timestamp d ? Fmt(d) : "no fixed deadline on file; counsel to confirm";
            sb.AppendLine($"- {ob.State}: {ob.Status}, due {due}. {ob.Reason}");
        }
        if (!anyOb) sb.AppendLine("- None triggered.");

        sb.AppendLine();
        sb.AppendLine("## Response actions");
        bool anyTask = false;
        foreach (var t in ctx.Db.Task.IncidentId.Filter(incidentId))
        {
            anyTask = true;
            sb.AppendLine($"- [{t.Status}] {t.Title} ({t.ForRole})");
        }
        if (!anyTask) sb.AppendLine("- No tasks recorded.");

        sb.AppendLine();
        sb.AppendLine("## Timeline");
        var entries = ctx.Db.TimelineEntry.IncidentId.Filter(incidentId)
            .OrderBy(t => t.CreatedAt.MicrosecondsSinceUnixEpoch).ToList();
        foreach (var t in entries.Skip(Math.Max(0, entries.Count - 200)))
            sb.AppendLine($"- {Fmt(t.CreatedAt)}: {t.Action}");

        string narrative = ctx.Db.ClaimPacket.IncidentId.Find(incidentId) is ClaimPacket old ? old.Narrative : "";
        var row = new ClaimPacket
        {
            IncidentId = incidentId,
            Body = sb.ToString(),
            Narrative = narrative,
            GeneratedAt = ctx.Timestamp,
            GeneratedBy = ctx.Sender,
        };
        if (ctx.Db.ClaimPacket.IncidentId.Find(incidentId) is not null) ctx.Db.ClaimPacket.IncidentId.Update(row);
        else ctx.Db.ClaimPacket.Insert(row);

        LogTimeline(ctx, incidentId, "Claim packet generated");
    }

    [SpacetimeDB.Reducer]
    public static void SaveClaimNarrative(ReducerContext ctx, string incidentId, string text)
    {
        if (ctx.Db.Incident.Id.Find(incidentId) is not Incident inc) throw new Exception("No such incident.");
        if (!CanSeeIncident(ctx, inc)) throw new Exception("You don't have access to this incident.");
        if (ctx.Db.ClaimPacket.IncidentId.Find(incidentId) is not ClaimPacket p) throw new Exception("Build the packet first.");

        p.Narrative = Clean(text, 4000, "Narrative");
        ctx.Db.ClaimPacket.IncidentId.Update(p);
    }
}