import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Check, SlidersHorizontal, MessageSquare, ScrollText } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { useAppState, useNow } from '../lib/useAppState';
import { usePersisted } from '../lib/usePersisted';
import { ROLE_GUIDANCE_CARDS } from '../lib/demoData';
import { Role, ScopeStatus } from '../lib/types';
import { ROLE_SHORT } from '../components/RoleBadge';
import { SCOPE_STATUS_META, SCOPE_SEGMENT_CLASS } from '../components/ScopeStatusBadge';
import { BarList, StackedBar } from '../components/charts';
import { ArrowLink, Badge, Button, Card, PageHeader, Stat, StatRow, formatClock, titleCase, cx } from '../components/ui';

/** Which checklist belongs to each role. */
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
  { id: 'insights', label: 'Right now' },
  { id: 'breakdown', label: 'Affected data' },
  { id: 'nextStep', label: 'Your next step' },
  { id: 'playbooks', label: 'Your checklist' },
  { id: 'progress', label: 'Team progress' },
  { id: 'activity', label: 'Latest activity' },
] as const;
type WidgetId = (typeof WIDGETS)[number]['id'];

const SCOPE_ORDER: ScopeStatus[] = ['exfiltrated', 'locked', 'unknown', 'restored'];

export const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
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
  const [showOtherRoles, setShowOtherRoles] = useState(false);
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

  const toggleTask = (key: string, title: string) => {
    const nextVal = !completedChecklist[key];
    setCompletedChecklist({ ...completedChecklist, [key]: nextVal });
    if (nextVal) store.recordAuditLog(currentUser.name, 'TASK_COMPLETED', `Completed checklist item: ${title}`);
  };

  /* ---------- derived numbers ---------- */

  const isActive = incident.status === 'active';
  const openTasks = tasks.filter((t) => !t.done).length;
  const exfiltratedItems = scopeItems.filter((s) => s.status === 'exfiltrated');
  const unknownCount = scopeItems.filter((s) => s.status === 'unknown').length;
  const allStates = [...new Set(scopeItems.flatMap((s) => s.affected_states))];
  const elapsedSec = isActive && incident.started_at ? (now - new Date(incident.started_at).getTime()) / 1000 : 0;

  // The signed-in person's own checklist and next step
  const myIdx = PLAYBOOK_FOR_ROLE[currentUser.role] ?? 0;
  const myCard = ROLE_GUIDANCE_CARDS[myIdx];
  const myNextStepIdx = myCard.plainSteps.findIndex((_, i) => !completedChecklist[`role-${myIdx}-step-${i}`]);
  const playbookOrder = [myIdx, ...(showOtherRoles ? ROLE_GUIDANCE_CARDS.map((_, i) => i).filter((i) => i !== myIdx) : [])];

  // Team progress: store tasks + checklist steps, per role
  const progressRows = ROLE_FOR_PLAYBOOK.map((role, idx) => {
    const roleTasks = tasks.filter((t) => t.role === role);
    const steps = ROLE_GUIDANCE_CARDS[idx].plainSteps;
    const done = roleTasks.filter((t) => t.done).length + steps.filter((_, i) => completedChecklist[`role-${idx}-step-${i}`]).length;
    const total = roleTasks.length + steps.length;
    return { role, done, total };
  });
  const overallDone = progressRows.reduce((n, r) => n + r.done, 0);
  const overallTotal = progressRows.reduce((n, r) => n + r.total, 0);
  const overallPct = overallTotal ? Math.round((overallDone / overallTotal) * 100) : 0;

  // Latest activity: audit entries + messages the viewer can see, newest first
  const visibleMessages = messages.filter((m) => (m.channel || 'warroom') !== 'admin' || currentUser.role === 'owner');
  const activity = [
    ...auditLogs.map((l) => ({ id: l.id, kind: 'log' as const, who: l.actor.replace(/^[0-9a-f]{6,}\.{3}\s*\((.*)\)$/i, '$1'), text: l.details, at: l.timestamp })),
    ...visibleMessages.map((m) => ({ id: m.id, kind: 'chat' as const, who: m.sender_name, text: m.content, at: m.timestamp })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  /* ---------- layout helpers: if one widget in a row is hidden, the other takes the full width ---------- */
  const pair = (a: boolean, b: boolean, spanA: string, spanB: string) => ({
    a: b ? spanA : 'lg:col-span-12',
    b: a ? spanB : 'lg:col-span-12',
  });
  const rowA = pair(show('insights'), show('breakdown'), 'lg:col-span-7', 'lg:col-span-5');
  const rowC = pair(show('progress'), show('activity'), 'lg:col-span-5', 'lg:col-span-7');

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Home"
        title="Overview"
        description="What's happening and what to do next."
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
          value={isActive ? 'Active' : incident.status === 'closed' ? 'Closed' : 'None'}
          hint={isActive ? formatClock(elapsedSec) : undefined}
          tone={isActive ? 'breach' : 'neutral'}
        />
        <Stat label="Open tasks" value={openTasks} />
        <Stat label="Data stolen" value={exfiltratedItems.length} tone={exfiltratedItems.length > 0 ? 'breach' : 'neutral'} />
        <Stat label="Team progress" value={`${overallPct}%`} />
      </StatRow>

      {/* Your next step: the single most important thing for this person */}
      {show('nextStep') && (
        <Card kind="list" title="Your next step" description={myCard.role}>
          {myNextStepIdx === -1 ? (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2.5 text-[14px] text-fg-muted">
                <Check className="h-4 w-4 text-accent" />
                Your checklist is done. Check chat for new tasks.
              </div>
              <Link to="/chat" className="group">
                <ArrowLink>Open chat</ArrowLink>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 space-y-1.5">
                <h2 className="text-[17px] font-semibold text-fg">{myCard.plainSteps[myNextStepIdx]}</h2>
                <p className="text-[14px] text-breach-text">{myCard.doNotDoThis}</p>
              </div>
              <Button variant="primary" size="lg" className="shrink-0" onClick={() => toggleTask(`role-${myIdx}-step-${myNextStepIdx}`, myCard.plainSteps[myNextStepIdx])}>
                Mark as done
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Row A: plain summary + affected data */}
      {(show('insights') || show('breakdown')) && (
        <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12">
          {show('insights') && (
            <Card kind="text" title="Right now" className={rowA.a}>
              <ul className="space-y-2 text-[14px] text-fg-muted">
                <li>{isActive ? `Incident active: ${titleCase(incident.phase)} step.` : 'No active incident.'}</li>
                <li>
                  <strong className={cx('font-semibold', exfiltratedItems.length ? 'text-breach-text' : 'text-fg')}>{exfiltratedItems.length}</strong> data{' '}
                  {exfiltratedItems.length === 1 ? 'type' : 'types'} stolen
                  {unknownCount > 0 && (
                    <>
                      , <strong className="font-semibold text-fg">{unknownCount}</strong> still being checked
                    </>
                  )}
                  .
                </li>
                <li>
                  <strong className="font-semibold text-fg">{openTasks}</strong> open {openTasks === 1 ? 'task' : 'tasks'}.
                </li>
              </ul>
            </Card>
          )}
          {show('breakdown') && (
            <Card
              kind="chart"
              title="Affected data"
              className={rowA.b}
              actions={
                <Link to="/scope" className="group">
                  <ArrowLink className="text-xs">Details</ArrowLink>
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
              {allStates.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
                  <span className="mr-1 text-xs text-fg-subtle">States:</span>
                  {allStates.map((st) => (
                    <Badge key={st} mono>
                      {st}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Checklist: your role first, others on request */}
      {show('playbooks') && (
        <div className="space-y-6">
          {playbookOrder.map((idx) => {
            const card = ROLE_GUIDANCE_CARDS[idx];
            const doneCount = card.plainSteps.filter((_, s) => completedChecklist[`role-${idx}-step-${s}`]).length;
            const mine = idx === myIdx;
            return (
              <Card
                key={card.role}
                nested={!mine}
                kind="list"
                title={mine ? 'Your checklist' : `${card.role} checklist`}
                description={card.primaryAction}
                actions={
                  <span className="font-mono text-[12px] text-fg-subtle tabular-nums">
                    {doneCount}/{card.plainSteps.length}
                  </span>
                }
              >
                <ul className="space-y-2.5">
                  {card.plainSteps.map((step, sIdx) => {
                    const taskKey = `role-${idx}-step-${sIdx}`;
                    const isChecked = !!completedChecklist[taskKey];
                    return (
                      <li key={sIdx}>
                        <label className="flex cursor-pointer items-start gap-3 text-[14px] select-none">
                          <input type="checkbox" checked={isChecked} onChange={() => toggleTask(taskKey, step)} className="mt-0.5" />
                          <span className={isChecked ? 'text-fg-subtle line-through' : 'text-fg'}>{step}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-[13px] text-breach-text">{card.doNotDoThis}</p>
              </Card>
            );
          })}
          <button type="button" onClick={() => setShowOtherRoles((v) => !v)} className="text-[13px] font-semibold text-accent hover:text-accent-hover">
            {showOtherRoles ? 'Hide other roles' : "Show other roles' checklists"}
          </button>
        </div>
      )}

      {/* Row C: team progress + latest activity */}
      {(show('progress') || show('activity')) && (
        <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12">
          {show('progress') && (
            <Card kind="chart" title="Team progress" className={rowC.a}>
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
            <Card kind="timeline" title="Latest activity" className={rowC.b} padded={false}>
              {activity.length === 0 ? (
                <p className="py-4 text-[14px] text-fg-subtle">Nothing yet.</p>
              ) : (
                <ol className="divide-y divide-line">
                  {activity.slice(0, 5).map((a) => (
                    <li key={`${a.kind}-${a.id}`} className="flex items-start gap-3 py-2.5">
                      {a.kind === 'chat' ? (
                        <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-label="Message" />
                      ) : (
                        <ScrollText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-label="Logged action" />
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium text-fg">{a.who}</span>
                        <p className="truncate text-[13px] text-fg-muted">{a.text}</p>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-fg-subtle">
                        {new Date(a.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          )}
        </div>
      )}

      {hidden.length === WIDGETS.length && (
        <div className="border-y border-line-strong py-10 text-[14px] text-fg-subtle">
          Everything is hidden. Use <span className="text-fg">Customize</span> to bring it back.
        </div>
      )}
    </div>
  );
};
