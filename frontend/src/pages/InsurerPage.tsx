import React, { useMemo, useState } from 'react';
import { useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react';
import type { Timestamp } from 'spacetimedb';
import { reducers, tables } from '../module_bindings';
import type { Incident } from '../module_bindings/types';
import { useAuth } from '../lib/authContext';
import { askAi } from '../lib/ai';
import { Alert, Badge, Button, Card, EmptyState, Label, PageHeader, Stat, StatRow, cx } from '../components/ui';
import type { Tone } from '../components/ui';

/* Row shapes for the insurer views (declared locally so this page doesn't depend on generated type names) */

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

interface Row {
  inc: Incident;
  tri?: TriageAssessment;
}

// Privacy talking point: flip to true to send "Company 1, Company 2..." to the AI instead of real names.
const REDACT_NAMES = false;
const DEMO_VENDORS = ['MedBill Pro', 'CloudDesk', 'PayStream', 'Apex IT'];
const LEVEL_TONE: Record<string, Tone> = { Critical: 'breach', High: 'breach', Medium: 'drill', Low: 'neutral' };

const toDate = (ts: Timestamp) => new Date(Number(ts.microsSinceUnixEpoch / 1000n));
const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));
const isOpen = (inc: Incident) => inc.status === 0;

const inputCls = 'h-9 border border-line-strong bg-bg px-3 text-[13px] text-fg placeholder:text-fg-subtle';

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="flex flex-col gap-1.5">
    <Label>{label}</Label>
    {children}
  </label>
);

const ScoreBadge: React.FC<{ tri?: TriageAssessment }> = ({ tri }) =>
  tri ? (
    <span title={tri.factors.join('\n')}>
      <Badge tone={LEVEL_TONE[tri.level] ?? 'neutral'}>
        {tri.level} <span className="font-mono tabular-nums">{tri.score}</span>
      </Badge>
    </span>
  ) : (
    <Badge>Not scored</Badge>
  );

/* The page only mounts the live board when connected, because it reads SpacetimeDB views directly */

export const InsurerPage: React.FC = () => {
  const { mode } = useAuth();
  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Insurer"
        title="Insurer board"
        description="Policyholder incidents across your portfolio. Related incidents are grouped into one event, and exposed companies that haven't reported are listed so no one is overlooked."
      />
      {mode === 'live' ? (
        <InsurerBoard />
      ) : (
        <Alert tone="info" title="Live connection needed">
          The insurer board reads shared data, so it only works when Outpost is online. Sign in with a roster phone to use it.
        </Alert>
      )}
    </div>
  );
};

