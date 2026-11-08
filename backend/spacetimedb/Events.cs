using System;
using System.Collections.Generic;
using System.Linq;
using SpacetimeDB;

public static partial class Module
{
    static readonly bool DemoToolsEnabled = true;   // set to false before judging
    const int ClusterMinOrgs = 3;                   // companies needed before it counts as an event
    const int ClusterWindowMinutes = 120;

    // ---------- gates ----------

    static bool IsInsurerStaff(ReducerContext ctx, ulong orgId)
    {
        if (ctx.Db.OrgProfile.OrgId.Find(orgId) is not OrgProfile p || p.Kind != "insurer") return false;
        foreach (var m in ctx.Db.OrgMember.OrgId.Filter(orgId))
            if (m.Person == ctx.Sender) return true;
        return false;
    }

    static void RequireInsurerStaff(ReducerContext ctx, ulong insurerOrgId)
    {
        if (!IsInsurerStaff(ctx, insurerOrgId)) throw new Exception("Insurer staff only.");
    }

    static CatastropheEvent RequireEventStaff(ReducerContext ctx, ulong eventId)
    {
        if (ctx.Db.CatastropheEvent.Id.Find(eventId) is not CatastropheEvent ev) throw new Exception("No such event.");
        RequireInsurerStaff(ctx, ev.InsurerOrgId);
        return ev;
    }

    // ---------- profiles and consent ----------

    [SpacetimeDB.Reducer]
    public static void SetOrgProfile(ReducerContext ctx, ulong orgId, string kind, string zip, List<string> vendors)
    {
        if (!RequireOrgMember(ctx, orgId).IsAdmin) throw new Exception("Only company admins can do that.");
        if (kind != "policyholder" && kind != "insurer") throw new Exception("Kind must be policyholder or insurer.");

        zip = (zip ?? "").Trim();
        if (zip.Length != 0 && (zip.Length != 5 || !zip.All(char.IsDigit))) throw new Exception("ZIP must be 5 digits.");

        var cleanVendors = (vendors ?? new List<string>())
            .Select(v => (v ?? "").Trim()).Where(v => v.Length > 0 && v.Length <= 60)
            .Distinct(StringComparer.OrdinalIgnoreCase).Take(10).ToList();

        var row = new OrgProfile { OrgId = orgId, Kind = kind, Zip = zip, Vendors = cleanVendors };
        if (ctx.Db.OrgProfile.OrgId.Find(orgId) is not null) ctx.Db.OrgProfile.OrgId.Update(row);
        else ctx.Db.OrgProfile.Insert(row);
    }

    // A company admin shares their incidents with their insurer. This is the opt-in.
    [SpacetimeDB.Reducer]
    public static void LinkInsurer(ReducerContext ctx, ulong policyholderOrgId, ulong insurerOrgId)
    {
        if (!RequireOrgMember(ctx, policyholderOrgId).IsAdmin) throw new Exception("Only company admins can do that.");
        if (ctx.Db.OrgProfile.OrgId.Find(insurerOrgId) is not OrgProfile p || p.Kind != "insurer")
            throw new Exception("That organization isn't an insurer.");

        foreach (var pol in ctx.Db.Policy.PolicyholderOrgId.Filter(policyholderOrgId))
            if (pol.InsurerOrgId == insurerOrgId) return;      // already linked

        ctx.Db.Policy.Insert(new Policy { Id = 0, InsurerOrgId = insurerOrgId, PolicyholderOrgId = policyholderOrgId });
    }

    // ---------- clustering (A) ----------

    // The things an org can be grouped by: each vendor it uses, then its ZIP area
    static List<(string Sig, string Label, string Kind)> SignaturesFor(OrgProfile p)
    {
        var list = new List<(string Sig, string Label, string Kind)>();
        foreach (var v in p.Vendors ?? new List<string>())
        {
            var name = (v ?? "").Trim();
            if (name.Length > 0) list.Add(("vendor:" + name.ToLowerInvariant(), name, "vendor"));
        }
        if (!string.IsNullOrEmpty(p.Zip) && p.Zip.Length >= 3)
        {
            var z = p.Zip.Substring(0, 3);
            list.Add(("zip:" + z, $"ZIP {z}xx area", "region"));
        }
        return list;
    }

    static bool Matches(OrgProfile p, string sig) => SignaturesFor(p).Any(s => s.Sig == sig);

