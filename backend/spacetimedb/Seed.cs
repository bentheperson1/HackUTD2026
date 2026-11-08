using System;
using System.Collections.Generic;
using System.Linq;
using SpacetimeDB;

public static partial class Module
{
    [SpacetimeDB.Reducer(ReducerKind.Init)]
    public static void Init(ReducerContext ctx) => SeedDefaults(ctx);

    [SpacetimeDB.Reducer]
    public static void Reseed(ReducerContext ctx)
    {
        if (ctx.Db.User.Id.Find(ctx.Sender) is null) throw new Exception("Register your phone first.");
        SeedDefaults(ctx);
    }

    static void SeedDefaults(ReducerContext ctx)
    {
        if (ctx.Db.GuestGrantSweep.Count == 0)
            ctx.Db.GuestGrantSweep.Insert(new GuestGrantSweep
            {
                ScheduledId = 0,
                ScheduledAt = new ScheduleAt.Interval(TimeSpan.FromMinutes(1)),
            });

        UpsertRule(ctx, "TX", new[] { "health", "payment", "ssn" }, null,
                   "TODO: who else must be told (confirm with counsel)",
                   "TODO: link to the statute or AG page");

        UpsertTemplate(ctx, "holding-statement", "Holding statement",
                       "Short message for staff while details are confirmed",
                       "We are aware of an issue affecting our systems and are working to resolve it. {{scope.summary}}");

        SeedRansomwareScenario(ctx);
    }

    static void UpsertRule(ReducerContext ctx, string state, string[] covered, ulong? days, string notice, string url)
    {
        var row = new NotificationRule
        {
            State = state,
            CoveredData = covered.ToList(),
            DeadlineDays = days,
            RegulatorNotice = notice,
            SourceUrl = url,
            LastChecked = ctx.Timestamp,
        };
        if (ctx.Db.NotificationRule.State.Find(state) is NotificationRule existing)
        {
            row.LastChecked = existing.LastChecked;
            ctx.Db.NotificationRule.State.Update(row);
        }
        else ctx.Db.NotificationRule.Insert(row);
    }

    static void UpsertTemplate(ReducerContext ctx, string id, string name, string description, string body)
    {
        var row = new DocTemplate { Id = id, Name = name, Description = description, Body = body, CreatedBy = ctx.Sender };
        if (ctx.Db.DocTemplate.Id.Find(id) is not null) ctx.Db.DocTemplate.Id.Update(row);
        else ctx.Db.DocTemplate.Insert(row);
    }

    static void AddInject(ReducerContext ctx, string scenarioId, ulong atSecond, string forRole, string text,
                          string[] choices, ulong correct, string explanation)
        => ctx.Db.DrillInject.Insert(new DrillInject
        {
            Id = 0,
            ScenarioId = scenarioId,
            AtSecond = atSecond,
            Text = text,
            ForRole = forRole,
            Choices = choices.ToList(),
            CorrectChoice = correct,
            Points = 100,
            Explanation = explanation,
        });

    static void SeedRansomwareScenario(ReducerContext ctx)
    {
        const string id = "ransomware-basic";
        if (ctx.Db.DrillScenario.Id.Find(id) is not null) return;    // seed once

        ctx.Db.DrillScenario.Insert(new DrillScenario
        {
            Id = id,
            Name = "Ransomware at the front desk",
            Kind = "ransomware",
            Minutes = 15,
        });

        AddInject(ctx, id, 0, "", "Ransom notes appear on 3 front-desk PCs. What do you do first?",
            new[] { "Unplug them from the network", "Pay the ransom", "Email IT and wait", "Restart the PCs" }, 0,
            "Disconnecting the PCs stops the ransomware from spreading. Restarting them can destroy evidence, and paying does not guarantee you get your files back.");
        AddInject(ctx, id, 120, "ItLead", "Which backups should you trust first?",
            new[] { "The shared drive", "The affected PCs", "Offline backups kept disconnected", "Cloud sync folders" }, 2,
            "Backups that stay connected to the network may already be encrypted. Offline backups are out of the attacker's reach.");
        AddInject(ctx, id, 240, "Owner", "Who do you call before anyone else?",
            new[] { "A local news station", "Your cyber insurer's hotline", "The attacker", "Your landlord" }, 1,
            "Most cyber insurers require early notice, and they can connect you with response specialists.");
        AddInject(ctx, id, 360, "", "The attacker emails saying patient data will be leaked unless you pay within 24 hours. How do you respond?",
            new[] { "Negotiate directly", "Counteroffer", "Delete the email", "Don't reply. Save the email and tell your lawyer" }, 3,
            "Keep the email as evidence. Your lawyer and insurer will decide whether and how to respond.");
        AddInject(ctx, id, 480, "Legal", "Patient data may have been stolen. What should you do first?",
            new[] { "Record what data was taken, whose it was, and which states they live in", "Wait to see if it leaks", "Notify every patient now", "Wait for the police" }, 0,
            "Knowing what data was taken and where those people live tells you which notification laws and deadlines apply.");
        AddInject(ctx, id, 600, "Comms", "Staff are asking what's going on. What do you send?",
            new[] { "A full technical write-up", "A company-email blast", "A short statement sent through a channel outside company email", "Nothing" }, 2,
            "Company email may be compromised, so use a channel the attacker can't read.");
    }
}