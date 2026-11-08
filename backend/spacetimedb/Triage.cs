using System;
using System.Collections.Generic;
using SpacetimeDB;

public static partial class Module
{
    static void RecomputeTriage(ReducerContext ctx, string incidentId)
    {
        if (ctx.Db.Incident.Id.Find(incidentId) is not Incident inc) return;

        long now = ctx.Timestamp.MicrosecondsSinceUnixEpoch;
        int score = 0;
        var factors = new List<string>();

        int sev = Math.Clamp(inc.Severity, 1, 4);
        score += sev * 10;
        factors.Add($"+{sev * 10} declared severity {inc.Severity}");

        int scope = 0;
        ulong records = 0;
        bool sensitiveExfil = false;
        foreach (var item in ctx.Db.ScopeItem.IncidentId.Filter(incidentId))
        {
            bool sensitive = item.DataType == "health" || item.DataType == "payment" || item.DataType == "ssn";
            if (item.Status == ScopeExfiltrated)
            {
                scope += sensitive ? 15 : 8;
                records += item.RecordCount;
                if (sensitive) sensitiveExfil = true;
            }
            else if (item.Status == ScopeUnknown)
            {
                scope += sensitive ? 8 : 4;
            }
        }
        scope = Math.Min(scope, 35);
        if (scope > 0) { score += scope; factors.Add($"+{scope} data exfiltrated or unconfirmed"); }
        if (records >= 10000) { score += 10; factors.Add("+10 over 10,000 records exfiltrated"); }
        else if (records >= 1000) { score += 5; factors.Add("+5 over 1,000 records exfiltrated"); }

        bool anyOpen = false, soon = false;
        foreach (var ob in ctx.Db.NotificationObligation.IncidentId.Filter(incidentId))
        {
            if (ob.Status != "open") continue;
            anyOpen = true;
            if (ob.DueAt is Timestamp due && due.MicrosecondsSinceUnixEpoch - now < 72L * 3600L * 1_000_000L) soon = true;
        }
        if (anyOpen) { score += 10; factors.Add("+10 open breach-notification obligations"); }
        if (soon) { score += 10; factors.Add("+10 a notification deadline is within 72 hours or overdue"); }

        if (ctx.Db.EventIncident.IncidentId.Find(incidentId) is not null)
        {
            score += 10;
            factors.Add("+10 part of a multi-company event");
        }

        if (sensitiveExfil && score < 45)
        {
            score = 45;
            factors.Add("floor: sensitive data exfiltrated, never below High");
        }

        score = Math.Min(score, 100);
        string level = score >= 70 ? "Critical" : score >= 45 ? "High" : score >= 25 ? "Medium" : "Low";

        var row = new TriageAssessment
        {
            IncidentId = incidentId,
            Score = score,
            Level = level,
            Factors = factors,
            UpdatedAt = ctx.Timestamp,
        };
        if (ctx.Db.TriageAssessment.IncidentId.Find(incidentId) is not null) ctx.Db.TriageAssessment.IncidentId.Update(row);
        else ctx.Db.TriageAssessment.Insert(row);
    }
}