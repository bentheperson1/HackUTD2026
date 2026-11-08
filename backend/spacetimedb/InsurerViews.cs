using System.Collections.Generic;
using SpacetimeDB;

public static partial class Module
{
    static List<ulong> InsurerOrgIds(ViewContext ctx)
    {
        var ids = new List<ulong>();
        foreach (var om in ctx.Db.OrgMember.Person.Filter(ctx.Sender))
            if (ctx.Db.OrgProfile.OrgId.Find(om.OrgId) is OrgProfile p && p.Kind == "insurer" && !ids.Contains(om.OrgId))
                ids.Add(om.OrgId);
        return ids;
    }

    static List<Incident> PolicyholderIncidents(ViewContext ctx, bool includeClosed)
    {
        var result = new List<Incident>();
        var seenOrgs = new HashSet<ulong>();
        foreach (var insurerId in InsurerOrgIds(ctx))
            foreach (var pol in ctx.Db.Policy.InsurerOrgId.Filter(insurerId))
            {
                if (!seenOrgs.Add(pol.PolicyholderOrgId)) continue;
                foreach (var inc in ctx.Db.Incident.OrgId.Filter(pol.PolicyholderOrgId))
                    if (!inc.IsDrill && (includeClosed || inc.Status == StatusOpen)) result.Add(inc);
            }
        return result;
    }

    [SpacetimeDB.View(Accessor = "InsurerIncidents", Public = true)]
    public static List<Incident> InsurerIncidents(ViewContext ctx) => PolicyholderIncidents(ctx, false);

    [SpacetimeDB.View(Accessor = "InsurerTriage", Public = true)]
    public static List<TriageAssessment> InsurerTriage(ViewContext ctx)
    {
        var result = new List<TriageAssessment>();
        foreach (var inc in PolicyholderIncidents(ctx, false))
            if (ctx.Db.TriageAssessment.IncidentId.Find(inc.Id) is TriageAssessment t) result.Add(t);
        return result;
    }

    [SpacetimeDB.View(Accessor = "InsurerEvents", Public = true)]
    public static List<CatastropheEvent> InsurerEvents(ViewContext ctx)
    {
        var result = new List<CatastropheEvent>();
        foreach (var id in InsurerOrgIds(ctx)) result.AddRange(ctx.Db.CatastropheEvent.InsurerOrgId.Filter(id));
        return result;
    }

    [SpacetimeDB.View(Accessor = "InsurerEventLinks", Public = true)]
    public static List<EventIncident> InsurerEventLinks(ViewContext ctx)
    {
        var result = new List<EventIncident>();
        foreach (var id in InsurerOrgIds(ctx))
            foreach (var ev in ctx.Db.CatastropheEvent.InsurerOrgId.Filter(id))
                result.AddRange(ctx.Db.EventIncident.EventId.Filter(ev.Id));
        return result;
    }

    [SpacetimeDB.View(Accessor = "InsurerAlerts", Public = true)]
    public static List<ExposureAlert> InsurerAlerts(ViewContext ctx)
    {
        var result = new List<ExposureAlert>();
        foreach (var id in InsurerOrgIds(ctx))
            foreach (var ev in ctx.Db.CatastropheEvent.InsurerOrgId.Filter(id))
                result.AddRange(ctx.Db.ExposureAlert.EventId.Filter(ev.Id));
        return result;
    }

    [SpacetimeDB.View(Accessor = "InsurerProfiles", Public = true)]
    public static List<OrgProfile> InsurerProfiles(ViewContext ctx)
    {
        var result = new List<OrgProfile>();
        var seen = new HashSet<ulong>();
        foreach (var id in InsurerOrgIds(ctx))
            foreach (var pol in ctx.Db.Policy.InsurerOrgId.Filter(id))
                if (seen.Add(pol.PolicyholderOrgId) && ctx.Db.OrgProfile.OrgId.Find(pol.PolicyholderOrgId) is OrgProfile p)
                    result.Add(p);
        return result;
    }

    // Packets for incidents you're a member of, plus those of your linked policyholders
    [SpacetimeDB.View(Accessor = "VisibleClaimPackets", Public = true)]
    public static List<ClaimPacket> VisibleClaimPackets(ViewContext ctx)
    {
        var seen = new HashSet<string>();
        var result = new List<ClaimPacket>();

        void AddFor(string incidentId)
        {
            if (seen.Add(incidentId) && ctx.Db.ClaimPacket.IncidentId.Find(incidentId) is ClaimPacket p) result.Add(p);
        }

        foreach (var m in ctx.Db.IncidentMember.Person.Filter(ctx.Sender)) AddFor(m.IncidentId);
        foreach (var inc in PolicyholderIncidents(ctx, true)) AddFor(inc.Id);
        return result;
    }
}