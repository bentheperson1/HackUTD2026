using SpacetimeDB;

public static partial class Module
{
    [SpacetimeDB.Table(Accessor = "User", Public = true)]
    public partial struct User
    {
        [SpacetimeDB.PrimaryKey]
        public Identity Id;

        [SpacetimeDB.Unique]
        public string Phone;

        public string DisplayName;
        public bool Online;
        public bool IsAdmin;
        public Timestamp CreatedAt;
    }

    [SpacetimeDB.Table(Accessor = "Incident", Public = true)]
    public partial struct Incident
    {
        [SpacetimeDB.PrimaryKey]
        public string Id;

        public string Name;
        public int IncidentType;
        public int Severity;
        public int Phase;
        public int Status;
        public string Summary;
        public string CurrentStatus;
        public Identity OpenedBy;
        public Timestamp OpenedAt;

        [SpacetimeDB.Index.BTree]
        public ulong OrgId;
        public bool IsDrill;
    }

    [SpacetimeDB.Table(Accessor = "IncidentMember", Public = true)]
    public partial struct IncidentMember
    {
        [SpacetimeDB.PrimaryKey]
        [SpacetimeDB.AutoInc]
        public ulong Id;

        [SpacetimeDB.Index.BTree]
        public string IncidentId;

        [SpacetimeDB.Index.BTree]
        public Identity Person;

        public string Role;
        public Identity AddedBy;
        public Timestamp AddedAt;
    }

    [SpacetimeDB.Table(Accessor = "Message")]
    public partial struct Message
    {
        [SpacetimeDB.PrimaryKey]
        [SpacetimeDB.AutoInc]
        public ulong Id;

        [SpacetimeDB.Index.BTree]
        public string IncidentId;

        public Identity Sender;
        public string Text;
        public Timestamp SentAt;

        [SpacetimeDB.Index.BTree]
        public int ChatType; // 1 for admin, 2 for incident, 3 for general

        public bool IsSystem;
    }

    [SpacetimeDB.Table(Accessor = "TimelineEntry", Public = true)]
    public partial struct TimelineEntry
    {
        [SpacetimeDB.PrimaryKey]
        [SpacetimeDB.AutoInc]
        public ulong Id;

        [SpacetimeDB.Index.BTree]
        public string IncidentId;

        public Identity Author;
        public string Action;
        public Timestamp CreatedAt;
    }

    [SpacetimeDB.Table(Accessor = "ScopeItem", Public = true)]
    public partial struct ScopeItem
    {
        [SpacetimeDB.PrimaryKey]
        [SpacetimeDB.AutoInc]
        public ulong Id;

        [SpacetimeDB.Index.BTree]
        public string IncidentId;

        public string DataType;
        public ulong RecordCount;
        public int Status;
        public List<string> States;
        public Identity UpdatedBy;
        public Timestamp UpdatedAt;
    }

    [SpacetimeDB.Table(Accessor = "DocTemplate", Public = true)]
    public partial struct DocTemplate
    {
        [SpacetimeDB.PrimaryKey]
        public string Id;

        public string Name;
        public string Description;
        public string Body;
        public Identity CreatedBy;
    }

    [SpacetimeDB.Table(Accessor = "IncidentDocument", Public = true)]
    public partial struct IncidentDocument
    {
        [SpacetimeDB.PrimaryKey]
        public string Id;

        [SpacetimeDB.Index.BTree]
        public string IncidentId;

        public string TemplateId;
        public string Body;
        public Identity UpdatedBy;
        public Timestamp UpdatedAt;
    }

    // second round of tables

    [SpacetimeDB.Table(Accessor = "Organization", Public = true)]
    public partial struct Organization
    {
        [SpacetimeDB.PrimaryKey, SpacetimeDB.AutoInc] public ulong Id;
        public string Name;
        public string Industry;
        public Timestamp CreatedAt;
    }

    [SpacetimeDB.Table(Accessor = "OrgMember", Public = true)]
    public partial struct OrgMember
    {
        [SpacetimeDB.PrimaryKey, SpacetimeDB.AutoInc] public ulong Id;
        [SpacetimeDB.Index.BTree] public ulong OrgId;
        [SpacetimeDB.Index.BTree] public Identity Person;
        public string Role;
        public bool IsAdmin;
    }

