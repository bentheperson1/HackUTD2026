using System;
using System.Collections.Generic;
using System.Linq;
using SpacetimeDB;

public static partial class Module
{
    static readonly string[] PhaseNames = { "Detection", "Containment", "Eradication", "Recovery", "Post-incident" };

    [SpacetimeDB.Reducer]
    public static void ActivateIncident(ReducerContext ctx, ulong orgId, string name, int incidentType, int severity)
    {
        var me = RequireOrgMember(ctx, orgId);
        if (me.Role != RoleName.Owner && me.Role != RoleName.ItLead)
            throw new Exception("Only the owner or IT lead can activate an incident.");

        name = Clean(name, 100, "Name");
        if (severity < 1 || severity > 4) throw new Exception("Severity out of range.");

        string id = NewIncidentId(ctx);
        OpenWarRoom(ctx, orgId, id, name, incidentType, severity, isDrill: false);

        ctx.Db.Activation.Insert(new Activation
        {
            Id = 0,
            IncidentId = id,
            ActivatedBy = ctx.Sender,
            ActivatedAt = ctx.Timestamp,
            Notified = false,
        });
        PostSystemMessage(ctx, id, "Incident activated. All hands to the war room.");
    }

    [SpacetimeDB.Reducer]
    public static void SyncRoster(ReducerContext ctx, string incidentId)
    {
        if (ctx.Db.Incident.Id.Find(incidentId) is not Incident inc) throw new Exception("No such incident.");
        RequireOrgMember(ctx, inc.OrgId);

        int added = 0;
        foreach (var om in ctx.Db.OrgMember.OrgId.Filter(inc.OrgId).ToList())
        {
            if (HasMemberRow(ctx, incidentId, om.Person)) continue;
            ctx.Db.IncidentMember.Insert(new IncidentMember
            {
                Id = 0,
                IncidentId = incidentId,
                Person = om.Person,
                Role = om.Role,
                AddedBy = ctx.Sender,
                AddedAt = ctx.Timestamp,
            });
            added++;
        }
        if (added > 0) LogTimeline(ctx, incidentId, $"Roster synced: {added} member(s) added");
    }

    [SpacetimeDB.Reducer]
    public static void UpdateIncident(ReducerContext ctx, string incidentId, string summary, string currentStatus)
    {
        RequireRole(ctx, incidentId, CanEditDocs);
        var inc = RequireOpenIncident(ctx, incidentId);

        inc.Summary = Clean(summary, 5000, "Summary", allowEmpty: true);
        inc.CurrentStatus = Clean(currentStatus, 5000, "Current status", allowEmpty: true);
        ctx.Db.Incident.Id.Update(inc);
    }

    [SpacetimeDB.Reducer]
    public static void SetPhase(ReducerContext ctx, string incidentId, int phase)
    {
        RequireRole(ctx, incidentId, CanChangePhase);
        var inc = RequireOpenIncident(ctx, incidentId);
        if (phase < 0 || phase >= PhaseNames.Length) throw new Exception("Unknown phase.");
        if (phase == inc.Phase) return;

        inc.Phase = phase;
        ctx.Db.Incident.Id.Update(inc);
        LogTimeline(ctx, incidentId, $"Phase changed to {PhaseNames[phase]}");
        PostSystemMessage(ctx, incidentId, $"Phase is now: {PhaseNames[phase]}");
    }

    [SpacetimeDB.Reducer]
    public static void CloseIncident(ReducerContext ctx, string incidentId)
    {
        RequireRole(ctx, incidentId, OwnerOnly);
        var inc = RequireOpenIncident(ctx, incidentId);
        inc.Status = StatusClosed;
        ctx.Db.Incident.Id.Update(inc);
        LogTimeline(ctx, incidentId, "Incident closed");
        PostSystemMessage(ctx, incidentId, "This incident is now closed.");
    }

    [SpacetimeDB.Reducer]
    public static void LogAction(ReducerContext ctx, string incidentId, string action)
    {
        RequireRole(ctx, incidentId, CanChat);
        LogTimeline(ctx, incidentId, Clean(action, 500, "Action"));
    }