    static CatastropheEvent? FindOpenEvent(ReducerContext ctx, ulong insurerOrgId, string sig)
    {
        foreach (var e in ctx.Db.CatastropheEvent.InsurerOrgId.Filter(insurerOrgId))
            if (e.Signature == sig && e.Status == "open") return e;
        return null;
    }

    static List<Incident> PeerIncidents(ReducerContext ctx, ulong insurerOrgId, string sig, long windowStartMicros)
    {
        var list = new List<Incident>();
        foreach (var pol in ctx.Db.Policy.InsurerOrgId.Filter(insurerOrgId))
        {
            if (ctx.Db.OrgProfile.OrgId.Find(pol.PolicyholderOrgId) is not OrgProfile prof || !Matches(prof, sig)) continue;
            foreach (var inc in ctx.Db.Incident.OrgId.Filter(pol.PolicyholderOrgId))
                if (!inc.IsDrill && inc.Status == StatusOpen && inc.OpenedAt.MicrosecondsSinceUnixEpoch >= windowStartMicros)
                    list.Add(inc);
        }
        return list;
    }

    static void LinkIncident(ReducerContext ctx, CatastropheEvent ev, Incident inc)
    {
        if (ctx.Db.EventIncident.IncidentId.Find(inc.Id) is not null) return;

        ctx.Db.EventIncident.Insert(new EventIncident { Id = 0, EventId = ev.Id, IncidentId = inc.Id, LinkedAt = ctx.Timestamp });

        // This company was on the "overlooked" list. Now it has reported.
        foreach (var a in ctx.Db.ExposureAlert.EventId.Filter(ev.Id).ToList())
        {
            if (a.PolicyholderOrgId != inc.OrgId || a.Status == "reported") continue;
            var u = a;
            u.Status = "reported";
            u.UpdatedAt = ctx.Timestamp;
            ctx.Db.ExposureAlert.Id.Update(u);
        }

        LogTimeline(ctx, inc.Id, $"Linked to a wider event: {ev.Title}");
        PostSystemMessage(ctx, inc.Id, $"This incident appears related to a wider event involving {ev.Label}.");
        RecomputeTriage(ctx, inc.Id);
    }

    static bool TryClusterFor(ReducerContext ctx, ulong insurerOrgId, (string Sig, string Label, string Kind) s, Incident inc)
    {
        var open = FindOpenEvent(ctx, insurerOrgId, s.Sig);
        if (open is CatastropheEvent existing)
        {
            LinkIncident(ctx, existing, inc);
            return true;
        }

        long windowStart = ctx.Timestamp.MicrosecondsSinceUnixEpoch - ClusterWindowMinutes * 60L * 1_000_000L;
        var peers = PeerIncidents(ctx, insurerOrgId, s.Sig, windowStart);
        if (peers.Select(p => p.OrgId).Distinct().Count() < ClusterMinOrgs) return false;

        string title = s.Kind == "vendor" ? $"Suspected vendor compromise: {s.Label}" : $"Regional event: {s.Label}";
        var ev = ctx.Db.CatastropheEvent.Insert(new CatastropheEvent
        {
            Id = 0,
            InsurerOrgId = insurerOrgId,
            Title = title,
            Kind = s.Kind,
            Signature = s.Sig,
            Label = s.Label,
            Status = "open",
            DetectedAt = ctx.Timestamp,
            Summary = "",
            SummaryUpdatedAt = null,
        });

        foreach (var p in peers) LinkIncident(ctx, ev, p);
        RefreshExposure(ctx, ev);
        return true;
    }

    // Call after an incident is created. Joins an open event, or creates one when enough peers exist.
    static void ClusterIncident(ReducerContext ctx, Incident inc)
    {
        if (inc.IsDrill) return;
        if (ctx.Db.OrgProfile.OrgId.Find(inc.OrgId) is not OrgProfile prof) return;

        foreach (var pol in ctx.Db.Policy.PolicyholderOrgId.Filter(inc.OrgId).ToList())
            foreach (var sig in SignaturesFor(prof))
                if (TryClusterFor(ctx, pol.InsurerOrgId, sig, inc)) break;
    }

    // ---------- the "overlooked" list (B) ----------

