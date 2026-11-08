import React, { useMemo, useState } from "react";
import { useReducer, useTable } from "spacetimedb/react";
import { reducers, tables } from "../module_bindings";
import { useAuth } from "../lib/authContext";
import { errorMessage, isIncidentOpen, toDate } from "../lib/live";
import { askAi } from "../lib/ai";
import { Button } from "../components/Button";
import { Card, SectionTitle } from "../components/Card";
import { Chip } from "../components/Chip";
import { DataTable, Column } from "../components/DataTable";
import { Field } from "../components/Field";
import { Notice } from "../components/Notice";
import { PageHeader } from "../components/PageHeader";

import type { Timestamp } from "spacetimedb";
import type { Incident } from "../module_bindings/types";

interface CatastropheEvent {
  id: bigint;
  insurerOrgId: bigint;
  title: string;
  kind: string;
  signature: string;
  label: string;
  status: string;
  detectedAt: Timestamp;
  summary: string;
  summaryUpdatedAt?: Timestamp;
}

interface ExposureAlert {
  id: bigint;
  eventId: bigint;
  policyholderOrgId: bigint;
  reason: string;
  status: string;
  draft: string;
  updatedAt: Timestamp;
}

interface TriageAssessment {
  incidentId: string;
  score: number;
  level: string;
  factors: string[];
  updatedAt: Timestamp;
}

// Privacy talking point: flip to true to send "Company 1, Company 2..." to the AI instead of real names.
const REDACT_NAMES = false;

const DEMO_VENDORS = ["MedBill Pro", "CloudDesk", "PayStream", "Apex IT"];

type Tone = "neutral" | "primary" | "error" | "success";
const LEVEL_TONE: Record<string, Tone> = {
  Critical: "error",
  High: "error",
  Medium: "primary",
  Low: "neutral",
};

interface Row {
  inc: Incident;
  tri?: TriageAssessment;
}

const ScoreChip: React.FC<{ tri?: TriageAssessment }> = ({ tri }) =>
  tri ? (
    <Chip
      tone={LEVEL_TONE[tri.level] ?? "neutral"}
      title={tri.factors.join("\n")}
    >
      {tri.level} {tri.score}
    </Chip>
  ) : (
    <Chip>Not scored</Chip>
  );

