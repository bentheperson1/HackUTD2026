import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  Play,
  Pause,
  RotateCcw,
  ShieldAlert,
  ServerCrash,
  Scale,
  Megaphone,
  ChevronRight,
  Lightbulb,
  SlidersHorizontal,
  MessageSquare,
  ScrollText,
} from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { useAppState, useNow } from '../lib/useAppState';
import { usePersisted } from '../lib/usePersisted';
import { DEMO_SCENARIOS, ROLE_GUIDANCE_CARDS, SimulationInject } from '../lib/demoData';
import { Role, ScopeStatus } from '../lib/types';
import { ROLE_SHORT } from '../components/RoleBadge';
import { SCOPE_STATUS_META, SCOPE_SEGMENT_CLASS } from '../components/ScopeStatusBadge';
import { ActivityBars, BarList, StackedBar } from '../components/charts';
import { ArrowLink, Badge, Button, Card, PageHeader, SectionLabel, Stat, StatRow, formatClock, titleCase, cx } from '../components/ui';

const ROLE_ICONS = [ShieldAlert, ServerCrash, Scale, Megaphone];

/** Which playbook card belongs to each role (personalization). */
const PLAYBOOK_FOR_ROLE: Record<Role, number> = {
  owner: 0,
  insurer: 0,
  it_lead: 1,
  legal: 2,
  outside_counsel: 2,
  comms: 3,
};
const ROLE_FOR_PLAYBOOK: Role[] = ['owner', 'it_lead', 'legal', 'comms'];

/** Widgets the user can show or hide (remembered per browser). */
const WIDGETS = [
  { id: 'insights', label: 'Insights' },
  { id: 'breakdown', label: 'Data breakdown' },
  { id: 'nextStep', label: 'Your next step' },
  { id: 'progress', label: 'Team progress' },
  { id: 'activity', label: 'Live activity' },
  { id: 'drill', label: 'Drill Night' },
  { id: 'playbooks', label: 'Role playbooks' },
  { id: 'events', label: 'Drill events' },
] as const;
type WidgetId = (typeof WIDGETS)[number]['id'];

const SCOPE_ORDER: ScopeStatus[] = ['exfiltrated', 'locked', 'unknown', 'restored'];

const humanizeAction = (a: string) => titleCase(a.toLowerCase());