    [SpacetimeDB.Table(Accessor = "GuestGrant", Public = true)]
    public partial struct GuestGrant
    {
        [SpacetimeDB.PrimaryKey, SpacetimeDB.AutoInc] public ulong Id;
        [SpacetimeDB.Index.BTree] public string IncidentId;
        [SpacetimeDB.Index.BTree] public Identity Person;
        public string Role;
        public Timestamp ExpiresAt;
        public Identity GrantedBy;
    }

    [SpacetimeDB.Table(Accessor = "GuestGrantSweep", Scheduled = nameof(ExpireGuestGrants), ScheduledAt = nameof(GuestGrantSweep.ScheduledAt))]
    public partial struct GuestGrantSweep
    {
        [SpacetimeDB.PrimaryKey, SpacetimeDB.AutoInc] public ulong ScheduledId;
        public ScheduleAt ScheduledAt;
    }

    [SpacetimeDB.Table(Accessor = "Activation", Public = true)]
    public partial struct Activation
    {
        [SpacetimeDB.PrimaryKey, SpacetimeDB.AutoInc] public ulong Id;
        [SpacetimeDB.Index.BTree] public string IncidentId;
        public Identity ActivatedBy;
        public Timestamp ActivatedAt;
        public bool Notified;
    }

    [SpacetimeDB.Table(Accessor = "Task", Public = true)]
    public partial struct TaskItem
    {
        [SpacetimeDB.PrimaryKey, SpacetimeDB.AutoInc] public ulong Id;
        [SpacetimeDB.Index.BTree] public string IncidentId;
        public string Title;
        public string ForRole;
        public Identity? Assignee;
        public string Status;
        public Identity CreatedBy;
        public Timestamp UpdatedAt;
    }

    [SpacetimeDB.Table(Accessor = "NotificationRule", Public = true)]
    public partial struct NotificationRule
    {
        [SpacetimeDB.PrimaryKey] public string State;
        public List<string> CoveredData;
        public ulong? DeadlineDays;
        public string RegulatorNotice;
        public string SourceUrl;
        public Timestamp LastChecked;
    }

    [SpacetimeDB.Table(Accessor = "NotificationObligation", Public = true)]
    public partial struct NotificationObligation
    {
        [SpacetimeDB.PrimaryKey, SpacetimeDB.AutoInc] public ulong Id;
        [SpacetimeDB.Index.BTree] public string IncidentId;
        public string State;
        public Timestamp? DueAt;
        public string Reason;
        public string Status;
    }

    [SpacetimeDB.Table(Accessor = "DrillScenario", Public = true)]
    public partial struct DrillScenario
    {
        [SpacetimeDB.PrimaryKey] public string Id;
        public string Name;
        public string Kind;
        public ulong Minutes;
    }

    [SpacetimeDB.Table(Accessor = "DrillInject")]
    public partial struct DrillInject
    {
        [SpacetimeDB.PrimaryKey, SpacetimeDB.AutoInc] public ulong Id;
        [SpacetimeDB.Index.BTree] public string ScenarioId;
        public ulong AtSecond;
        public string Text;
        public string ForRole;
        public List<string> Choices;
        public ulong CorrectChoice;
        public ulong Points;
        public string Explanation;
    }

    [SpacetimeDB.Table(Accessor = "DrillQuestion", Public = true)]
    public partial struct DrillQuestion
    {
        [SpacetimeDB.PrimaryKey, SpacetimeDB.AutoInc] public ulong Id;
        [SpacetimeDB.Index.BTree] public ulong SessionId;
        public ulong InjectId;
        public string Text;
        public string ForRole;
        public List<string> Choices;
        public Timestamp FiredAt;
        public ulong? CorrectChoice;
        public string Explanation;
    }

    [SpacetimeDB.Table(Accessor = "DrillSession", Public = true)]
    public partial struct DrillSession
    {
        [SpacetimeDB.PrimaryKey, SpacetimeDB.AutoInc] public ulong Id;
        public ulong OrgId;
        public string ScenarioId;
        public string IncidentId;
        public string Status;
        [SpacetimeDB.Unique] public string JoinCode;
        public Timestamp? StartedAt;
        public ulong? CurrentInject;
    }