    static string DefaultOutreach(CatastropheEvent ev, string orgName, int affected)
    {
        if (ev.Kind == "vendor")
            return $"Hello {orgName} team,\n\n" +
                   $"We are seeing {affected} policyholder incident(s) linked to {ev.Label}, and we haven't heard from you. " +
                   "We're reaching out in case you are affected too.\n\n" +
                   "If you use it, please: (1) disconnect any machine showing a ransom note or unusual behavior from the network, " +
                   "(2) do not pay or reply to any demand, and (3) call our claims line so we can open a response room with you.\n\n" +
                   "This is a precautionary notice. It is not a finding that your systems are compromised.";

        return $"Hello {orgName} team,\n\n" +
               $"We are seeing multiple incidents in the {ev.Label}. " +
               "If your location was affected, first make sure everyone is safe. Then photograph any damage and call our claims line so we can help.\n\n" +
               "This is a precautionary notice.";
    }

    // Finds exposed policyholders who haven't reported yet and queues outreach for them
    static void RefreshExposure(ReducerContext ctx, CatastropheEvent ev)
    {
        var reported = new HashSet<ulong>();
        int affected = 0;
        foreach (var link in ctx.Db.EventIncident.EventId.Filter(ev.Id))
        {
            affected++;
            if (ctx.Db.Incident.Id.Find(link.IncidentId) is Incident i) reported.Add(i.OrgId);
        }

        var alerted = new HashSet<ulong>();
        foreach (var a in ctx.Db.ExposureAlert.EventId.Filter(ev.Id)) alerted.Add(a.PolicyholderOrgId);

        foreach (var pol in ctx.Db.Policy.InsurerOrgId.Filter(ev.InsurerOrgId).ToList())
        {
            ulong org = pol.PolicyholderOrgId;
            if (reported.Contains(org) || alerted.Contains(org)) continue;
            if (ctx.Db.OrgProfile.OrgId.Find(org) is not OrgProfile prof || !Matches(prof, ev.Signature)) continue;

            string name = ctx.Db.Organization.Id.Find(org) is Organization o ? o.Name : $"Organization {org}";
            ctx.Db.ExposureAlert.Insert(new ExposureAlert
            {
                Id = 0,
                EventId = ev.Id,
                PolicyholderOrgId = org,
                Reason = ev.Kind == "vendor" ? $"Uses {ev.Label}, with no incident reported" : $"Located in the {ev.Label}, with no incident reported",
                Status = "open",
                Draft = DefaultOutreach(ev, name, affected),
                UpdatedAt = ctx.Timestamp,
            });
        }
    }

    [SpacetimeDB.Reducer]
    public static void RefreshEventExposure(ReducerContext ctx, ulong eventId)
    {
        RefreshExposure(ctx, RequireEventStaff(ctx, eventId));
    }

    [SpacetimeDB.Reducer]
    public static void UpdateAlertStatus(ReducerContext ctx, ulong alertId, string status)
    {
        if (ctx.Db.ExposureAlert.Id.Find(alertId) is not ExposureAlert a) throw new Exception("No such alert.");
        RequireEventStaff(ctx, a.EventId);
        if (status != "open" && status != "contacted" && status != "dismissed") throw new Exception("Unknown status.");
        a.Status = status;
        a.UpdatedAt = ctx.Timestamp;
        ctx.Db.ExposureAlert.Id.Update(a);
    }

    [SpacetimeDB.Reducer]
    public static void CloseEvent(ReducerContext ctx, ulong eventId)
    {
        var ev = RequireEventStaff(ctx, eventId);
        ev.Status = "closed";
        ctx.Db.CatastropheEvent.Id.Update(ev);
    }

    // ---------- saving AI text (the frontend calls the AI proxy, then these) ----------

    [SpacetimeDB.Reducer]
    public static void SaveEventSummary(ReducerContext ctx, ulong eventId, string text)
    {
        var ev = RequireEventStaff(ctx, eventId);
        ev.Summary = Clean(text, 4000, "Summary");
        ev.SummaryUpdatedAt = ctx.Timestamp;
        ctx.Db.CatastropheEvent.Id.Update(ev);
    }

    [SpacetimeDB.Reducer]
    public static void SaveAlertDraft(ReducerContext ctx, ulong alertId, string text)
    {
        if (ctx.Db.ExposureAlert.Id.Find(alertId) is not ExposureAlert a) throw new Exception("No such alert.");
        RequireEventStaff(ctx, a.EventId);
        a.Draft = Clean(text, 3000, "Draft");
        a.UpdatedAt = ctx.Timestamp;
        ctx.Db.ExposureAlert.Id.Update(a);
    }

    // ---------- demo data (insurer staff only) ----------

