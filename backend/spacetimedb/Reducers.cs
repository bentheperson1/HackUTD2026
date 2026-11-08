using System;
using System.Linq;
using SpacetimeDB;

public static partial class Module
{
    const bool AllowPhoneTakeover = true; //temporarily for demo purposes, since we dont have SMS and verification for the prototype

    //helpers
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

    static void MoveIdentity(ReducerContext ctx, Identity from, Identity to)
    {
        foreach (var m in ctx.Db.OrgMember.Person.Filter(from).ToList())
        {
            var u = m; u.Person = to;
            ctx.Db.OrgMember.Id.Update(u);
        }
        foreach (var m in ctx.Db.IncidentMember.Person.Filter(from).ToList())
        {
            var u = m; u.Person = to;
            ctx.Db.IncidentMember.Id.Update(u);
        }
        foreach (var g in ctx.Db.GuestGrant.Person.Filter(from).ToList())
        {
            var u = g; u.Person = to;
            ctx.Db.GuestGrant.Id.Update(u);
        }
        foreach (var p in ctx.Db.DrillPlayer.Iter().ToList())   // no index on Person here
            if (p.Person == from)
            {
                var u = p; u.Person = to;
                ctx.Db.DrillPlayer.Id.Update(u);
            }
    }

    [SpacetimeDB.Reducer]
    public static void RegisterPhone(ReducerContext ctx, string phone, string displayName)
    {
        phone = NormalizePhone(phone);
        displayName = Clean(displayName, 50, "Display name");

        if (ctx.Db.User.Phone.Find(phone) is User owner && owner.Id != ctx.Sender)
        {
            if (!AllowPhoneTakeover) throw new Exception("That phone number belongs to another account.");

            // Park the old row (keeps names on old messages) and free the number
            var parked = owner;
            parked.Phone = $"moved:{owner.Id}";
            parked.Online = false;
            ctx.Db.User.Id.Update(parked);

            if (ctx.Db.User.Id.Find(ctx.Sender) is User mine)
            {
                // This browser already had an account under another number: reuse it
                mine.Phone = phone;
                mine.DisplayName = displayName;
                mine.Online = true;
                mine.IsAdmin = mine.IsAdmin || owner.IsAdmin;
                ctx.Db.User.Id.Update(mine);
            }
            else
            {
                ctx.Db.User.Insert(new User
                {
                    Id = ctx.Sender,
                    Phone = phone,
                    DisplayName = displayName,
                    Online = true,
                    IsAdmin = owner.IsAdmin,
                    CreatedAt = owner.CreatedAt,
                });
            }

            MoveIdentity(ctx, owner.Id, ctx.Sender);
            return;
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
                CreatedAt = ctx.Timestamp,
            });
        }
    }

    [SpacetimeDB.Reducer]
    public static void SendMessage(ReducerContext ctx, string incidentId, int chatType, string text)
    {
        RequireChatAccess(ctx, incidentId, chatType);
        //RequireMember(ctx, incidentId);

        text = Clean(text, 2000, "Message");

        ctx.Db.Message.Insert(new Message
        {
            Id = 0,
            IncidentId = incidentId,
            Sender = ctx.Sender,
            Text = text,
            SentAt = ctx.Timestamp,
            ChatType = chatType,
            IsSystem = false,
        });
    }
}