    [SpacetimeDB.Table(Accessor = "DrillPlayer", Public = true)]
    public partial struct DrillPlayer
    {
        [SpacetimeDB.PrimaryKey, SpacetimeDB.AutoInc] public ulong Id;
        [SpacetimeDB.Index.BTree] public ulong SessionId;
        public Identity Person;
        public string Nickname;
        public string Role;
        public ulong Score;
    }

    [SpacetimeDB.Table(Accessor = "DrillAnswer", Public = true)]
    public partial struct DrillAnswer
    {
        [SpacetimeDB.PrimaryKey, SpacetimeDB.AutoInc] public ulong Id;
        [SpacetimeDB.Index.BTree] public ulong SessionId;
        public ulong InjectId;
        public Identity Person;
        public ulong Choice;
        public bool Correct;
        public ulong AnsweredMs;
    }

    [SpacetimeDB.Table(Accessor = "DrillTick", Scheduled = nameof(FireNextInject), ScheduledAt = nameof(DrillTick.ScheduledAt))]
    public partial struct DrillTick
    {
        [SpacetimeDB.PrimaryKey, SpacetimeDB.AutoInc] public ulong ScheduledId;
        public ScheduleAt ScheduledAt;
        [SpacetimeDB.Index.BTree] public ulong SessionId;
    }

    //state farm stuff

    [SpacetimeDB.Table(Accessor = "OrgProfile")]
    public partial struct OrgProfile
    {
        [SpacetimeDB.PrimaryKey] public ulong OrgId;
        public string Kind; // "policyholder" or "insurer"
        public string Zip;
        public List<string> Vendors;
    }

    [SpacetimeDB.Table(Accessor = "Policy")]
    public partial struct Policy
    {
        [SpacetimeDB.PrimaryKey, SpacetimeDB.AutoInc] public ulong Id;
        [SpacetimeDB.Index.BTree] public ulong InsurerOrgId;
        [SpacetimeDB.Index.BTree] public ulong PolicyholderOrgId;
    }

    [SpacetimeDB.Table(Accessor = "CatastropheEvent")]
    public partial struct CatastropheEvent
    {
        [SpacetimeDB.PrimaryKey, SpacetimeDB.AutoInc] public ulong Id;
        [SpacetimeDB.Index.BTree] public ulong InsurerOrgId;
        public string Title;
        public string Kind;
        public string Signature;
        public string Label;
        public string Status;
        public Timestamp DetectedAt;
        public string Summary;
        public Timestamp? SummaryUpdatedAt;
    }

    [SpacetimeDB.Table(Accessor = "EventIncident")]
    public partial struct EventIncident
    {
        [SpacetimeDB.PrimaryKey, SpacetimeDB.AutoInc] public ulong Id;
        [SpacetimeDB.Index.BTree] public ulong EventId;
        [SpacetimeDB.Unique] public string IncidentId;
        public Timestamp LinkedAt;
    }

    [SpacetimeDB.Table(Accessor = "TriageAssessment")]
    public partial struct TriageAssessment
    {
        [SpacetimeDB.PrimaryKey] public string IncidentId;
        public int Score;
        public string Level;
        public List<string> Factors;
        public Timestamp UpdatedAt;
    }

    [SpacetimeDB.Table(Accessor = "ExposureAlert")]
    public partial struct ExposureAlert
    {
        [SpacetimeDB.PrimaryKey, SpacetimeDB.AutoInc] public ulong Id;
        [SpacetimeDB.Index.BTree] public ulong EventId;
        public ulong PolicyholderOrgId;
        public string Reason;
        public string Status;
        public string Draft;
        public Timestamp UpdatedAt;
    }

    [SpacetimeDB.Table(Accessor = "ClaimPacket")]
    public partial struct ClaimPacket
    {
        [SpacetimeDB.PrimaryKey] public string IncidentId;
        public string Body;
        public string Narrative;
        public Timestamp GeneratedAt;
        public Identity GeneratedBy;
    }
}