const InsurerBoard: React.FC = () => {
  const { identity } = useSpacetimeDB();

  // Which company am I acting as? (same logic the app uses, kept local to this page)
  const [orgMembers] = useTable(tables.orgMember);
  const [orgs] = useTable(tables.organization);
  const [pickedOrgId, setPickedOrgId] = useState<bigint | null>(null);
  const myMemberships = orgMembers.filter((m) => !!identity && m.person.isEqual(identity));
  const myOrgs = orgs.filter((o) => myMemberships.some((m) => m.orgId === o.id));
  const activeOrg = myOrgs.find((o) => o.id === pickedOrgId) ?? myOrgs[0];
  const isAdmin = !!myMemberships.find((m) => m.orgId === activeOrg?.id)?.isAdmin;

  // Views (the underlying tables are private)
  const [incidents] = useTable(tables.insurerIncidents);
  const [triage] = useTable(tables.insurerTriage);
  const [events] = useTable(tables.insurerEvents);
  const [links] = useTable(tables.insurerEventLinks);
  const [alerts] = useTable(tables.insurerAlerts);
  const [packets] = useTable(tables.visibleClaimPackets);

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

  const [seedCount, setSeedCount] = useState('60');
  const [vendor, setVendor] = useState(DEMO_VENDORS[0]);
  const [outageCount, setOutageCount] = useState('6');

  const [insurerIdText, setInsurerIdText] = useState('');
  const [zip, setZip] = useState('');
  const [vendorsText, setVendorsText] = useState('');

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setError(null);
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(null);
    }
  };

  /* ---------- derived data ---------- */

  const triageById = useMemo(() => new Map(triage.map((t) => [t.incidentId, t as TriageAssessment])), [triage]);
  const eventOf = useMemo(() => new Map(links.map((l) => [l.incidentId, l.eventId])), [links]);

  const rowFor = (inc: Incident): Row => ({ inc, tri: triageById.get(inc.id) });
  const byScore = (a: Row, b: Row) => (b.tri?.score ?? 0) - (a.tri?.score ?? 0);

  const openEvents = (events as CatastropheEvent[])
    .filter((e) => e.status === 'open')
    .sort((a, b) => Number(b.detectedAt.microsSinceUnixEpoch - a.detectedAt.microsSinceUnixEpoch));

  const rowsForEvent = (ev: CatastropheEvent): Row[] =>
    incidents.filter((i) => eventOf.get(i.id) === ev.id).map(rowFor).sort(byScore);

  const standalone: Row[] = incidents
    .filter((i) => isOpen(i) && !eventOf.has(i.id))
    .map(rowFor)
    .sort(byScore);

  const openEventIds = new Set(openEvents.map((e) => e.id));
  const openAlerts = (alerts as ExposureAlert[]).filter((a) => a.status === 'open' && openEventIds.has(a.eventId));
  const shownAlerts = showAllAlerts ? openAlerts : openAlerts.slice(0, 8);
  const criticalCount = incidents.filter((i) => isOpen(i) && (triageById.get(i.id)?.level === 'Critical')).length;

  const orgName = (id: bigint, draft?: string) => {
    const fromOrg = orgs.find((o) => o.id === id)?.name;
    if (fromOrg) return fromOrg;
    const m = draft?.match(/^Hello (.+?) team/);
    return m ? m[1] : `Company #${id}`;
  };

  const selected = incidents.find((i) => i.id === selectedId);
  const selectedTri = selected ? triageById.get(selected.id) : undefined;
  const selectedPacket = selected ? packets.find((p) => p.incidentId === selected.id) : undefined;

  /* ---------- AI helpers: text is built from rows already on screen ---------- */

  const company = (name: string, i: number) => (REDACT_NAMES ? `Company ${i + 1}` : name);

  const summarizeEvent = (ev: CatastropheEvent) =>
    run(`sum-${ev.id}`, async () => {
      const rows = rowsForEvent(ev);
      const exposed = (alerts as ExposureAlert[]).filter((a) => a.eventId === ev.id && a.status !== 'reported').length;
      const lines = rows.slice(0, 8).map((r, i) => {
        const t = r.tri;
        return `${i + 1}. ${company(r.inc.name, i)} - ${t ? `${t.level} ${t.score}/100 (${t.factors.join('; ')})` : 'not scored'}`;
      });
      const text =
        `Event: ${ev.title}. Type: ${ev.kind}. Policyholders with open incidents in this event: ${rows.length}. ` +
        `Exposed policyholders who have not reported: ${exposed}.\nIncidents ranked by triage score:\n${lines.join('\n')}`;
      const out = await askAi('event_summary', text);
      await saveEventSummary({ eventId: ev.id, text: out });
    });

  const polishDraft = (a: ExposureAlert, ev: CatastropheEvent | undefined) =>
    run(`draft-${a.id}`, async () => {
      const reported = ev ? rowsForEvent(ev).length : 0;
      const text =
        `Event: ${ev?.title ?? 'unknown event'}. Policyholders already reporting incidents: ${reported}. ` +
        `This recipient's exposure: ${a.reason}. Rewrite this outreach so it is calm and clear:\n\n${a.draft}`;
      const out = await askAi('alert_draft', text);
      await saveAlertDraft({ alertId: a.id, text: out });
    });

  const writeNarrative = (incidentId: string, body: string) =>
    run(`narr-${incidentId}`, async () => {
      const out = await askAi('claim_narrative', body.slice(0, 12000));
      await saveClaimNarrative({ incidentId, text: out });
    });

  /* ---------- incident table ---------- */

  const IncidentTable: React.FC<{ rows: Row[]; empty: string }> = ({ rows, empty }) =>
    rows.length === 0 ? (
      <EmptyState title={empty} />
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line-strong">
              {['Triage', 'Incident', 'Why this rank', ''].map((h, i) => (
                <th key={i} className="py-2 pr-4 align-bottom">
                  <Label>{h}</Label>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.inc.id} className="border-b border-line align-top">
                <td className="py-3 pr-4">
                  <ScoreBadge tri={r.tri} />
                </td>
                <td className="py-3 pr-4">
                  <div className="text-[14px] font-semibold text-fg">{r.inc.name}</div>
                  <div className="text-[12px] text-fg-subtle">Opened {toDate(r.inc.openedAt).toLocaleString()}</div>
                </td>
                <td className="py-3 pr-4 text-[12px] text-fg-muted">
                  {(r.tri?.factors ?? []).slice(0, 3).map((f) => (
                    <div key={f}>{f}</div>
                  ))}
                </td>
                <td className="py-3 text-right">
                  <Button size="sm" onClick={() => setSelectedId(r.inc.id)}>
                    Open
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  const notInsurer = incidents.length === 0 && events.length === 0;

  return (
    <div className="space-y-10">
      {myOrgs.length > 1 && (
        <div className="flex items-center gap-3">
          <Label>Acting as</Label>
          <select
            aria-label="Active company"
            value={activeOrg ? String(activeOrg.id) : ''}
            onChange={(e) => setPickedOrgId(BigInt(e.target.value))}
            className={inputCls}
          >
            {myOrgs.map((o) => (
              <option key={String(o.id)} value={String(o.id)}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <Alert tone="error" title="That didn't work" onDismiss={() => setError(null)}>{error}</Alert>}

      <StatRow>
        <Stat label="Open events" value={openEvents.length} tone={openEvents.length ? 'breach' : 'neutral'} />
        <Stat label="Open incidents" value={incidents.filter(isOpen).length} />
        <Stat label="Critical" value={criticalCount} tone={criticalCount ? 'breach' : 'neutral'} />
        <Stat label="Not yet reported" value={openAlerts.length} tone={openAlerts.length ? 'drill' : 'neutral'} />
      </StatRow>

      {notInsurer && (
        <Alert tone="info" title="Nothing on the board yet">
          Make your company an insurer and seed a demo portfolio under Demo tools below, or have policyholders share their incidents with you.
        </Alert>
      )}

      {/* ---------- Events ---------- */}
      <Card title="Events" description={`${openEvents.length} open`}>
        {openEvents.length === 0 ? (
          <EmptyState
            title="No events detected"
            description="An event appears when three or more policyholders share a vendor or area and have open incidents within two hours."
          />
        ) : (
          <div className="space-y-8">
            {openEvents.map((ev) => {
              const rows = rowsForEvent(ev);
              const top = rows[0]?.tri;
              return (
                <Card
                  key={String(ev.id)}
                  nested
                  title={ev.title}
                  actions={
                    <>
                      <Button size="sm" disabled={busy === `sum-${ev.id}`} onClick={() => summarizeEvent(ev)}>
                        {busy === `sum-${ev.id}` ? 'Writing…' : ev.summary ? 'Regenerate summary' : 'AI summary'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => run(`close-${ev.id}`, () => closeEvent({ eventId: ev.id }))}>
                        Close event
                      </Button>
                    </>
                  }
                >
                  <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1">
                    <Badge tone="breach">{rows.length} incidents</Badge>
                    {top && <ScoreBadge tri={top} />}
                    <Badge>{ev.kind === 'vendor' ? 'Shared vendor' : 'Same area'}</Badge>
                    <span className="text-[12px] text-fg-subtle">Detected {toDate(ev.detectedAt).toLocaleTimeString()}</span>
                  </div>

                  {ev.summary && (
                    <div className="mb-4 border-l-2 border-accent bg-surface p-3">
                      <Label>AI-suggested summary</Label>
                      <p className="mt-1 whitespace-pre-wrap text-[14px] text-fg">{ev.summary}</p>
                    </div>
                  )}

                  <IncidentTable rows={rows} empty="No open incidents in this event." />
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {/* ---------- Standalone incidents ---------- */}
      <Card title="Other incidents" description={`${standalone.length} open`}>
        <IncidentTable rows={standalone} empty="No other open incidents." />
      </Card>

      {/* ---------- Overlooked ---------- */}
      <Card title="Overlooked policyholders" description={`${openAlerts.length} awaiting outreach`}>
        {openAlerts.length === 0 ? (
          <EmptyState title="Everyone exposed has reported or been contacted." />
        ) : (
          <div className="space-y-5">
            {shownAlerts.map((a) => {
              const ev = (events as CatastropheEvent[]).find((e) => e.id === a.eventId);
              return (
                <div key={String(a.id)} className="border-b border-line pb-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div>
                      <div className="text-[14px] font-semibold text-fg">{orgName(a.policyholderOrgId, a.draft)}</div>
                      <div className="text-[12px] text-fg-subtle">{a.reason}</div>
                    </div>
                    {ev && <Badge mono>{ev.label}</Badge>}
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[13px] font-semibold text-accent">View outreach draft</summary>
                    <div className="mt-2 whitespace-pre-wrap bg-surface p-3 text-[13px] text-fg">{a.draft}</div>
                  </details>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" disabled={busy === `draft-${a.id}`} onClick={() => polishDraft(a, ev)}>
                      {busy === `draft-${a.id}` ? 'Polishing…' : 'Polish with AI'}
                    </Button>
                    <Button size="sm" onClick={() => run(`ct-${a.id}`, () => updateAlertStatus({ alertId: a.id, status: 'contacted' }))}>
                      Mark contacted
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => run(`dm-${a.id}`, () => updateAlertStatus({ alertId: a.id, status: 'dismissed' }))}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              );
            })}
            {openAlerts.length > 8 && (
              <Button variant="ghost" onClick={() => setShowAllAlerts((v) => !v)}>
                {showAllAlerts ? 'Show fewer' : `Show all ${openAlerts.length}`}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* ---------- Selected incident / claim packet ---------- */}
      {selected && (
        <Card
          title={selected.name}
          actions={
            <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <ScoreBadge tri={selectedTri} />
              <Badge>Severity {selected.severity}</Badge>
              {eventOf.has(selected.id) && <Badge tone="breach">Part of an event</Badge>}
            </div>
            {selectedTri && (
              <ul className="list-disc pl-5 text-[13px] text-fg-muted">
                {selectedTri.factors.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="primary" disabled={busy === `pkt-${selected.id}`} onClick={() => run(`pkt-${selected.id}`, () => buildClaimPacket({ incidentId: selected.id }))}>
                {selectedPacket ? 'Rebuild claim packet' : 'Build claim packet'}
              </Button>
              {selectedPacket && (
                <Button disabled={busy === `narr-${selected.id}`} onClick={() => writeNarrative(selected.id, selectedPacket.body)}>
                  {busy === `narr-${selected.id}` ? 'Writing…' : 'Add AI narrative'}
                </Button>
              )}
              {selectedPacket && (
                <Button
                  variant="ghost"
                  onClick={() => navigator.clipboard.writeText((selectedPacket.narrative ? selectedPacket.narrative + '\n\n' : '') + selectedPacket.body)}
                >
                  Copy packet
                </Button>
              )}
            </div>

            {selectedPacket ? (
              <div className="space-y-3">
                {selectedPacket.narrative && (
                  <div className="border-l-2 border-accent bg-surface p-3">
                    <Label>AI-suggested narrative</Label>
                    <p className="mt-1 whitespace-pre-wrap text-[14px] text-fg">{selectedPacket.narrative}</p>
                  </div>
                )}
                <pre className="max-h-[480px] overflow-auto bg-surface p-3 font-mono text-[12px] whitespace-pre-wrap text-fg">{selectedPacket.body}</pre>
              </div>
            ) : (
              <p className="text-[13px] text-fg-subtle">The packet is assembled from the incident's real data: scope, deadlines, actions and timeline.</p>
            )}
          </div>
        </Card>
      )}

      {/* ---------- Demo tools ---------- */}
      <Card title="Demo tools" description={`Acting as ${activeOrg?.name ?? 'no company'}`}>
        <div className="space-y-6">
          <p className="max-w-xl text-[13px] text-fg-subtle">Seeding and the outage simulator only work for staff of an insurer company.</p>

          <Button
            disabled={!activeOrg || !isAdmin || busy === 'insurer'}
            onClick={() => run('insurer', () => setOrgProfile({ orgId: activeOrg!.id, kind: 'insurer', zip: '', vendors: [] }))}
          >
            Make this company an insurer
          </Button>

          <div className="flex flex-wrap items-end gap-3">
            <FormField label="Policyholders to seed">
              <input type="number" min={1} max={250} value={seedCount} onChange={(e) => setSeedCount(e.target.value)} className={cx(inputCls, 'w-28')} />
            </FormField>
            <Button variant="primary" disabled={!activeOrg || busy === 'seed'} onClick={() => run('seed', () => seedDemoPortfolio({ insurerOrgId: activeOrg!.id, count: Number(seedCount) }))}>
              Seed portfolio
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <FormField label="Vendor">
              <select value={vendor} onChange={(e) => setVendor(e.target.value)} className={inputCls}>
                {DEMO_VENDORS.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Companies hit">
              <input type="number" min={1} max={60} value={outageCount} onChange={(e) => setOutageCount(e.target.value)} className={cx(inputCls, 'w-28')} />
            </FormField>
            <Button
              variant="danger"
              disabled={!activeOrg || busy === 'outage'}
              onClick={() => run('outage', () => simulateVendorOutage({ insurerOrgId: activeOrg!.id, vendor, count: Number(outageCount) }))}
            >
              Simulate vendor ransomware
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Share my incidents with an insurer" description="For a policyholder company admin">
        <div className="space-y-4">
          <p className="max-w-xl text-[13px] text-fg-subtle">
            This opts {activeOrg?.name ?? 'your company'} in, so its incidents appear on the insurer's board and can be grouped into events.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <FormField label="Insurer company ID">
              <input value={insurerIdText} onChange={(e) => setInsurerIdText(e.target.value)} className={cx(inputCls, 'w-32')} inputMode="numeric" />
            </FormField>
            <FormField label="ZIP code">
              <input value={zip} onChange={(e) => setZip(e.target.value)} className={cx(inputCls, 'w-28')} maxLength={5} />
            </FormField>
            <FormField label="Vendors (comma separated)">
              <input value={vendorsText} onChange={(e) => setVendorsText(e.target.value)} placeholder="MedBill Pro, CloudDesk" className={cx(inputCls, 'w-64')} />
            </FormField>
            <Button
              variant="primary"
              disabled={!activeOrg || !isAdmin || !insurerIdText || busy === 'share'}
              onClick={() =>
                run('share', async () => {
                  await setOrgProfile({
                    orgId: activeOrg!.id,
                    kind: 'policyholder',
                    zip,
                    vendors: vendorsText.split(',').map((v) => v.trim()).filter(Boolean),
                  });
                  await linkInsurer({ policyholderOrgId: activeOrg!.id, insurerOrgId: BigInt(insurerIdText) });
                })
              }
            >
              Share
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
