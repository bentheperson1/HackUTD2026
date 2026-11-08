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

        AddInject(ctx, id, 0, "", "Ransom notes appear on 3 front-desk PCs. What first?",
            new[] { "Unplug them from the network", "Pay the ransom", "Email IT and wait", "Restart the PCs" }, 0,
            "Isolate first. Disconnecting stops the spread; rebooting or paying burns your options.");
        AddInject(ctx, id, 120, "ItLead", "Which backups do you trust first?",
            new[] { "The shared drive", "The affected PCs", "Offline backups kept disconnected", "Cloud sync folders" }, 2,
            "Connected copies may already be encrypted. Offline backups are the ones the attacker can't reach.");
        AddInject(ctx, id, 240, "Owner", "Who do you call before anything else?",
            new[] { "A local news station", "Your cyber insurer's hotline", "The attacker", "Your landlord" }, 1,
            "Insurers often require early notice and can bring in response specialists.");
        AddInject(ctx, id, 360, "", "The attacker emails: pay in 24 hours or patient data leaks. Reply?",
            new[] { "Negotiate directly", "Counteroffer", "Delete the email", "Don't reply; preserve it and loop in counsel" }, 3,
            "Keep the evidence and let counsel and the insurer decide how to engage.");
        AddInject(ctx, id, 480, "Legal", "Patient data may be stolen. What starts the clock?",
            new[] { "Document what data, whose, and which states", "Wait to see if it leaks", "Notify every patient now", "Wait for the police" }, 0,
            "A scope record tells you which breach-notification laws and deadlines apply.");
        AddInject(ctx, id, 600, "Comms", "Staff are asking what's going on. What do you send?",
            new[] { "A full technical write-up", "A company-email blast", "A short holding statement through your out-of-band channel", "Nothing" }, 2,
            "Company email may be compromised. Use a channel the attacker can't read.");
    }
}