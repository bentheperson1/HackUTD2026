using System;
using System.Collections.Generic;
using System.Linq;
using SpacetimeDB;

public static partial class Module
{
    const string DrillLobby = "lobby", DrillRunning = "running", DrillFinished = "finished";

    static string NewJoinCode(ReducerContext ctx)
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // no 0/O/1/I
        while (true)
        {
            var chars = new char[4];
            for (int i = 0; i < 4; i++) chars[i] = alphabet[ctx.Rng.Next(alphabet.Length)];
            var code = new string(chars);
            if (ctx.Db.DrillSession.JoinCode.Find(code) is null) return code;
        }
    }

    static DrillSession RequireDrillOwner(ReducerContext ctx, ulong sessionId)
    {
        if (ctx.Db.DrillSession.Id.Find(sessionId) is not DrillSession s) throw new Exception("No such drill.");
        if (RequireOrgMember(ctx, s.OrgId).Role != RoleName.Owner) throw new Exception("Only the owner can do that.");
        return s;
    }

    static void ClearDrillTicks(ReducerContext ctx, ulong sessionId)
    {
        foreach (var t in ctx.Db.DrillTick.SessionId.Filter(sessionId).ToList())
            ctx.Db.DrillTick.ScheduledId.Delete(t.ScheduledId);
    }

    static void ScheduleDrillTick(ReducerContext ctx, DrillSession s, ulong atSecond)
    {
        var start = s.StartedAt ?? ctx.Timestamp;
        var due = start + Secs((long)atSecond);

        var earliest = ctx.Timestamp + Secs(5);
        if (due.MicrosecondsSinceUnixEpoch < earliest.MicrosecondsSinceUnixEpoch) due = earliest;

        ctx.Db.DrillTick.Insert(new DrillTick
        {
            ScheduledId = 0,
            ScheduledAt = new ScheduleAt.Time(due),
            SessionId = s.Id,
        });
    }

    static ulong ScorePoints(ulong points, ulong ms)
    {
        if (ms <= 5000) return points;
        if (ms >= 30000) return points / 2;
        double t = (ms - 5000) / 25000.0;
        return (ulong)(points * (1.0 - 0.5 * t));
    }

    static void AdvanceDrill(ReducerContext ctx, DrillSession s)
    {
        var injects = ctx.Db.DrillInject.ScenarioId.Filter(s.ScenarioId).OrderBy(i => i.AtSecond).ToList();

        int next = 0;
        if (s.CurrentInject is ulong cur) next = injects.FindIndex(i => i.Id == cur) + 1;

        if (next >= injects.Count) { FinishDrill(ctx, s); return; }

        var inject = injects[next];
        s.CurrentInject = inject.Id;
        ctx.Db.DrillSession.Id.Update(s);

        ctx.Db.DrillQuestion.Insert(new DrillQuestion
        {
            Id = 0,
            SessionId = s.Id,
            InjectId = inject.Id,
            Text = inject.Text,
            ForRole = inject.ForRole,
            Choices = inject.Choices,
            FiredAt = ctx.Timestamp,
            CorrectChoice = null,
            Explanation = "",
        });
        PostSystemMessage(ctx, s.IncidentId, (inject.ForRole == "" ? "" : $"[{inject.ForRole}] ") + inject.Text);

        ulong nextAt = next + 1 < injects.Count ? injects[next + 1].AtSecond : inject.AtSecond + 30;
        ScheduleDrillTick(ctx, s, nextAt);
    }

    static void FinishDrill(ReducerContext ctx, DrillSession s)
    {
        s.Status = DrillFinished;
        ctx.Db.DrillSession.Id.Update(s);
        ClearDrillTicks(ctx, s.Id);

        foreach (var q in ctx.Db.DrillQuestion.SessionId.Filter(s.Id).ToList())
        {
            if (ctx.Db.DrillInject.Id.Find(q.InjectId) is not DrillInject inj) continue;
            var q2 = q;
            q2.CorrectChoice = inj.CorrectChoice;
            q2.Explanation = inj.Explanation;
            ctx.Db.DrillQuestion.Id.Update(q2);
        }

        if (ctx.Db.Incident.Id.Find(s.IncidentId) is Incident room)
        {
            room.Status = StatusClosed;
            ctx.Db.Incident.Id.Update(room);
        }

        DrillPlayer? best = null;
        foreach (var p in ctx.Db.DrillPlayer.SessionId.Filter(s.Id))
            if (best == null || p.Score > best.Value.Score) best = p;

        LogTimeline(ctx, s.IncidentId, "Drill finished");
        PostSystemMessage(ctx, s.IncidentId, best == null
            ? "Drill complete."
            : $"Drill complete. Top scorer: {best.Value.Nickname} ({best.Value.Score} pts).");
    }

    [SpacetimeDB.Reducer]
    public static void CreateDrill(ReducerContext ctx, ulong orgId, string scenarioId)
    {
        if (RequireOrgMember(ctx, orgId).Role != RoleName.Owner) throw new Exception("Only the owner can open a drill.");
        if (ctx.Db.DrillScenario.Id.Find(scenarioId) is not DrillScenario scenario) throw new Exception("No such scenario.");

        var session = ctx.Db.DrillSession.Insert(new DrillSession
        {
            Id = 0,
            OrgId = orgId,
            ScenarioId = scenarioId,
            IncidentId = "",
            Status = DrillLobby,
            JoinCode = NewJoinCode(ctx),
            StartedAt = null,
            CurrentInject = null,
        });

        string incidentId = $"DRILL-{session.Id:D4}";
        OpenWarRoom(ctx, orgId, incidentId, scenario.Name, 0, 1, isDrill: true);

        session.IncidentId = incidentId;
        ctx.Db.DrillSession.Id.Update(session);
    }

    [SpacetimeDB.Reducer]
    public static void JoinDrill(ReducerContext ctx, string joinCode, string nickname)
    {
        if (ctx.Db.DrillSession.JoinCode.Find((joinCode ?? "").Trim().ToUpperInvariant()) is not DrillSession s)
            throw new Exception("No drill with that code.");
        if (s.Status == DrillFinished) throw new Exception("That drill is over.");
        nickname = Clean(nickname, 24, "Nickname");

        foreach (var p in ctx.Db.DrillPlayer.SessionId.Filter(s.Id))
        {
            if (p.Person != ctx.Sender) continue;
            var renamed = p; // already joined: just update the nickname
            renamed.Nickname = nickname;
            ctx.Db.DrillPlayer.Id.Update(renamed);
            return;
        }

        string? role = null;
        foreach (var om in ctx.Db.OrgMember.OrgId.Filter(s.OrgId))
            if (om.Person == ctx.Sender) role = om.Role;
        if (role == null)
        {
            int count = ctx.Db.DrillPlayer.SessionId.Filter(s.Id).Count();
            role = RoleName.Staff[count % RoleName.Staff.Length];
        }

        ctx.Db.DrillPlayer.Insert(new DrillPlayer
        {
            Id = 0,
            SessionId = s.Id,
            Person = ctx.Sender,
            Nickname = nickname,
            Role = role,
            Score = 0,
        });

        bool inRoom = false;
        foreach (var m in ctx.Db.IncidentMember.IncidentId.Filter(s.IncidentId))
            if (m.Person == ctx.Sender) { inRoom = true; break; }
        if (!inRoom)
            ctx.Db.IncidentMember.Insert(new IncidentMember
            {
                Id = 0,
                IncidentId = s.IncidentId,
                Person = ctx.Sender,
                Role = role,
                AddedBy = ctx.Sender,
                AddedAt = ctx.Timestamp,
            });
    }

    [SpacetimeDB.Reducer]
    public static void StartDrill(ReducerContext ctx, ulong sessionId)
    {
        var s = RequireDrillOwner(ctx, sessionId);
        if (s.Status != DrillLobby) throw new Exception("This drill already started.");

        var injects = ctx.Db.DrillInject.ScenarioId.Filter(s.ScenarioId).OrderBy(i => i.AtSecond).ToList();
        if (injects.Count == 0) throw new Exception("This scenario has no injects.");

        s.Status = DrillRunning;
        s.StartedAt = ctx.Timestamp;
        s.CurrentInject = null;
        ctx.Db.DrillSession.Id.Update(s);

        PostSystemMessage(ctx, s.IncidentId, "Drill started. First question incoming.");
        ScheduleDrillTick(ctx, s, injects[0].AtSecond);
    }

    [SpacetimeDB.Reducer]
    public static void FireNextInject(ReducerContext ctx, DrillTick tick)
    {
        if (ctx.Sender != ctx.DatabaseIdentity) throw new Exception("Scheduler only.");
        if (ctx.Db.DrillSession.Id.Find(tick.SessionId) is not DrillSession s) return;
        if (s.Status != DrillRunning) return;
        AdvanceDrill(ctx, s);
    }

    [SpacetimeDB.Reducer]
    public static void NextInjectNow(ReducerContext ctx, ulong sessionId)
    {
        var s = RequireDrillOwner(ctx, sessionId);
        if (s.Status != DrillRunning) throw new Exception("This drill isn't running.");
        ClearDrillTicks(ctx, s.Id);
        AdvanceDrill(ctx, s);
    }

    [SpacetimeDB.Reducer]
    public static void AnswerInject(ReducerContext ctx, ulong sessionId, ulong injectId, ulong choice)
    {
        if (ctx.Db.DrillSession.Id.Find(sessionId) is not DrillSession s) throw new Exception("No such drill.");
        if (s.Status != DrillRunning) throw new Exception("This drill isn't running.");
        if (s.CurrentInject != injectId) throw new Exception("That question isn't open.");

        DrillPlayer me = default;
        bool joined = false;
        foreach (var p in ctx.Db.DrillPlayer.SessionId.Filter(sessionId))
            if (p.Person == ctx.Sender) { me = p; joined = true; break; }
        if (!joined) throw new Exception("Join the drill first.");

        if (ctx.Db.DrillInject.Id.Find(injectId) is not DrillInject inj) throw new Exception("No such question.");
        if (inj.ForRole != "" && inj.ForRole != me.Role) throw new Exception($"That question is for {inj.ForRole}.");
        if (choice >= (ulong)inj.Choices.Count) throw new Exception("Not a valid choice.");

        foreach (var a in ctx.Db.DrillAnswer.SessionId.Filter(sessionId))
            if (a.InjectId == injectId && a.Person == ctx.Sender) throw new Exception("You already answered.");

        bool found = false;
        long firedAt = 0;
        foreach (var q in ctx.Db.DrillQuestion.SessionId.Filter(sessionId))
            if (q.InjectId == injectId) { firedAt = q.FiredAt.MicrosecondsSinceUnixEpoch; found = true; break; }
        if (!found) throw new Exception("That question isn't open.");

        ulong ms = (ulong)Math.Max(0L, (ctx.Timestamp.MicrosecondsSinceUnixEpoch - firedAt) / 1000);
        bool correct = choice == inj.CorrectChoice;
        ulong earned = correct ? ScorePoints(inj.Points, ms) : 0;

        ctx.Db.DrillAnswer.Insert(new DrillAnswer
        {
            Id = 0,
            SessionId = sessionId,
            InjectId = injectId,
            Person = ctx.Sender,
            Choice = choice,
            Correct = correct,
            AnsweredMs = ms,
        });

        me.Score += earned;
        ctx.Db.DrillPlayer.Id.Update(me);
    }

    [SpacetimeDB.Reducer]
    public static void EndDrill(ReducerContext ctx, ulong sessionId)
    {
        var s = RequireDrillOwner(ctx, sessionId);
        if (s.Status == DrillFinished) return;
        FinishDrill(ctx, s);
    }
}