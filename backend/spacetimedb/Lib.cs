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
    }

    [SpacetimeDB.Table(Accessor = "IncidentMember", Public = true)]
    public partial struct IncidentMember
    {
        [SpacetimeDB.PrimaryKey]
        [SpacetimeDB.AutoInc]
        public ulong Id;

        [SpacetimeDB.Index.BTree]
        public string IncidentId;

        public Identity Person;
        public string Role;
        public Identity AddedBy;
        public Timestamp AddedAt;
    }

    [SpacetimeDB.Table(Accessor = "Message", Public = true)]
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
}