using System;
using System.Linq;
using SpacetimeDB;

// Report documents: free-standing letters/reports a company keeps, optionally
// started from a DocTemplate and optionally tied to an incident.
// Full CRUD: CreateReportDocument / UpdateReportDocument / DeleteReportDocument.
public static partial class Module
{
    [SpacetimeDB.Table(Accessor = "ReportDocument", Public = true)]
    public partial struct ReportDocument
    {
        [SpacetimeDB.PrimaryKey, SpacetimeDB.AutoInc]
        public ulong Id;

        [SpacetimeDB.Index.BTree]
        public ulong OrgId;

        public string IncidentId;   // "" when not tied to an incident
        public string TemplateId;   // "" when started blank
        public string Title;
        public string Body;
        public Identity CreatedBy;
        public Timestamp CreatedAt;
        public Identity UpdatedBy;
        public Timestamp UpdatedAt;
    }

    /// Company members can work on their company's documents. Incident guests
    /// (insurer, outside counsel) can work on documents tied to that incident if their role allows it.
    static void RequireDocAccess(ReducerContext ctx, ulong orgId, string incidentId)
    {
        foreach (var m in ctx.Db.OrgMember.OrgId.Filter(orgId))
            if (m.Person == ctx.Sender) return;

        if (incidentId.Length > 0)
        {
            var role = FindIncidentRole(ctx, incidentId);
            if (role != null && CanEditDocs.Contains(role)) return;
        }
        throw new Exception("You can't edit this company's documents.");
    }

    static bool IsOrgAdmin(ReducerContext ctx, ulong orgId)
    {
        foreach (var m in ctx.Db.OrgMember.OrgId.Filter(orgId))
            if (m.Person == ctx.Sender) return m.IsAdmin || m.Role == RoleName.Owner;
        return false;
    }

    [SpacetimeDB.Reducer]
    public static void CreateReportDocument(ReducerContext ctx, ulong orgId, string incidentId, string templateId, string title, string body)
    {
        incidentId = (incidentId ?? "").Trim();
        templateId = (templateId ?? "").Trim();

        if (ctx.Db.Organization.Id.Find(orgId) is null) throw new Exception("No such company.");
        if (incidentId.Length > 0)
        {
            if (ctx.Db.Incident.Id.Find(incidentId) is not Incident inc) throw new Exception("No such incident.");
            if (inc.OrgId != orgId) throw new Exception("That incident belongs to a different company.");
        }
        if (templateId.Length > 0 && ctx.Db.DocTemplate.Id.Find(templateId) is null) throw new Exception("No such template.");
        RequireDocAccess(ctx, orgId, incidentId);

        ctx.Db.ReportDocument.Insert(new ReportDocument
        {
            Id = 0,
            OrgId = orgId,
            IncidentId = incidentId,
            TemplateId = templateId,
            Title = Clean(title, 200, "Title"),
            Body = Clean(body, 100000, "Document", allowEmpty: true),
            CreatedBy = ctx.Sender,
            CreatedAt = ctx.Timestamp,
            UpdatedBy = ctx.Sender,
            UpdatedAt = ctx.Timestamp,
        });
    }

    [SpacetimeDB.Reducer]
    public static void UpdateReportDocument(ReducerContext ctx, ulong id, string title, string body)
    {
        if (ctx.Db.ReportDocument.Id.Find(id) is not ReportDocument doc) throw new Exception("That document no longer exists.");
        RequireDocAccess(ctx, doc.OrgId, doc.IncidentId);

        doc.Title = Clean(title, 200, "Title");
        doc.Body = Clean(body, 100000, "Document", allowEmpty: true);
        doc.UpdatedBy = ctx.Sender;
        doc.UpdatedAt = ctx.Timestamp;
        ctx.Db.ReportDocument.Id.Update(doc);
    }

    [SpacetimeDB.Reducer]
    public static void DeleteReportDocument(ReducerContext ctx, ulong id)
    {
        if (ctx.Db.ReportDocument.Id.Find(id) is not ReportDocument doc) throw new Exception("That document no longer exists.");
        RequireDocAccess(ctx, doc.OrgId, doc.IncidentId);
        if (doc.CreatedBy != ctx.Sender && !IsOrgAdmin(ctx, doc.OrgId))
            throw new Exception("Only the person who created this document or a company admin can delete it.");

        ctx.Db.ReportDocument.Id.Delete(id);
        if (doc.IncidentId.Length > 0) LogTimeline(ctx, doc.IncidentId, $"Deleted document: {doc.Title}");
    }
}
