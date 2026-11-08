using System;
using System.Collections.Generic;
using System.Linq;
using SpacetimeDB;

public static partial class Module
{
    const int StatusOpen = 0, StatusClosed = 1;                                   // Incident.Status
    const int ScopeUnknown = 0, ScopeExfiltrated = 1, ScopeLocked = 2, ScopeRestored = 3; // ScopeItem.Status (tell your frontend dev)

    static class RoleName
    {
        public const string Owner = "Owner", ItLead = "ItLead", Legal = "Legal",
                            Comms = "Comms", Insurer = "Insurer", Counsel = "Counsel";
        public static readonly string[] Staff = { Owner, ItLead, Legal, Comms };
        public static readonly string[] All = { Owner, ItLead, Legal, Comms, Insurer, Counsel };
    }

    static readonly string[] OwnerOnly = { RoleName.Owner };
    static readonly string[] CanChat = RoleName.All;
    static readonly string[] CanChangePhase = { RoleName.Owner, RoleName.ItLead };
    static readonly string[] CanEditScope = { RoleName.Owner, RoleName.ItLead, RoleName.Legal };
    static readonly string[] CanMarkNotices = { RoleName.Owner, RoleName.Legal, RoleName.Counsel };
    static readonly string[] CanEditDocs = { RoleName.Owner, RoleName.ItLead, RoleName.Legal, RoleName.Comms, RoleName.Counsel };
    static readonly string[] CanExport = RoleName.Staff;

    static TimeDuration Secs(long s) => new TimeDuration(s * 1_000_000L);

    static string Clean(string s, int max, string what, bool allowEmpty = false)
    {
        s = (s ?? "").Trim();
        if (!allowEmpty && s.Length == 0) throw new Exception($"{what} can't be empty.");
        if (s.Length > max) throw new Exception($"{what} is too long (max {max}).");
        return s;
    }

    static string ScopeStatusName(int s) => s switch
    {
        ScopeExfiltrated => "Exfiltrated",
        ScopeLocked => "Locked",
        ScopeRestored => "Restored",
        _ => "Unknown",
    };

    static string NewIncidentId(ReducerContext ctx) => $"INC-{ctx.Db.Incident.Count + 1:D4}";

    static void PostSystemMessage(ReducerContext ctx, string incidentId, string text)
    {
        ctx.Db.Message.Insert(new Message
        {
            Id = 0,
            IncidentId = incidentId,
            Sender = ctx.Sender,
            Text = text,
            SentAt = ctx.Timestamp,
            ChatType = 2,
            IsSystem = true,
        });
    }

    static string? FindIncidentRole(ReducerContext ctx, string incidentId)
    {
        foreach (var m in ctx.Db.IncidentMember.IncidentId.Filter(incidentId))
            if (m.Person == ctx.Sender) return m.Role;

        long now = ctx.Timestamp.MicrosecondsSinceUnixEpoch;
        foreach (var g in ctx.Db.GuestGrant.IncidentId.Filter(incidentId))
            if (g.Person == ctx.Sender && g.ExpiresAt.MicrosecondsSinceUnixEpoch > now) return g.Role;

        return null;
    }

    static string RequireRole(ReducerContext ctx, string incidentId, string[] allowed)
    {
        var role = FindIncidentRole(ctx, incidentId);
        if (role == null) throw new Exception("You don't have access to this incident.");
        if (!allowed.Contains(role)) throw new Exception($"Your role ({role}) can't do that.");
        return role;
    }

    static Incident RequireOpenIncident(ReducerContext ctx, string incidentId)
    {
        if (ctx.Db.Incident.Id.Find(incidentId) is not Incident inc) throw new Exception("No such incident.");
        if (inc.Status == StatusClosed) throw new Exception("This incident is closed.");
        return inc;
    }

    static OrgMember RequireOrgMember(ReducerContext ctx, ulong orgId)
    {
        foreach (var m in ctx.Db.OrgMember.OrgId.Filter(orgId))
            if (m.Person == ctx.Sender) return m;
        throw new Exception("You're not part of that company.");
    }

    static bool IsOwnerAnywhere(ReducerContext ctx)
    {
        foreach (var m in ctx.Db.OrgMember.Person.Filter(ctx.Sender))
            if (m.Role == RoleName.Owner) return true;
        return false;
    }

    static void RequireChatAccess(ReducerContext ctx, string incidentId, int chatType)
    {
        if (ctx.Db.Incident.Id.Find(incidentId) is not Incident inc) throw new Exception("No such incident.");

        bool admin = false, orgMember = false;
        foreach (var om in ctx.Db.OrgMember.OrgId.Filter(inc.OrgId))
            if (om.Person == ctx.Sender) { orgMember = !IsExternal(om.Role); admin = om.IsAdmin; break; }

        bool inRoom = FindIncidentRole(ctx, incidentId) != null;   // incident member or guest

        bool allowed = chatType switch
        {
            1 => admin,
            2 => admin || inRoom,
            3 => orgMember,
            _ => false,
        };
        if (!allowed) throw new Exception("You can't post in that chat.");
    }

    static bool IsExternal(string role) => role == RoleName.Insurer || role == RoleName.Counsel;

    static Incident OpenWarRoom(ReducerContext ctx, ulong orgId, string id, string name, int incidentType, int severity, bool isDrill)
    {
        var incident = ctx.Db.Incident.Insert(new Incident
        {
            Id = id,
            OrgId = orgId,
            Name = name,
            IncidentType = incidentType,
            Severity = severity,
            Phase = 0,
            Status = StatusOpen,
            Summary = "",
            CurrentStatus = "",
            OpenedBy = ctx.Sender,
            OpenedAt = ctx.Timestamp,
            IsDrill = isDrill,
        });

        foreach (var om in ctx.Db.OrgMember.OrgId.Filter(orgId))
        {
            if (isDrill && IsExternal(om.Role)) continue;
            ctx.Db.IncidentMember.Insert(new IncidentMember
            {
                Id = 0,
                IncidentId = id,
                Person = om.Person,
                Role = om.Role,
                AddedBy = ctx.Sender,
                AddedAt = ctx.Timestamp,
            });
        }

        AddTask(ctx, id, "Call the cyber insurer's hotline", RoleName.Owner);
        AddTask(ctx, id, "Disconnect affected machines from the network", RoleName.ItLead);
        AddTask(ctx, id, "Start the scope record", RoleName.Legal);
        AddTask(ctx, id, "Draft a holding statement for staff", RoleName.Comms);

        LogTimeline(ctx, id, isDrill ? $"Drill started: {name}" : $"Incident activated: {name}");
        return incident;
    }

    static void AddTask(ReducerContext ctx, string incidentId, string title, string forRole)
        => ctx.Db.Task.Insert(new TaskItem
        {
            Id = 0,
            IncidentId = incidentId,
            Title = title,
            ForRole = forRole,
            Assignee = null,
            Status = "todo",
            CreatedBy = ctx.Sender,
            UpdatedAt = ctx.Timestamp,
        });
}