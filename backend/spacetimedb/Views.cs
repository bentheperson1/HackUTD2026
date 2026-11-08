using System;
using System.Linq;
using SpacetimeDB;

public static partial class Module
{
    static List<Message> VisibleMessages(ViewContext ctx, int chatType)
    {
        var seen = new HashSet<ulong>();
        var result = new List<Message>();

        void AddFrom(string incidentId)
        {
            foreach (var om in ctx.Db.OrgMember.Person.Filter(ctx.Sender))
            {
                bool external = IsExternal(om.Role);
                foreach (var inc in ctx.Db.Incident.OrgId.Filter(om.OrgId))
                    if ((chatType == 3 && !external) || (om.IsAdmin && chatType <= 2)) AddFrom(inc.Id);
            }
        }

        foreach (var om in ctx.Db.OrgMember.Person.Filter(ctx.Sender))
            foreach (var inc in ctx.Db.Incident.OrgId.Filter(om.OrgId))
                if (chatType == 3 || (om.IsAdmin && chatType <= 2)) AddFrom(inc.Id);

        if (chatType == 2)
        {
            foreach (var m in ctx.Db.IncidentMember.Person.Filter(ctx.Sender)) AddFrom(m.IncidentId);
            foreach (var g in ctx.Db.GuestGrant.Person.Filter(ctx.Sender)) AddFrom(g.IncidentId);
        }

        return result;
    }

    [SpacetimeDB.View(Accessor = "AdminMessages", Public = true)]
    public static List<Message> AdminMessages(ViewContext ctx) => VisibleMessages(ctx, 1);

    [SpacetimeDB.View(Accessor = "IncidentMessages", Public = true)]
    public static List<Message> IncidentMessages(ViewContext ctx) => VisibleMessages(ctx, 2);

    [SpacetimeDB.View(Accessor = "GeneralMessages", Public = true)]
    public static List<Message> GeneralMessages(ViewContext ctx) => VisibleMessages(ctx, 3);

    [SpacetimeDB.View(Accessor = "InsurerIncidents_Views", Public = true)]
    public static List<Incident> InsurerIncidents_Views(ViewContext ctx)
    {
        var result = new List<Incident>();
        var seen = new HashSet<string>();

        foreach (var om in ctx.Db.OrgMember.Person.Filter(ctx.Sender))
        {
            if (om.Role != RoleName.Insurer) continue;
            foreach (var inc in ctx.Db.Incident.OrgId.Filter(om.OrgId))
                if (!inc.IsDrill && inc.Status == StatusOpen && seen.Add(inc.Id)) result.Add(inc);
        }
        return result;
    }
}