export const InsurerPage: React.FC = () => {
  const { myOrgs, activeOrg, setActiveOrgId, isAdmin } = useAuth();

  // Views (private tables are exposed through these)
  const [incidents] = useTable(tables.insurerIncidents);
  const [triage] = useTable(tables.insurerTriage);
  const [events] = useTable(tables.insurerEvents);
  const [links] = useTable(tables.insurerEventLinks);
  const [alerts] = useTable(tables.insurerAlerts);
  const [packets] = useTable(tables.visibleClaimPackets);
  const [orgs] = useTable(tables.organization);

  const setOrgProfile = useReducer(reducers.setOrgProfile);
  const linkInsurer = useReducer(reducers.linkInsurer);
  const updateAlertStatus = useReducer(reducers.updateAlertStatus);
  const saveEventSummary = useReducer(reducers.saveEventSummary);
  const saveAlertDraft = useReducer(reducers.saveAlertDraft);
  const buildClaimPacket = useReducer(reducers.buildClaimPacket);
  const saveClaimNarrative = useReducer(reducers.saveClaimNarrative);
  const closeEvent = useReducer(reducers.closeEvent);
  const seedDemoPortfolio = useReducer(reducers.seedDemoPortfolio);
  const simulateVendorOutage = useReducer(reducers.simulateVendorOutage);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  // demo controls
  const [seedCount, setSeedCount] = useState("60");
  const [vendor, setVendor] = useState(DEMO_VENDORS[0]);
  const [outageCount, setOutageCount] = useState("6");

  // policyholder sharing form
  const [insurerIdText, setInsurerIdText] = useState("");
  const [zip, setZip] = useState("");
  const [vendorsText, setVendorsText] = useState("");

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setError(null);
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  // ---------- derived data ----------
  const triageById = useMemo(
    () => new Map(triage.map((t) => [t.incidentId, t])),
    [triage],
  );
  const eventOf = useMemo(
    () => new Map(links.map((l) => [l.incidentId, l.eventId])),
    [links],
  );

  const rowFor = (inc: Incident): Row => ({ inc, tri: triageById.get(inc.id) });
  const byScore = (a: Row, b: Row) => (b.tri?.score ?? 0) - (a.tri?.score ?? 0);

  const openEvents = events
    .filter((e) => e.status === "open")
    .sort((a, b) =>
      Number(
        b.detectedAt.microsSinceUnixEpoch - a.detectedAt.microsSinceUnixEpoch,
      ),
    );

  const rowsForEvent = (ev: CatastropheEvent): Row[] =>
    incidents
      .filter((i) => eventOf.get(i.id) === ev.id)
      .map(rowFor)
      .sort(byScore);

  const standalone: Row[] = incidents
    .filter((i) => isIncidentOpen(i.status) && !eventOf.has(i.id))
    .map(rowFor)
    .sort(byScore);

  const openEventIds = new Set(openEvents.map((e) => e.id));
  const openAlerts = alerts.filter(
    (a) => a.status === "open" && openEventIds.has(a.eventId),
  );
  const shownAlerts = showAllAlerts ? openAlerts : openAlerts.slice(0, 8);

  const orgName = (id: bigint, draft?: string) => {
    const fromOrg = orgs.find((o) => o.id === id)?.name;
    if (fromOrg) return fromOrg;
    const m = draft?.match(/^Hello (.+?) team/);
    return m ? m[1] : `Company #${id}`;
  };

  const selected = incidents.find((i) => i.id === selectedId);
  const selectedTri = selected ? triageById.get(selected.id) : undefined;
  const selectedPacket = selected
    ? packets.find((p) => p.incidentId === selected.id)
    : undefined;

  // ---------- AI helpers (text is built from rows already on screen) ----------
  const company = (name: string, i: number) =>
    REDACT_NAMES ? `Company ${i + 1}` : name;

  const summarizeEvent = (ev: CatastropheEvent) =>
    run(`sum-${ev.id}`, async () => {
      const rows = rowsForEvent(ev);
      const exposed = alerts.filter(
        (a) => a.eventId === ev.id && a.status !== "reported",
      ).length;
      const lines = rows.slice(0, 8).map((r, i) => {
        const t = r.tri;
        return `${i + 1}. ${company(r.inc.name, i)} - ${t ? `${t.level} ${t.score}/100 (${t.factors.join("; ")})` : "not scored"}`;
      });
      const text =
        `Event: ${ev.title}. Type: ${ev.kind}. Policyholders with open incidents in this event: ${rows.length}. ` +
        `Exposed policyholders who have not reported: ${exposed}.\nIncidents ranked by triage score:\n${lines.join("\n")}`;
      const out = await askAi("event_summary", text);
      await saveEventSummary({ eventId: ev.id, text: out });
    });

  const polishDraft = (a: ExposureAlert, ev: CatastropheEvent | undefined) =>
    run(`draft-${a.id}`, async () => {
      const reported = ev ? rowsForEvent(ev).length : 0;
      const text =
        `Event: ${ev?.title ?? "unknown event"}. Policyholders already reporting incidents: ${reported}. ` +
        `This recipient's exposure: ${a.reason}. Rewrite this outreach so it is calm and clear:\n\n${a.draft}`;
      const out = await askAi("alert_draft", text);
      await saveAlertDraft({ alertId: a.id, text: out });
    });

  const writeNarrative = (incidentId: string, body: string) =>
    run(`narr-${incidentId}`, async () => {
      const out = await askAi("claim_narrative", body.slice(0, 12000));
      await saveClaimNarrative({ incidentId, text: out });
    });

  // ---------- table columns ----------
  const columns: Column<Row>[] = [
    { header: "Triage", render: (r) => <ScoreChip tri={r.tri} /> },
    {
      header: "Incident",
      render: (r) => (
        <div>
          <div>{r.inc.name}</div>
          <div className="type-body-small text-on-surface-variant">
            Opened {toDate(r.inc.openedAt).toLocaleString()}
          </div>
        </div>
      ),
    },
    {
      header: "Why this rank",
      render: (r) => (
        <div className="type-body-small text-on-surface-variant">
          {(r.tri?.factors ?? []).slice(0, 3).map((f) => (
            <div key={f}>{f}</div>
          ))}
        </div>
      ),
    },
    {
      header: "",
      align: "right",
      render: (r) => (
        <Button variant="tonal" onClick={() => setSelectedId(r.inc.id)}>
          Open
        </Button>
      ),
    },
  ];

  const notInsurer = incidents.length === 0 && events.length === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Insurer board"
        description="Policyholder incidents across your portfolio. Related incidents are grouped into one event, and exposed companies that haven't reported are listed so no one is overlooked."
        actions={
          myOrgs.length > 1 ? (
            <select
              aria-label="Active company"
              value={activeOrg ? String(activeOrg.id) : ""}
              onChange={(e) => setActiveOrgId(BigInt(e.target.value))}
              className="h-9 py-0"
            >
              {myOrgs.map((o) => (
                <option key={String(o.id)} value={String(o.id)}>
                  {o.name}
                </option>
              ))}
            </select>
          ) : undefined
        }
      />

      {error && <Notice tone="error">{error}</Notice>}

      <div className="flex flex-wrap gap-2">
        <Chip tone="primary">{openEvents.length} open events</Chip>
        <Chip>
          {incidents.filter((i) => isIncidentOpen(i.status)).length} open
          incidents
        </Chip>
        <Chip tone={openAlerts.length > 0 ? "error" : "neutral"}>
          {openAlerts.length} not yet reported
        </Chip>
      </div>

      {notInsurer && (
        <Notice tone="info" title="Nothing on the board yet">
          Make your company an insurer and seed a demo portfolio under Demo
          tools below, or have policyholders share their incidents with you.
        </Notice>
      )}

      {/* ---------- Events ---------- */}
      <section className="space-y-4">
        <SectionTitle trailing={`${openEvents.length} open`}>
          Events
        </SectionTitle>
        {openEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-outline-variant px-6 py-10 text-center type-body-medium text-on-surface-variant">
            No events detected. An event appears when three or more
            policyholders share a vendor or area and have open incidents within
            two hours.
          </div>
        ) : (
          openEvents.map((ev) => {
            const rows = rowsForEvent(ev);
            const top = rows[0]?.tri;
            return (
              <Card
                key={String(ev.id)}
                variant="outlined"
                className="space-y-4 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="m-0 type-title-medium text-on-surface">
                      {ev.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Chip tone="error">{rows.length} incidents</Chip>
                      {top && <ScoreChip tri={top} />}
                      <Chip>
                        {ev.kind === "vendor" ? "Shared vendor" : "Same area"}
                      </Chip>
                      <Chip>
                        Detected {toDate(ev.detectedAt).toLocaleTimeString()}
                      </Chip>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="tonal"
                      disabled={busy === `sum-${ev.id}`}
                      onClick={() => summarizeEvent(ev)}
                    >
                      {busy === `sum-${ev.id}`
                        ? "Writing…"
                        : ev.summary
                          ? "Regenerate summary"
                          : "AI summary"}
                    </Button>
                    <Button
                      variant="text"
                      onClick={() =>
                        run(`close-${ev.id}`, () =>
                          closeEvent({ eventId: ev.id }),
                        )
                      }
                    >
                      Close event
                    </Button>
                  </div>
                </div>

                {ev.summary && (
                  <div className="rounded-lg bg-surface-container-high p-3 type-body-medium text-on-surface">
                    <div className="mb-1 type-label-medium text-on-surface-variant">
                      AI-suggested summary
                    </div>
                    <div className="whitespace-pre-wrap">{ev.summary}</div>
                  </div>
                )}

                <DataTable columns={columns} data={rows} />
              </Card>
            );
          })
        )}
      </section>

      {/* ---------- Standalone incidents ---------- */}
      <section>
        <SectionTitle trailing={`${standalone.length} open`}>
          Other incidents
        </SectionTitle>
        <DataTable
          columns={columns}
          data={standalone}
          emptyMessage="No other open incidents."
        />
      </section>

      {/* ---------- Overlooked ---------- */}
      <section className="space-y-3">
        <SectionTitle trailing={`${openAlerts.length} awaiting outreach`}>
          Overlooked policyholders
        </SectionTitle>
        {openAlerts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-outline-variant px-6 py-10 text-center type-body-medium text-on-surface-variant">
            Everyone exposed to an open event has either reported or been
            contacted.
          </div>
        ) : (
          <>
            {shownAlerts.map((a) => {
              const ev = events.find((e) => e.id === a.eventId);
              const name = orgName(a.policyholderOrgId, a.draft);
              return (
                <Card
                  key={String(a.id)}
                  variant="outlined"
                  className="space-y-3 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="type-title-small text-on-surface">
                        {name}
                      </div>
                      <div className="type-body-small text-on-surface-variant">
                        {a.reason}
                      </div>
                    </div>
                    {ev && <Chip>{ev.label}</Chip>}
                  </div>
                  <details>
                    <summary className="cursor-pointer type-label-large text-primary">
                      View outreach draft
                    </summary>
                    <div className="mt-2 whitespace-pre-wrap rounded-lg bg-surface-container-high p-3 type-body-medium">
                      {a.draft}
                    </div>
                  </details>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="tonal"
                      disabled={busy === `draft-${a.id}`}
                      onClick={() => polishDraft(a, ev)}
                    >
                      {busy === `draft-${a.id}`
                        ? "Polishing…"
                        : "Polish with AI"}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() =>
                        run(`ct-${a.id}`, () =>
                          updateAlertStatus({
                            alertId: a.id,
                            status: "contacted",
                          }),
                        )
                      }
                    >
                      Mark contacted
                    </Button>
                    <Button
                      variant="text"
                      onClick={() =>
                        run(`dm-${a.id}`, () =>
                          updateAlertStatus({
                            alertId: a.id,
                            status: "dismissed",
                          }),
                        )
                      }
                    >
                      Dismiss
                    </Button>
                  </div>
                </Card>
              );
            })}
            {openAlerts.length > 8 && (
              <Button
                variant="text"
                onClick={() => setShowAllAlerts((v) => !v)}
              >
                {showAllAlerts ? "Show fewer" : `Show all ${openAlerts.length}`}
              </Button>
            )}
          </>
        )}
      </section>

      {/* ---------- Selected incident / claim packet ---------- */}
      {selected && (
        <section className="space-y-3">
          <SectionTitle
            trailing={
              <Button variant="text" onClick={() => setSelectedId(null)}>
                Close
              </Button>
            }
          >
            {selected.name}
          </SectionTitle>
          <Card variant="outlined" className="space-y-4 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <ScoreChip tri={selectedTri} />
              <Chip>Severity {selected.severity}</Chip>
              {eventOf.has(selected.id) && (
                <Chip tone="error">Part of an event</Chip>
              )}
            </div>
            {selectedTri && (
              <ul className="m-0 list-disc pl-5 type-body-small text-on-surface-variant">
                {selectedTri.factors.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy === `pkt-${selected.id}`}
                onClick={() =>
                  run(`pkt-${selected.id}`, () =>
                    buildClaimPacket({ incidentId: selected.id }),
                  )
                }
              >
                {selectedPacket ? "Rebuild claim packet" : "Build claim packet"}
              </Button>
              {selectedPacket && (
                <Button
                  variant="tonal"
                  disabled={busy === `narr-${selected.id}`}
                  onClick={() =>
                    writeNarrative(selected.id, selectedPacket.body)
                  }
                >
                  {busy === `narr-${selected.id}`
                    ? "Writing…"
                    : "Add AI narrative"}
                </Button>
              )}
            </div>

            {selectedPacket ? (
              <div className="space-y-3">
                {selectedPacket.narrative && (
                  <div className="rounded-lg bg-surface-container-high p-3 type-body-medium">
                    <div className="mb-1 type-label-medium text-on-surface-variant">
                      AI-suggested narrative
                    </div>
                    <div className="whitespace-pre-wrap">
                      {selectedPacket.narrative}
                    </div>
                  </div>
                )}
                <pre className="m-0 max-h-[480px] overflow-auto whitespace-pre-wrap rounded-lg bg-surface-container p-3 font-mono type-body-small">
                  {selectedPacket.body}
                </pre>
                <div className="flex gap-2">
                  <Button
                    variant="outlined"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        (selectedPacket.narrative
                          ? selectedPacket.narrative + "\n\n"
                          : "") + selectedPacket.body,
                      )
                    }
                  >
                    Copy packet
                  </Button>
                </div>
              </div>
            ) : (
              <div className="type-body-small text-on-surface-variant">
                The packet is assembled from the incident's real data: scope,
                deadlines, actions and timeline.
              </div>
            )}
          </Card>
        </section>
      )}

      {/* ---------- Demo tools ---------- */}
      <section className="space-y-3">
        <SectionTitle>Demo tools</SectionTitle>
        <Card variant="outlined" className="space-y-4 p-4">
          <div className="type-body-small text-on-surface-variant">
            Acting as <strong>{activeOrg?.name ?? "no company"}</strong>.
            Seeding and the outage simulator only work for staff of an insurer
            company.
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <Button
              variant="outlined"
              disabled={!activeOrg || !isAdmin || busy === "insurer"}
              onClick={() =>
                run("insurer", () =>
                  setOrgProfile({
                    orgId: activeOrg!.id,
                    kind: "insurer",
                    zip: "",
                    vendors: [],
                  }),
                )
              }
            >
              Make this company an insurer
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <Field label="Policyholders to seed">
              <input
                type="number"
                min={1}
                max={250}
                value={seedCount}
                onChange={(e) => setSeedCount(e.target.value)}
                className="w-28"
              />
            </Field>
            <Button
              disabled={!activeOrg || busy === "seed"}
              onClick={() =>
                run("seed", () =>
                  seedDemoPortfolio({
                    insurerOrgId: activeOrg!.id,
                    count: Number(seedCount),
                  }),
                )
              }
            >
              Seed portfolio
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <Field label="Vendor">
              <select
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
              >
                {DEMO_VENDORS.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Companies hit">
              <input
                type="number"
                min={1}
                max={60}
                value={outageCount}
                onChange={(e) => setOutageCount(e.target.value)}
                className="w-28"
              />
            </Field>
            <Button
              variant="danger"
              disabled={!activeOrg || busy === "outage"}
              onClick={() =>
                run("outage", () =>
                  simulateVendorOutage({
                    insurerOrgId: activeOrg!.id,
                    vendor,
                    count: Number(outageCount),
                  }),
                )
              }
            >
              Simulate vendor ransomware
            </Button>
          </div>
        </Card>

        <SectionTitle>Share my incidents with an insurer</SectionTitle>
        <Card variant="outlined" className="space-y-4 p-4">
          <div className="type-body-small text-on-surface-variant">
            For a policyholder company admin. This opts{" "}
            {activeOrg?.name ?? "your company"} in, so its incidents appear on
            the insurer's board and can be grouped into events.
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Insurer company ID">
              <input
                value={insurerIdText}
                onChange={(e) => setInsurerIdText(e.target.value)}
                className="w-32"
                inputMode="numeric"
              />
            </Field>
            <Field label="ZIP code">
              <input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="w-32"
                maxLength={5}
              />
            </Field>
            <Field label="Vendors (comma separated)">
              <input
                value={vendorsText}
                onChange={(e) => setVendorsText(e.target.value)}
                placeholder="MedBill Pro, CloudDesk"
              />
            </Field>
            <Button
              disabled={
                !activeOrg || !isAdmin || !insurerIdText || busy === "share"
              }
              onClick={() =>
                run("share", async () => {
                  await setOrgProfile({
                    orgId: activeOrg!.id,
                    kind: "policyholder",
                    zip,
                    vendors: vendorsText
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean),
                  });
                  await linkInsurer({
                    policyholderOrgId: activeOrg!.id,
                    insurerOrgId: BigInt(insurerIdText),
                  });
                })
              }
            >
              Share
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
};