export const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const orgName = useAppState((s) => s.org.name);
  const incident = useAppState((s) => s.incident);
  const tasks = useAppState((s) => s.tasks);
  const scopeItems = useAppState((s) => s.scopeItems);
  const auditLogs = useAppState((s) => s.auditLogs);
  const messages = useAppState((s) => s.messages);
  const now = useNow(15_000);

  const [hidden, setHidden] = usePersisted<WidgetId[]>('drill_night_overview_hidden', []);
  const show = (id: WidgetId) => !hidden.includes(id);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const customizeRef = useRef<HTMLDivElement>(null);

  const [activeScenarioId, setActiveScenarioId] = useState(DEMO_SCENARIOS[0].id);
  const scenario = DEMO_SCENARIOS.find((s) => s.id === activeScenarioId) || DEMO_SCENARIOS[0];
  const [openInject, setOpenInject] = useState<string | null>(DEMO_SCENARIOS[0].injects[0]?.minute ?? null);

  // Simulation state
  const [isDrillRunning, setIsDrillRunning] = useState(false);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(900); // 15 mins
  const [drillScore, setDrillScore] = useState(150);
  const [completedInjects, setCompletedInjects] = useState<string[]>([]);
  const [completedChecklist, setCompletedChecklist] = useState<Record<string, boolean>>({});

  // Close the customize menu on outside click
  useEffect(() => {
    if (!customizeOpen) return;
    const onDown = (e: MouseEvent) => {
      if (customizeRef.current && !customizeRef.current.contains(e.target as Node)) setCustomizeOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [customizeOpen]);

  // Countdown timer for active drill
  useEffect(() => {
    if (!isDrillRunning) return;
    const timer = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsDrillRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isDrillRunning]);

  const toggleDrill = () => {
    if (!isDrillRunning) {
      setIsDrillRunning(true);
      store.recordAuditLog(currentUser.name, 'SIMULATION_START', `Started 15-minute crisis drill: ${scenario.title}`);
    } else {
      setIsDrillRunning(false);
    }
  };

  const resetDrill = () => {
    setIsDrillRunning(false);
    setTimeRemainingSeconds(900);
    setDrillScore(0);
    setCompletedInjects([]);
  };

  const handleResolveInject = (inject: SimulationInject) => {
    if (completedInjects.includes(inject.minute)) return;
    setCompletedInjects([...completedInjects, inject.minute]);
    setDrillScore((prev) => prev + inject.points);
    store.recordAuditLog(currentUser.name, 'INJECT_RESOLVED', `[+${inject.points} pts] Resolved inject: ${inject.title} (${inject.recommendedAction})`);
  };

  const toggleTask = (key: string, title: string) => {
    const nextVal = !completedChecklist[key];
    setCompletedChecklist({ ...completedChecklist, [key]: nextVal });
    if (nextVal) {
      setDrillScore((prev) => prev + 25);
      store.recordAuditLog(currentUser.name, 'TASK_COMPLETED', `Completed action checklist item: ${title}`);
    }
  };

  /* ---------- derived numbers ---------- */

  const openTasks = tasks.filter((t) => !t.done).length;
  const exfiltratedItems = scopeItems.filter((s) => s.status === 'exfiltrated');
  const unknownCount = scopeItems.filter((s) => s.status === 'unknown').length;
  const allStates = [...new Set(scopeItems.flatMap((s) => s.affected_states))];
  const resolvedCount = completedInjects.length;
  const elapsedSec = incident.status === 'active' && incident.started_at ? (now - new Date(incident.started_at).getTime()) / 1000 : 0;

  // Personalization: the signed-in person's own playbook and next step
  const myIdx = PLAYBOOK_FOR_ROLE[currentUser.role] ?? 0;
  const myCard = ROLE_GUIDANCE_CARDS[myIdx];
  const myNextStepIdx = myCard.plainSteps.findIndex((_, i) => !completedChecklist[`role-${myIdx}-step-${i}`]);
  const playbookOrder = [myIdx, ...ROLE_GUIDANCE_CARDS.map((_, i) => i).filter((i) => i !== myIdx)];

  // Team progress: store tasks + playbook steps, per role
  const progressRows = ROLE_FOR_PLAYBOOK.map((role, idx) => {
    const roleTasks = tasks.filter((t) => t.role === role);
    const steps = ROLE_GUIDANCE_CARDS[idx].plainSteps;
    const done = roleTasks.filter((t) => t.done).length + steps.filter((_, i) => completedChecklist[`role-${idx}-step-${i}`]).length;
    const total = roleTasks.length + steps.length;
    return { role, done, total };
  });

  // Live activity: audit entries + messages the viewer can see, newest first
  const visibleMessages = messages.filter((m) => (m.channel || 'warroom') !== 'admin' || currentUser.role === 'owner');
  const activity = [
    ...auditLogs.map((l) => ({ id: l.id, kind: 'log' as const, who: l.actor.replace(/^[0-9a-f]{6,}\.{3}\s*\((.*)\)$/i, '$1'), text: l.details, label: humanizeAction(l.action), at: l.timestamp })),
    ...visibleMessages.map((m) => ({ id: m.id, kind: 'chat' as const, who: m.sender_name, text: m.content, label: `#${m.channel || 'warroom'}`, at: m.timestamp })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  // 12 buckets of 10 minutes = the last 2 hours
  const BUCKET_MIN = 10;
  const buckets = Array.from({ length: 12 }, (_, i) => {
    const end = now - (11 - i) * BUCKET_MIN * 60_000;
    const start = end - BUCKET_MIN * 60_000;
    const value = activity.filter((a) => {
      const t = new Date(a.at).getTime();
      return t > start && t <= end;
    }).length;
    return { label: i === 11 ? 'now' : `-${(11 - i) * BUCKET_MIN}m`, value };
  });
  const lastHour = buckets.slice(6).reduce((n, b) => n + b.value, 0);

  const overallDone = progressRows.reduce((n, r) => n + r.done, 0);
  const overallTotal = progressRows.reduce((n, r) => n + r.total, 0);
  const overallPct = overallTotal ? Math.round((overallDone / overallTotal) * 100) : 0;
  const busiest = [...progressRows].sort((a, b) => b.total - b.done - (a.total - a.done))[0];

  /* ---------- layout helpers: if one widget in a row is hidden, the other takes the full width ---------- */
  const pair = (a: boolean, b: boolean, spanA: string, spanB: string) => ({
    a: b ? spanA : 'lg:col-span-12',
    b: a ? spanB : 'lg:col-span-12',
  });
  const rowA = pair(show('insights'), show('breakdown'), 'lg:col-span-7', 'lg:col-span-5');
  const rowC = pair(show('progress'), show('activity'), 'lg:col-span-5', 'lg:col-span-7');
  const rowD = pair(show('playbooks'), show('events'), 'lg:col-span-7', 'lg:col-span-5');

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Command center"
        title="Overview"
        description={`Out-of-band command center for ${orgName}. Everything here runs outside company email, chat and SSO.`}
        actions={
          <div className="relative" ref={customizeRef}>
            <Button size="md" onClick={() => setCustomizeOpen((v) => !v)} aria-expanded={customizeOpen} aria-haspopup="true">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Customize
            </Button>
            {customizeOpen && (
              <div className="absolute right-0 z-20 mt-1.5 w-60 rounded-md border border-line-strong bg-surface p-1.5 shadow-2xl">
                <div className="px-2 pt-1 pb-2 text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase">Show on overview</div>
                {WIDGETS.map((w) => (
                  <label key={w.id} className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-[13px] text-fg-muted hover:bg-surface-2 hover:text-fg">
                    <input type="checkbox" checked={show(w.id)} onChange={() => setHidden(show(w.id) ? [...hidden, w.id] : hidden.filter((h) => h !== w.id))} />
                    {w.label}
                  </label>
                ))}
                <div className="mt-1 border-t border-line px-2 pt-2 pb-1">
                  <button type="button" onClick={() => setHidden([])} className="text-xs text-accent hover:text-accent-hover">
                    Show all
                  </button>
                </div>
              </div>
            )}
          </div>
        }
      />

      {/* KPIs */}
      <StatRow>
        <Stat
          label="Incident"
          value={incident.status === 'active' ? 'Active' : titleCase(incident.status === 'inactive' ? 'standby' : incident.status)}
          hint={incident.status === 'active' ? `${titleCase(incident.phase)} · ${formatClock(elapsedSec)}` : 'Ready to activate'}
          tone={incident.status === 'active' ? 'breach' : 'neutral'}
        />
        <Stat label="Open tasks" value={openTasks} hint={`${tasks.length - openTasks} of ${tasks.length} done`} />
        <Stat label="Data exfiltrated" value={`${exfiltratedItems.length}/${scopeItems.length}`} hint="Data types in scope" tone={exfiltratedItems.length > 0 ? 'breach' : 'neutral'} />
        <Stat label="Activity, last hour" value={lastHour} hint="Messages and logged actions" />
      </StatRow>

      {/* Row A: written insights + data breakdown */}
      {(show('insights') || show('breakdown')) && (
        <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12">
          {show('insights') && (
            <Card kind="text" title="Insights" description="What matters right now" className={rowA.a}>
              <ul className="space-y-2.5 text-[13px] leading-relaxed text-fg-muted">
                <li className="flex gap-2.5">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                  <span>
                    {incident.status === 'active' ? (
                      <>
                        Incident active for <strong className="font-medium text-fg">{formatClock(elapsedSec)}</strong>, currently in{' '}
                        <strong className="font-medium text-fg">{titleCase(incident.phase)}</strong>.
                      </>
                    ) : (
                      <>No active incident. The team is on standby and can activate from the top bar.</>
                    )}
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-fg-subtle" aria-hidden="true" />
                  <span>
                    <strong className={cx('font-medium', exfiltratedItems.length ? 'text-breach-text' : 'text-fg')}>
                      {exfiltratedItems.length} of {scopeItems.length}
                    </strong>{' '}
                    data types confirmed exfiltrated{exfiltratedItems.length ? ` (${exfiltratedItems.map((i) => i.category).join(', ')})` : ''}.{' '}
                    {unknownCount > 0 && (
                      <>
                        <strong className="font-medium text-fg">{unknownCount}</strong> still under investigation.
                      </>
                    )}
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-fg-subtle" aria-hidden="true" />
                  <span>
                    Affected people live in <strong className="font-medium text-fg">{allStates.length ? allStates.join(', ') : 'no recorded states yet'}</strong>.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-fg-subtle" aria-hidden="true" />
                  <span>
                    <strong className="font-medium text-fg">{openTasks}</strong> open {openTasks === 1 ? 'task' : 'tasks'}.
                    {busiest && busiest.total - busiest.done > 0 && (
                      <>
                        {' '}
                        {ROLE_SHORT[busiest.role]} has the most left (<strong className="font-medium text-fg">{busiest.total - busiest.done}</strong>).
                      </>
                    )}
                  </span>
                </li>
              </ul>
            </Card>
          )}
          {show('breakdown') && (
            <Card
              kind="chart"
              title="Data breakdown"
              description={`${scopeItems.length} data types`}
              className={rowA.b}
              hoverActions={
                <Link to="/scope" className="group">
                  <ArrowLink className="text-xs">Scope</ArrowLink>
                </Link>
              }
            >
              <StackedBar
                ariaLabel="Affected data by status"
                segments={SCOPE_ORDER.map((st) => ({
                  label: SCOPE_STATUS_META[st].label,
                  value: scopeItems.filter((i) => i.status === st).length,
                  className: SCOPE_SEGMENT_CLASS[st],
                }))}
              />
              <div className="mt-4 border-t border-line pt-3">
                <div className="mb-2 text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase">By state</div>
                <div className="flex flex-wrap gap-1.5">
                  {allStates.length === 0 && <span className="text-xs text-fg-subtle">None recorded</span>}
                  {allStates.map((st) => (
                    <Badge key={st} mono>
                      {st} · {scopeItems.filter((i) => i.affected_states.includes(st)).length}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Personalized next step */}
      {show('nextStep') && (
        <Card kind="list" title="Your next step" description={`${myCard.role} · personalized for ${ROLE_SHORT[currentUser.role]}`}>
          {myNextStepIdx === -1 ? (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2.5 text-[13px] text-fg-muted">
                <Check className="h-4 w-4 text-accent" />
                Every step in your playbook is done. Check the war room for new tasks.
              </div>
              <Link to="/warroom" className="group">
                <ArrowLink>Open war room</ArrowLink>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 space-y-1.5">
                <div className="font-mono text-[11px] text-fg-subtle">
                  Step {myNextStepIdx + 1} of {myCard.plainSteps.length}
                </div>
                <h2 className="text-[15px] font-semibold text-fg">{myCard.plainSteps[myNextStepIdx]}</h2>
                <p className="max-w-2xl text-[13px] text-fg-muted">
                  <span className="font-medium text-breach-text">Avoid </span>
                  {myCard.doNotDoThis}
                </p>
              </div>
              <Button variant="primary" size="lg" className="shrink-0" onClick={() => toggleTask(`role-${myIdx}-step-${myNextStepIdx}`, myCard.plainSteps[myNextStepIdx])}>
                Mark as done
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Row C: team progress + live activity */}
      {(show('progress') || show('activity')) && (
        <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12">
          {show('progress') && (
            <Card kind="chart" title="Team progress" description="Tasks and playbook steps" className={rowC.a} bodyClassName="flex h-[calc(100%-2.5rem)] flex-col">
              <div className="mb-5 flex items-end justify-between gap-4 border-b border-line pb-4">
                <div>
                  <div className="text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase">Overall</div>
                  <div className="mt-1 text-[26px] leading-none font-semibold tracking-[-0.02em] text-fg tabular-nums">
                    {overallPct}
                    <span className="text-base text-fg-subtle">%</span>
                  </div>
                </div>
                <div className="text-right text-xs text-fg-subtle">
                  <div className="font-mono text-fg tabular-nums">
                    {overallDone}/{overallTotal}
                  </div>
                  items complete
                </div>
              </div>
              <BarList
                rows={progressRows.map((r) => ({
                  label: (
                    <span className={cx(r.role === currentUser.role && 'text-fg')}>
                      {ROLE_SHORT[r.role]}
                      {r.role === currentUser.role && <span className="ml-1.5 text-xs text-accent">you</span>}
                    </span>
                  ),
                  value: r.done,
                  max: r.total,
                }))}
              />
            </Card>
          )}
          {show('activity') && (
            <Card kind="timeline" title="Live activity" description="Last 2 hours" className={rowC.b} padded={false}>
              <div className="border-b border-line px-4 pt-4 pb-3">
                <ActivityBars buckets={buckets} ariaLabel="Messages and actions per 10 minutes" />
              </div>
              <ol className="divide-y divide-line">
                {activity.slice(0, 5).map((a) => (
                  <li key={`${a.kind}-${a.id}`} className="flex items-start gap-3 px-4 py-2.5">
                    {a.kind === 'chat' ? (
                      <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-label="Message" />
                    ) : (
                      <ScrollText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-label="Logged action" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="truncate font-medium text-fg">{a.who}</span>
                        <span className="truncate text-fg-subtle">{a.label}</span>
                      </div>
                      <p className="truncate text-[13px] text-fg-muted">{a.text}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-fg-subtle">
                      {new Date(a.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      )}

      {/* Drill controls: amber is reserved for drill mode */}
      {show('drill') && (
        <Card kind="drill" kindTone="drill" title="Drill Night" description="5-minute multiplayer practice on the real screens">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="w-full lg:max-w-sm">
              <label htmlFor="scenario" className="mb-1.5 block text-xs font-medium text-fg-muted">
                Scenario
              </label>
              <select id="scenario" value={activeScenarioId} onChange={(e) => setActiveScenarioId(e.target.value)} disabled={isDrillRunning}>
                {DEMO_SCENARIOS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.durationMinutes} min)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-1 flex-wrap items-end gap-6">
              <div>
                <div className="text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase">Time left</div>
                <div className="mt-1 font-mono text-2xl font-semibold text-fg tabular-nums">{formatClock(timeRemainingSeconds)}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase">Team score</div>
                <div className="mt-1 font-mono text-2xl font-semibold text-drill tabular-nums">{drillScore}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase">Events</div>
                <div className="mt-1 font-mono text-2xl font-semibold text-fg tabular-nums">
                  {resolvedCount}/{scenario.injects.length}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <Button variant="drill" size="lg" onClick={toggleDrill}>
                  {isDrillRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isDrillRunning ? 'Pause drill' : 'Start drill'}
                </Button>
                <Button variant="ghost" size="lg" onClick={resetDrill} aria-label="Reset drill" title="Reset drill">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Row D: playbooks + drill events */}
      {(show('playbooks') || show('events')) && (
        <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12">
          {show('playbooks') && (
            <div className={cx('space-y-8', rowD.a)}>
              <SectionLabel right="Your role first">Role playbooks</SectionLabel>
              {playbookOrder.map((idx) => {
                const card = ROLE_GUIDANCE_CARDS[idx];
                const Icon = ROLE_ICONS[idx] ?? ShieldAlert;
                const doneCount = card.plainSteps.filter((_, s) => completedChecklist[`role-${idx}-step-${s}`]).length;
                const mine = idx === myIdx;
                return (
                  <Card
                    key={card.role}
                    nested
                    kind="list"
                    title={card.role}
                    className={cx(mine && 'border-accent')}
                    actions={
                      <span className="flex items-center gap-2">
                        {mine && <Badge tone="accent">Your role</Badge>}
                        <span className="font-mono text-[11px] text-fg-subtle tabular-nums">
                          {doneCount}/{card.plainSteps.length}
                        </span>
                      </span>
                    }
                  >
                    <div className="mb-3 flex items-center gap-2 text-xs text-fg-subtle">
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {card.primaryAction}
                    </div>
                    <ul className="space-y-2">
                      {card.plainSteps.map((step, sIdx) => {
                        const taskKey = `role-${idx}-step-${sIdx}`;
                        const isChecked = !!completedChecklist[taskKey];
                        return (
                          <li key={sIdx}>
                            <label className="flex cursor-pointer items-start gap-2.5 text-[13px] select-none">
                              <input type="checkbox" checked={isChecked} onChange={() => toggleTask(taskKey, step)} className="mt-0.5" />
                              <span className={isChecked ? 'text-fg-subtle line-through' : 'text-fg-muted'}>{step}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-3 border-t border-line pt-3 text-xs text-fg-muted">
                      <span className="font-medium text-breach-text">Avoid </span>
                      {card.doNotDoThis}
                    </p>
                  </Card>
                );
              })}
            </div>
          )}

          {show('events') && (
            <div className={cx('space-y-3', rowD.b)}>
              <SectionLabel right={`${resolvedCount} of ${scenario.injects.length} resolved`}>Drill events</SectionLabel>
              <Card nested kind="timeline" kindTone="drill" title={scenario.title} padded={false}>
                <ol className="divide-y divide-line">
                  {scenario.injects.map((inject) => {
                    const isResolved = completedInjects.includes(inject.minute);
                    const open = openInject === inject.minute;
                    return (
                      <li key={inject.minute}>
                        <button
                          type="button"
                          onClick={() => setOpenInject(open ? null : inject.minute)}
                          aria-expanded={open}
                          className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-surface-2/50"
                        >
                          <ChevronRight className={cx('h-3.5 w-3.5 shrink-0 text-fg-subtle transition-transform', open && 'rotate-90')} aria-hidden="true" />
                          <span className="w-11 shrink-0 font-mono text-xs text-fg-subtle">{inject.minute}</span>
                          <span className={cx('min-w-0 flex-1 truncate text-[13px]', isResolved ? 'text-fg-subtle line-through' : 'text-fg')}>{inject.title}</span>
                          {isResolved ? <Check className="h-3.5 w-3.5 text-accent" aria-label="Resolved" /> : <span className="font-mono text-xs text-drill">+{inject.points}</span>}
                        </button>
                        {open && (
                          <div className="space-y-3 px-3.5 pb-4 pl-[3.25rem]">
                            <div className="text-xs text-fg-subtle">
                              {inject.source} · for {inject.targetRole}
                            </div>
                            <p className="text-[13px] leading-relaxed text-fg-muted">{inject.narrative}</p>
                            <div className="bg-surface px-3 py-2.5 text-[13px]">
                              <div className="text-[11px] font-semibold tracking-[0.09em] text-accent uppercase">Do this</div>
                              <div className="mt-1 text-fg">{inject.recommendedAction}</div>
                            </div>
                            {!isResolved && (
                              <Button size="sm" onClick={() => handleResolveInject(inject)}>
                                Mark resolved
                              </Button>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </Card>

              <div className="grid grid-cols-2 divide-x divide-line border-y border-line-strong">
                <Link to="/editor" className="group py-3.5 pr-4 transition-colors hover:bg-surface">
                  <div className="text-[13px] font-medium text-fg">Insurer notice</div>
                  <div className="mt-0.5 text-xs text-fg-subtle">First notice of loss draft</div>
                  <ArrowLink className="mt-3">Open</ArrowLink>
                </Link>
                <Link to="/export" className="group py-3.5 pl-4 transition-colors hover:bg-surface">
                  <div className="text-[13px] font-medium text-fg">Incident package</div>
                  <div className="mt-0.5 text-xs text-fg-subtle">For insurer and counsel</div>
                  <ArrowLink className="mt-3">Export</ArrowLink>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {hidden.length === WIDGETS.length && (
        <div className="border-y border-line-strong py-10 text-[14px] text-fg-subtle">
          All widgets are hidden. Use <span className="text-fg">Customize</span> to bring them back.
        </div>
      )}

    </div>
  );
};