    static readonly string[] DemoVendors = { "MedBill Pro", "CloudDesk", "PayStream", "Apex IT" };
    static readonly string[] DemoZips = { "75201", "75219", "75034", "75080", "75024", "76102", "76034", "75063" };
    static readonly string[] DemoPrefixes = { "Lone Star", "Trinity", "Oak Cliff", "Prairie", "Redbird", "Bluebonnet", "Cedar Ridge", "Heritage", "Summit", "Mockingbird" };
    static readonly string[] DemoSuffixes = { "Dental Group", "Family Clinic", "Pediatrics", "Veterinary", "Orthodontics", "Physical Therapy", "Eye Care", "Urgent Care" };

    [SpacetimeDB.Reducer]
    public static void SeedDemoPortfolio(ReducerContext ctx, ulong insurerOrgId, int count)
    {
        if (!DemoToolsEnabled) throw new Exception("Demo tools are disabled.");
        RequireInsurerStaff(ctx, insurerOrgId);
        if (count < 1 || count > 250) throw new Exception("Count must be 1-250.");

        for (int i = 0; i < count; i++)
        {
            string name = $"{DemoPrefixes[ctx.Rng.Next(DemoPrefixes.Length)]} {DemoSuffixes[ctx.Rng.Next(DemoSuffixes.Length)]}";
            var org = ctx.Db.Organization.Insert(new Organization { Id = 0, Name = name, Industry = "Healthcare", CreatedAt = ctx.Timestamp });

            var vendors = new List<string> { DemoVendors[ctx.Rng.Next(DemoVendors.Length)] };
            if (ctx.Rng.Next(3) == 0)
            {
                var second = DemoVendors[ctx.Rng.Next(DemoVendors.Length)];
                if (!vendors.Contains(second)) vendors.Add(second);
            }

            ctx.Db.OrgProfile.Insert(new OrgProfile
            {
                OrgId = org.Id,
                Kind = "policyholder",
                Zip = DemoZips[ctx.Rng.Next(DemoZips.Length)],
                Vendors = vendors,
            });
            ctx.Db.Policy.Insert(new Policy { Id = 0, InsurerOrgId = insurerOrgId, PolicyholderOrgId = org.Id });
        }
    }

    // Activates incidents at up to `count` portfolio companies that use `vendor`. Call it a few times to watch the event grow.
    [SpacetimeDB.Reducer]
    public static void SimulateVendorOutage(ReducerContext ctx, ulong insurerOrgId, string vendor, int count)
    {
        if (!DemoToolsEnabled) throw new Exception("Demo tools are disabled.");
        RequireInsurerStaff(ctx, insurerOrgId);
        vendor = Clean(vendor, 60, "Vendor");
        if (count < 1 || count > 60) throw new Exception("Count must be 1-60.");

        string sig = "vendor:" + vendor.ToLowerInvariant();
        int made = 0;

        foreach (var pol in ctx.Db.Policy.InsurerOrgId.Filter(insurerOrgId).ToList())
        {
            if (made >= count) break;
            ulong orgId = pol.PolicyholderOrgId;
            if (ctx.Db.OrgProfile.OrgId.Find(orgId) is not OrgProfile prof || !Matches(prof, sig)) continue;

            bool busy = false;
            foreach (var existing in ctx.Db.Incident.OrgId.Filter(orgId))
                if (existing.Status == StatusOpen) { busy = true; break; }
            if (busy) continue;

            string orgName = ctx.Db.Organization.Id.Find(orgId) is Organization o ? o.Name : "Unknown";
            string id = NewIncidentId(ctx);
            var inc = OpenWarRoom(ctx, orgId, id, $"{orgName}: ransomware via {vendor}", 1, 2 + ctx.Rng.Next(3), false);

            bool exfil = ctx.Rng.Next(3) != 0;
            ctx.Db.ScopeItem.Insert(new ScopeItem
            {
                Id = 0,
                IncidentId = id,
                DataType = "health",
                RecordCount = (ulong)(500 + ctx.Rng.Next(20000)),
                Status = exfil ? ScopeExfiltrated : ScopeLocked,
                States = new List<string> { "TX" },
                UpdatedBy = ctx.Sender,
                UpdatedAt = ctx.Timestamp,
            });

            RecomputeObligations(ctx, id);
            ClusterIncident(ctx, inc);
            RecomputeTriage(ctx, id);
            made++;
        }

        if (made == 0) throw new Exception("No eligible companies. Seed the portfolio first, or they already have open incidents.");
    }
}