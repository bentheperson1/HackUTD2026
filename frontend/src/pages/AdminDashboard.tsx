import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { Role } from '../lib/types';
import { DEMO_SCENARIOS, ROLE_GUIDANCE_CARDS, SimulationInject } from '../lib/demoData';
import { Button, IconButton } from '../components/Button';
import { Card, SectionTitle } from '../components/Card';
import { Chip } from '../components/Chip';
import { PageHeader } from '../components/PageHeader';
import { Play, Pause, RotateCcw, Check, CircleSlash, ChevronRight } from 'lucide-react';

// Which playbook tab to open first for each signed-in role.
const PLAYBOOK_FOR_ROLE: Record<Role, number> = {
  owner: 0,
  insurer: 0,
  it_lead: 1,
  legal: 2,
  outside_counsel: 2,
  comms: 3,
};

const shortRoleName = (role: string) => role.split(/ [&/] /)[0];

export const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeScenarioId, setActiveScenarioId] = useState(DEMO_SCENARIOS[0].id);
  const scenario = DEMO_SCENARIOS.find((s) => s.id === activeScenarioId) || DEMO_SCENARIOS[0];
  const [playbookIdx, setPlaybookIdx] = useState(PLAYBOOK_FOR_ROLE[currentUser.role] ?? 0);
  const playbook = ROLE_GUIDANCE_CARDS[playbookIdx];

  // Simulation state
  const [isDrillRunning, setIsDrillRunning] = useState(false);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(900); // 15 mins
  const [drillScore, setDrillScore] = useState(150);
  const [completedInjects, setCompletedInjects] = useState<string[]>([]);
  const [completedChecklist, setCompletedChecklist] = useState<Record<string, boolean>>({
    'c-1': true,
    'c-2': false,
  });

  useEffect(() => {
    setPlaybookIdx(PLAYBOOK_FOR_ROLE[currentUser.role] ?? 0);
  }, [currentUser.role]);

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
      store.recordAuditLog(
        currentUser.name,
        'SIMULATION_START',
        `Started 15-minute crisis drill: ${scenario.title}`
      );
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
    store.recordAuditLog(
      currentUser.name,
      'INJECT_RESOLVED',
      `[+${inject.points} pts] Resolved inject: ${inject.title} (${inject.recommendedAction})`
    );
  };

  const toggleTask = (key: string, title: string) => {
    const nextVal = !completedChecklist[key];
    setCompletedChecklist({ ...completedChecklist, [key]: nextVal });
    if (nextVal) {
      setDrillScore((prev) => prev + 25);
      store.recordAuditLog(
        currentUser.name,
        'TASK_COMPLETED',
        `Completed action checklist item: ${title}`
      );
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const primaryDone = !!completedChecklist['primary-step'];

  return (
    <div className="space-y-8">
      <PageHeader title="Command center" description={`${scenario.title}. ${scenario.businessImpact}`} />

      {/* The one thing to do right now */}
      <section className="rounded-2xl bg-primary-container p-5 text-on-primary-container md:p-6">
        <div className="type-label-large opacity-80">Next step · Containment, 1 of 4</div>
        <h2 className="mb-2 mt-1 type-headline-small">Unplug the server rack network cables. Leave the power on.</h2>
        <p className="m-0 max-w-3xl type-body-large opacity-90">
          Pull the cables from the core switches to stop the malware spreading. Shutting the servers down wipes
          the memory evidence your insurer's forensic team will ask for.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            variant={primaryDone ? 'tonal' : 'filled'}
            icon={primaryDone ? <Check /> : undefined}
            onClick={() => toggleTask('primary-step', 'Sever Central Server Rack Ethernet Trunks')}
          >
            {primaryDone ? 'Done, logged to audit trail' : 'Mark as done'}
          </Button>
          {!primaryDone && <span className="type-body-medium opacity-80">This is recorded in the audit log.</span>}
        </div>
      </section>

      {/* Drill controls */}
      <Card className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="type-label-medium text-on-surface-variant">Scenario</span>
          <select
            value={activeScenarioId}
            onChange={(e) => setActiveScenarioId(e.target.value)}
            disabled={isDrillRunning}
            className="w-full md:max-w-sm"
          >
            {DEMO_SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.durationMinutes} min)
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-8">
          <div>
            <div className="type-label-medium text-on-surface-variant">Time left</div>
            <div className="font-mono type-title-large tabular-nums">{formatTimer(timeRemainingSeconds)}</div>
          </div>
          <div>
            <div className="type-label-medium text-on-surface-variant">Score</div>
            <div className="font-mono type-title-large tabular-nums">{drillScore}</div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant={isDrillRunning ? 'tonal' : 'filled'} icon={isDrillRunning ? <Pause /> : <Play />} onClick={toggleDrill}>
            {isDrillRunning ? 'Pause' : 'Start drill'}
          </Button>
          <IconButton label="Reset drill" onClick={resetDrill}>
            <RotateCcw />
          </IconButton>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 [&>*]:min-w-0">
        {/* Role playbooks */}
        <section className="lg:col-span-7">
          <SectionTitle trailing="Plain-language steps for each role">Playbooks</SectionTitle>
          <Card variant="outlined" className="overflow-hidden">
            <div role="tablist" className="flex overflow-x-auto border-b border-outline-variant">
              {ROLE_GUIDANCE_CARDS.map((card, idx) => {
                const selected = idx === playbookIdx;
                return (
                  <button
                    key={card.role}
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setPlaybookIdx(idx)}
                    className={`state-layer relative h-12 flex-1 whitespace-nowrap px-4 type-title-small ${
                      selected ? 'text-primary' : 'text-on-surface-variant'
                    }`}
                  >
                    {shortRoleName(card.role)}
                    {selected && <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-t-full bg-primary" />}
                  </button>
                );
              })}
            </div>

            <div className="p-5" role="tabpanel">
              <div className="type-body-small text-on-surface-variant">{playbook.role}</div>
              <h3 className="mb-4 mt-0.5 type-title-large">{playbook.primaryAction}</h3>

              <ul className="m-0 list-none space-y-1 p-0">
                {playbook.plainSteps.map((step, sIdx) => {
                  const taskKey = `role-${playbookIdx}-step-${sIdx}`;
                  const isChecked = !!completedChecklist[taskKey];
                  return (
                    <li key={sIdx}>
                      <label className="state-layer -mx-3 flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTask(taskKey, step)}
                          className="mt-0.5 shrink-0"
                        />
                        <span
                          className={`type-body-large ${isChecked ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}
                        >
                          {step}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 flex items-start gap-3 rounded-lg bg-surface-container-high px-4 py-3">
                <CircleSlash className="mt-0.5 h-5 w-5 shrink-0 text-error" />
                <p className="m-0 type-body-medium text-on-surface-variant">
                  <span className="type-title-small text-on-surface">Avoid: </span>
                  {playbook.doNotDoThis}
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* Scenario injects */}
        <section className="lg:col-span-5">
          <SectionTitle trailing={`${completedInjects.length} of ${scenario.injects.length} handled`}>
            Scenario events
          </SectionTitle>

          <ol className="m-0 list-none space-y-3 p-0">
            {scenario.injects.map((inject, idx) => {
              const isResolved = completedInjects.includes(inject.minute);
              return (
                <li key={idx}>
                  <Card variant={isResolved ? 'outlined' : 'filled'} className={`p-4 ${isResolved ? 'opacity-70' : ''}`}>
                    <div className="mb-2 flex items-center gap-2 type-body-small text-on-surface-variant">
                      <span className="font-mono text-on-surface">T+{inject.minute}</span>
                      <span aria-hidden>·</span>
                      <span className="truncate">{inject.source}</span>
                      <span className="ml-auto whitespace-nowrap">{inject.points} pts</span>
                    </div>

                    <h3 className="m-0 type-title-medium">{inject.title}</h3>
                    <p className="mb-3 mt-1 type-body-medium text-on-surface-variant">{inject.narrative}</p>

                    <div className="mb-3 border-l-2 border-primary pl-3 type-body-medium">{inject.recommendedAction}</div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="type-body-small text-on-surface-variant">{inject.targetRole}</span>
                      {isResolved ? (
                        <Chip tone="success" icon={<Check />}>
                          Handled
                        </Chip>
                      ) : (
                        <Button variant="tonal" onClick={() => handleResolveInject(inject)}>
                          Mark handled
                        </Button>
                      )}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ol>

          <Card variant="outlined" className="mt-6 overflow-hidden">
            <div className="px-4 pb-1 pt-3 type-title-small text-on-surface-variant">Filings due</div>
            {[
              { to: '/notify', title: 'State breach notices', meta: 'TX 60 days · CA 15 days' },
              { to: '/editor', title: 'Insurance first notice of loss', meta: 'Due within 24 hours' },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="state-layer flex items-center gap-3 px-4 py-3 text-on-surface no-underline"
              >
                <div className="min-w-0 flex-1">
                  <div className="type-body-large">{link.title}</div>
                  <div className="type-body-small text-on-surface-variant">{link.meta}</div>
                </div>
                <ChevronRight className="h-5 w-5 text-on-surface-variant" />
              </Link>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
};
