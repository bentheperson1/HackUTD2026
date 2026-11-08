using System;
using System.Linq;
using SpacetimeDB;

public static partial class Module
{
    //helpers

    static readonly string[] Roles = { "Owner", "IT", "Legal", "Comms", "Member" };

    static string NormalizePhone(string raw)
    {
        var digits = new string((raw ?? "").Where(char.IsDigit).ToArray());
        if (digits.Length == 10) digits = "1" + digits;
        if (digits.Length < 10 || digits.Length > 15)
        {
            throw new Exception("Invalid phone number");
        }
        return "+" + digits;
    }

    static IncidentMember RequireMember(ReducerContext ctx, string incidentId)
    {
        foreach (var m in ctx.Db.IncidentMember.IncidentId.Filter(incidentId))
        {
            if (m.Person == ctx.Sender) return m;
        }

        throw new Exception("You are not a member of this incident.");
    }

    static void RequireOwner(ReducerContext ctx, string incidentId)
    {
        if (RequireMember(ctx, incidentId).Role != "Owner")
        {
            throw new Exception("Only the incident owner can do that.");
        }
    }

    static void LogTimeline(ReducerContext ctx, string incidentId, string action)
    {
        ctx.Db.TimelineEntry.Insert(new TimelineEntry
        {
            Id = 0,
            IncidentId = incidentId,
            Author = ctx.Sender,
            Action = action,
            CreatedAt = ctx.Timestamp
        });
    }

    //connection stuff

    [SpacetimeDB.Reducer(ReducerKind.ClientConnected)]
    public static void ClientConnected(ReducerContext ctx)
    {
        if (ctx.Db.User.Id.Find(ctx.Sender) is User u)
        {
            u.Online = true;
            ctx.Db.User.Id.Update(u);
        }
    }

    [SpacetimeDB.Reducer(ReducerKind.ClientDisconnected)]
    public static void ClientDisconnected(ReducerContext ctx)
    {
        if (ctx.Db.User.Id.Find(ctx.Sender) is User u)
        {
            u.Online = false;
            ctx.Db.User.Id.Update(u);
        }
    }

    //main methods

    [SpacetimeDB.Reducer]
    public static void RegisterPhone(ReducerContext ctx, string phone, string displayName)
    {
        phone = NormalizePhone(phone);
        displayName = (displayName ?? "").Trim();

        if (displayName.Length == 0 || displayName.Length > 50)
        {
            throw new Exception("Display name bust be 1-50 characters.");
        }

        if (ctx.Db.User.Phone.Find(phone) is User owner && owner.Id != ctx.Sender)
        {
            throw new Exception("That phone number belongs to another account.");
        }

        if (ctx.Db.User.Id.Find(ctx.Sender) is User existing)
        {
            existing.Phone = phone;
            existing.DisplayName = displayName;
            ctx.Db.User.Id.Update(existing);
        }
        else
        {
            ctx.Db.User.Insert(new User
            {
                Id = ctx.Sender,
                Phone = phone,
                DisplayName = displayName,
                Online = true,
                CreatedAt = ctx.Timestamp
            });
        }
    }

    [SpacetimeDB.Reducer]
    public static void CreateIncident(ReducerContext ctx, string name, int incidentType, int severity)
    {
        if (ctx.Db.User.Id.Find(ctx.Sender) is null)
        {
            throw new Exception("Register your phone first.");
        }

        name = (name ?? "").Trim();
        if (name.Length == 0 || name.Length > 100)
        {
            throw new Exception("Name must be 1-100 characters.");
        }
        if (severity < 1 || severity > 10)
        {
            throw new Exception("Severity is out of range.");
        }

        var incident = ctx.Db.Incident.Insert(new Incident
        {
            Id = NewIncidentId(ctx),
            Name = name,
            IncidentType = incidentType,
            Severity = severity,
            Phase = 0,
            Status = 0,
            Summary = "",
            CurrentStatus = "",
            OpenedBy = ctx.Sender,
            OpenedAt = ctx.Timestamp
        });

        ctx.Db.IncidentMember.Insert(new IncidentMember
        {
            Id = 0,
            IncidentId = incident.Id,
            Person = ctx.Sender,
            Role = "Owner",
            AddedBy = ctx.Sender,
            AddedAt = ctx.Timestamp
        });

        LogTimeline(ctx, incident.Id, $"Incident opened: {name}");
    }

    [SpacetimeDB.Reducer]
    public static void AddMember(ReducerContext ctx, string incidentId, string phone, string role)
    {
        RequireOwner(ctx, incidentId);

        if (!Roles.Contains(role))
        {
            throw new Exception("Unknown role.");
        }

        if (ctx.Db.User.Phone.Find(NormalizePhone(phone)) is not User target)
        {
            throw new Exception("Nobody has registered with that phone number yet.");
        }

        foreach (var m in ctx.Db.IncidentMember.IncidentId.Filter(incidentId))
        {
            if (m.Person == target.Id)
            {
                throw new Exception("${target.DisplayName} is already in this incident.");
            }
        }

        ctx.Db.IncidentMember.Insert(new IncidentMember
        {
            Id = 0,
            IncidentId = incidentId,
            Person = target.Id,
            Role = role,
            AddedBy = ctx.Sender,
            AddedAt = ctx.Timestamp
        });

        LogTimeline(ctx, incidentId, $"{target.DisplayName} added as {role}.");
    }

    [SpacetimeDB.Reducer]
    public static void SendMessage(ReducerContext ctx, string incidentId, string text, int chatType)
    {
        RequireMember(ctx, incidentId);

        text = (text ?? "").Trim();
        if (text.Length == 0 || text.Length > 2000)
        {
            throw new Exception("Message myust be 1-2000 characters.");
        }

        ctx.Db.Message.Insert(new Message
        {
            Id = 0,
            IncidentId = incidentId,
            Sender = ctx.Sender,
            Text = text,
            SentAt = ctx.Timestamp,
            ChatType = chatType,
            IsSystem = false
        });
    }
}