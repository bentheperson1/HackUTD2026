using System;
using System.Linq;
using SpacetimeDB;

public static partial class Module
{
    [SpacetimeDB.View(Accessor = "AdminMessages", Public = true)]
    public static List<Message> AdminMessages(ViewContext ctx)
    {
        var result = new List<Message>();
        if (ctx.Db.User.Id.Find(ctx.Sender) is User me && me.IsAdmin)
        {
            result.AddRange(ctx.Db.Message.ChatType.Filter(1));
        }
        return result;
    }

    [SpacetimeDB.View(Accessor = "IncidentMessages", Public = true)]
    public static List<Message> IncidentMessages(ViewContext ctx)
    {
        var result = new List<Message>();
        if (ctx.Db.User.Id.Find(ctx.Sender) is not User me) return result;

        if (me.IsAdmin)
        {
            result.AddRange(ctx.Db.Message.ChatType.Filter(2));
        }
        else
        {
            foreach (var membership in ctx.Db.IncidentMember.Person.Filter(ctx.Sender))
            {
                foreach (var msg in ctx.Db.Message.IncidentId.Filter(membership.IncidentId))
                {
                    if (msg.ChatType == 2) result.Add(msg);
                }
            }
        }
        return result;
    }

    [SpacetimeDB.View(Accessor = "GeneralMessages", Public = true)]
    public static List<Message> GeneralMessages(ViewContext ctx)
    {
        var result = new List<Message>();
        if (ctx.Db.User.Id.Find(ctx.Sender) is not null)
        {
            result.AddRange(ctx.Db.Message.ChatType.Filter(3));
        }
        return result;
    }
}