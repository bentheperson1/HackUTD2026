using System;
using System.Linq;
using SpacetimeDB;

public static partial class Module
{
    [SpacetimeDB.Reducer]
    public static void CreateOrganization(ReducerContext ctx, string name, string industry)
    {
        if (ctx.Db.User.Id.Find(ctx.Sender) is null) throw new Exception("Register your phone first.");

        var org = ctx.Db.Organization.Insert(new Organization
        {
            Id = 0,
            Name = Clean(name, 100, "Name"),
            Industry = Clean(industry, 60, "Industry", allowEmpty: true),
            CreatedAt = ctx.Timestamp,
        });

        ctx.Db.OrgMember.Insert(new OrgMember
        {
            Id = 0,
            OrgId = org.Id,
            Person = ctx.Sender,
            Role = RoleName.Owner,
            IsAdmin = true,
        });
    }

    [SpacetimeDB.Reducer]
    public static void AddOrgMember(ReducerContext ctx, ulong orgId, string phone, string role)
    {
        if (!RequireOrgMember(ctx, orgId).IsAdmin) throw new Exception("Only company admins can do that.");
        if (!RoleName.Staff.Contains(role))
            throw new Exception("Role must be Owner, ItLead, Legal or Comms. Insurers and counsel join as guests.");

        if (ctx.Db.User.Phone.Find(NormalizePhone(phone)) is not User target)
            throw new Exception("Nobody has registered with that phone number yet.");

        foreach (var m in ctx.Db.OrgMember.OrgId.Filter(orgId))
            if (m.Person == target.Id) throw new Exception($"{target.DisplayName} is already on the roster.");

        ctx.Db.OrgMember.Insert(new OrgMember
        {
            Id = 0,
            OrgId = orgId,
            Person = target.Id,
            Role = role,
            IsAdmin = role == RoleName.Owner,
        });
    }

    [SpacetimeDB.Reducer]
    public static void SetOrgRole(ReducerContext ctx, ulong orgId, Identity person, string role)
    {
        if (!RequireOrgMember(ctx, orgId).IsAdmin) throw new Exception("Only company admins can do that.");
        if (!RoleName.Staff.Contains(role)) throw new Exception("Unknown role.");
        if (person == ctx.Sender) throw new Exception("You can't change your own role.");

        foreach (var m in ctx.Db.OrgMember.OrgId.Filter(orgId))
        {
            if (m.Person != person) continue;
            var updated = m;
            updated.Role = role;
            updated.IsAdmin = role == RoleName.Owner;
            ctx.Db.OrgMember.Id.Update(updated);
            return;
        }
        throw new Exception("That person isn't on the roster.");
    }

    [SpacetimeDB.Reducer]
    public static void GrantGuest(ReducerContext ctx, string incidentId, string phone, string role, int days)
    {
        RequireRole(ctx, incidentId, OwnerOnly);
        RequireOpenIncident(ctx, incidentId);
        if (role != RoleName.Insurer && role != RoleName.Counsel) throw new Exception("Guests are Insurer or Counsel.");
        if (days < 1 || days > 30) throw new Exception("Access must last 1-30 days.");

        if (ctx.Db.User.Phone.Find(NormalizePhone(phone)) is not User target)
            throw new Exception("Nobody has registered with that phone number yet.");

        foreach (var g in ctx.Db.GuestGrant.IncidentId.Filter(incidentId).ToList())
            if (g.Person == target.Id) ctx.Db.GuestGrant.Id.Delete(g.Id);

        ctx.Db.GuestGrant.Insert(new GuestGrant
        {
            Id = 0,
            IncidentId = incidentId,
            Person = target.Id,
            Role = role,
            ExpiresAt = ctx.Timestamp + Secs((long)days * 86_400L),
            GrantedBy = ctx.Sender,
        });
        LogTimeline(ctx, incidentId, $"{target.DisplayName} granted {role} access for {days} day(s)");
    }

    [SpacetimeDB.Reducer]
    public static void RevokeGuest(ReducerContext ctx, ulong grantId)
    {
        if (ctx.Db.GuestGrant.Id.Find(grantId) is not GuestGrant g) throw new Exception("No such grant.");
        RequireRole(ctx, g.IncidentId, OwnerOnly);
        ctx.Db.GuestGrant.Id.Delete(grantId);
        LogTimeline(ctx, g.IncidentId, $"{g.Role} access revoked early");
    }

    [SpacetimeDB.Reducer]
    public static void ExpireGuestGrants(ReducerContext ctx, GuestGrantSweep sweep)
    {
        if (ctx.Sender != ctx.DatabaseIdentity) throw new Exception("Scheduler only.");

        long now = ctx.Timestamp.MicrosecondsSinceUnixEpoch;
        foreach (var g in ctx.Db.GuestGrant.Iter().ToList())
        {
            if (g.ExpiresAt.MicrosecondsSinceUnixEpoch > now) continue;
            ctx.Db.GuestGrant.Id.Delete(g.Id);
            LogTimeline(ctx, g.IncidentId, $"{g.Role} guest access expired");
        }
    }
}