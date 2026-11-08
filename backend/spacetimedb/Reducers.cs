using System;
using System.Linq;
using SpacetimeDB;

public static partial class Module
{
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