    //id == 0 means create new row
    [SpacetimeDB.Reducer]
    public static void UpsertScopeItem(ReducerContext ctx, string incidentId, ulong id, string dataType,
                                       ulong recordCount, int status, List<string> states)
    {
        RequireRole(ctx, incidentId, CanEditScope);
        RequireOpenIncident(ctx, incidentId);
        if (status < ScopeUnknown || status > ScopeRestored) throw new Exception("Unknown scope status.");

        dataType = Clean(dataType, 40, "Data type").ToLowerInvariant();
        var cleanStates = (states ?? new List<string>())
            .Select(x => (x ?? "").Trim().ToUpperInvariant())
            .Where(x => x.Length > 0).Distinct().ToList();

        if (id == 0)
        {
            ctx.Db.ScopeItem.Insert(new ScopeItem
            {
                Id = 0,
                IncidentId = incidentId,
                DataType = dataType,
                RecordCount = recordCount,
                Status = status,
                States = cleanStates,
                UpdatedBy = ctx.Sender,
                UpdatedAt = ctx.Timestamp,
            });
            LogTimeline(ctx, incidentId, $"Scope added: {dataType} ({ScopeStatusName(status)})");
            PostSystemMessage(ctx, incidentId, $"Scope updated: {dataType} is {ScopeStatusName(status)}.");
        }
        else
        {
            if (ctx.Db.ScopeItem.Id.Find(id) is not ScopeItem item || item.IncidentId != incidentId)
                throw new Exception("No such scope item in this incident.");

            bool statusChanged = item.Status != status;
            item.DataType = dataType;
            item.RecordCount = recordCount;
            item.Status = status;
            item.States = cleanStates;
            item.UpdatedBy = ctx.Sender;
            item.UpdatedAt = ctx.Timestamp;
            ctx.Db.ScopeItem.Id.Update(item);

            if (statusChanged)
            {
                LogTimeline(ctx, incidentId, $"Scope: {dataType} changed to {ScopeStatusName(status)}");
                PostSystemMessage(ctx, incidentId, $"Scope updated: {dataType} is now {ScopeStatusName(status)}.");
            }
        }

        RecomputeObligations(ctx, incidentId);
    }

    [SpacetimeDB.Reducer]
    public static void SaveTemplate(ReducerContext ctx, string id, string name, string description, string body)
    {
        if (!IsOwnerAnywhere(ctx)) throw new Exception("Only an owner can edit templates.");

        id = Clean(id, 60, "Template id").ToLowerInvariant();
        var row = new DocTemplate
        {
            Id = id,
            Name = Clean(name, 100, "Name"),
            Description = Clean(description, 300, "Description", allowEmpty: true),
            Body = Clean(body, 50000, "Body", allowEmpty: true),
            CreatedBy = ctx.Sender,
        };

        if (ctx.Db.DocTemplate.Id.Find(id) is DocTemplate existing)
        {
            row.CreatedBy = existing.CreatedBy;
            ctx.Db.DocTemplate.Id.Update(row);
        }
        else ctx.Db.DocTemplate.Insert(row);
    }

    [SpacetimeDB.Reducer]
    public static void SaveDocument(ReducerContext ctx, string incidentId, string templateId, string body)
    {
        RequireRole(ctx, incidentId, CanEditDocs);
        RequireOpenIncident(ctx, incidentId);
        if (ctx.Db.DocTemplate.Id.Find(templateId) is null) throw new Exception("No such template.");

        string docId = $"{incidentId}:{templateId}";
        var row = new IncidentDocument
        {
            Id = docId,
            IncidentId = incidentId,
            TemplateId = templateId,
            Body = Clean(body, 100000, "Document", allowEmpty: true),
            UpdatedBy = ctx.Sender,
            UpdatedAt = ctx.Timestamp,
        };

        if (ctx.Db.IncidentDocument.Id.Find(docId) is not null) ctx.Db.IncidentDocument.Id.Update(row);
        else ctx.Db.IncidentDocument.Insert(row);
    }

    [SpacetimeDB.Reducer]
    public static void LogExport(ReducerContext ctx, string incidentId, List<string> sections)
    {
        RequireRole(ctx, incidentId, CanExport);
        var list = (sections ?? new List<string>()).Select(x => (x ?? "").Trim()).Where(x => x.Length > 0).ToList();
        LogTimeline(ctx, incidentId, $"Exported PDF: {(list.Count == 0 ? "(no sections)" : string.Join(", ", list))}");
    }

    [SpacetimeDB.Reducer]
    public static void CreateTask(ReducerContext ctx, string incidentId, string title, string forRole)
    {
        RequireRole(ctx, incidentId, RoleName.Staff);
        RequireOpenIncident(ctx, incidentId);
        if (!RoleName.Staff.Contains(forRole)) throw new Exception("Unknown role.");
        AddTask(ctx, incidentId, Clean(title, 200, "Title"), forRole);
    }

    [SpacetimeDB.Reducer]
    public static void UpdateTask(ReducerContext ctx, ulong taskId, string status)
    {
        if (ctx.Db.Task.Id.Find(taskId) is not TaskItem t) throw new Exception("No such task.");
        var role = RequireRole(ctx, t.IncidentId, RoleName.Staff);
        RequireOpenIncident(ctx, t.IncidentId);

        if (status != "todo" && status != "doing" && status != "done") throw new Exception("Unknown status.");
        if (role != RoleName.Owner && role != t.ForRole)
            throw new Exception("You can only update tasks for your own role.");

        t.Status = status;
        if (status != "todo") t.Assignee = ctx.Sender;
        t.UpdatedAt = ctx.Timestamp;
        ctx.Db.Task.Id.Update(t);

        if (status == "done") LogTimeline(ctx, t.IncidentId, $"Task done: {t.Title}");
    }
}