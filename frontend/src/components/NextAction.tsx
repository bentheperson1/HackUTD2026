import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowRight, Check, X } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { useAppState } from '../lib/useAppState';
import { useChecklist, checklistKey } from '../lib/checklist';
import { CARD_FOR_ROLE, ROLE_GUIDANCE_CARDS } from '../lib/demoData';
import { ActivateModal } from './ActivateModal';
import { FLOW_LENGTH, PLACES, placeFor } from './places';
import { Button, cx } from './ui';

/*
  The visual language, in one place:
  - Red    = emergency, danger, "don't"
  - White  = your action (the one button to press)
  - Amber  = practice only
  - Grey   = information, nothing to do
  Every page shows exactly one "Do this now" bar in the same spot, with one sentence and one button.
*/

type Tone = 'breach' | 'accent' | 'drill' | 'neutral';

interface NextAction {
  tone: Tone;
  title: string;
  detail?: string;
  /** Where the button goes. On that page the button is replaced by "below". */
  to: string;
  button: string;
  /** Opens the activate dialog instead of navigating */
  activate?: boolean;
}

const TONE: Record<Tone, { band: string; label: string; button: 'danger' | 'primary' | 'drill' | 'secondary' }> = {
  breach: { band: 'border-breach bg-breach-soft', label: 'text-breach-text', button: 'danger' },
  accent: { band: 'border-accent bg-accent-soft', label: 'text-fg', button: 'primary' },
  drill: { band: 'border-drill bg-drill-soft', label: 'text-drill', button: 'drill' },
  neutral: { band: 'border-line-strong bg-surface', label: 'text-fg-subtle', button: 'secondary' },
};

/** Decide the single most useful thing for this person to do right now. */
function useNextAction(): NextAction {
  const { currentUser } = useAuth();
  const incident = useAppState((s) => s.incident);
  const tasks = useAppState((s) => s.tasks);
  const scopeCount = useAppState((s) => s.scopeItems.length);
  const drill = useAppState((s) => s.drill.session);
  const [done] = useChecklist();

  const isActive = incident.status === 'active';
  const role = currentUser.role;
  const canActivate = role === 'owner' || role === 'it_lead';

  if (!isActive) {
    if (drill && (drill.status === 'lobby' || drill.status === 'running')) {
      return { tone: 'drill', title: 'A practice drill is open.', to: '/drill', button: 'Join drill' };
    }
    if (canActivate) {
      return { tone: 'neutral', title: 'There is no active incident. If you think you are under attack, start one.', to: '/incident', button: 'Start incident', activate: true };
    }
    return { tone: 'neutral', title: 'There is no active incident. If you think you are under attack, tell your team in Chat.', to: '/chat', button: 'Open chat' };
  }

  const cardIdx = CARD_FOR_ROLE[role] ?? 0;
  const card = ROLE_GUIDANCE_CARDS[cardIdx];
  const stepIdx = card.plainSteps.findIndex((_, i) => !done[checklistKey(incident.id, cardIdx, i)]);
  if (stepIdx !== -1) {
    return { tone: 'breach', title: card.plainSteps[stepIdx], detail: card.doNotDoThis, to: '/incident', button: 'Open my checklist' };
  }

  const myTask = tasks.find((t) => !t.done && t.role === role);
  if (myTask) return { tone: 'accent', title: `Your task: ${myTask.title}`, to: '/chat', button: 'Open tasks' };

  if (scopeCount === 0 && (role === 'owner' || role === 'legal' || role === 'it_lead')) {
    return { tone: 'accent', title: 'Record which types of data were affected.', to: '/scope', button: 'Add affected data' };
  }

  return { tone: 'accent', title: 'You have finished your checklist. Check Chat for new tasks and updates.', to: '/chat', button: 'Open chat' };
}

/** The "Do this now" bar. Sits under the nav on every page. */
export const NextActionBar: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const memberCount = useAppState((s) => s.members.length);
  const action = useNextAction();
  const [activating, setActivating] = useState(false);
  const t = TONE[action.tone];
  const target = placeFor(action.to);
  const Icon = target?.icon;
  const here = pathname === action.to;

  return (
    <>
      <div role="status" className={cx('flex flex-col gap-3 border-l-4 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-5', t.band)}>
        <div className="min-w-0 flex-1">
          <div className={cx('text-[11px] font-bold tracking-[0.12em] uppercase', t.label)}>{action.tone === 'neutral' ? 'Status' : 'Your next step'}</div>
          <div className="mt-0.5 text-[17px] leading-snug font-semibold text-fg">{action.title}</div>
          {action.detail && (
            <div className="mt-1 flex items-center gap-1.5 text-[14px] text-breach-text">
              <X className="h-4 w-4 shrink-0" aria-hidden="true" />
              {action.detail}
            </div>
          )}
        </div>
        {here ? (
          <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-fg-muted">
            <ArrowDown className="h-4 w-4" /> On this page
          </span>
        ) : action.activate ? (
          <Button variant="danger" size="lg" className="shrink-0" onClick={() => setActivating(true)}>
            {Icon && <Icon className="h-4 w-4" />}
            {action.button}
          </Button>
        ) : (
          <Button variant={t.button} size="lg" className="shrink-0" onClick={() => navigate(action.to)}>
            {Icon && <Icon className="h-4 w-4" />}
            {action.button}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
      {activating && <ActivateModal actor={currentUser.name} rosterSize={memberCount} onClose={() => setActivating(false)} />}
    </>
  );
};

/** "Next: 3 Affected data" at the bottom of each step in the emergency flow. */
export const NextPlaceLink: React.FC = () => {
  const { pathname } = useLocation();
  const here = placeFor(pathname);
  if (!here?.step || here.step >= FLOW_LENGTH) return null;
  const next = PLACES.find((p) => p.step === here.step! + 1)!;
  const Icon = next.icon;
  return (
    <Link to={next.to} className="group mt-16 flex items-center justify-between gap-4 border-y border-line-strong py-5 transition-colors hover:bg-surface">
      <span className="text-[13px] text-fg-subtle">
        Step {here.step} of {FLOW_LENGTH} · {here.label}
      </span>
      <span className="flex items-center gap-2.5 text-[15px] font-semibold text-fg">
        <span className="text-fg-subtle">Next:</span>
        <span className="font-mono text-[12px] text-fg-subtle">{next.step}</span>
        <Icon className="h-4 w-4" />
        {next.label}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
};

/** One "Do" line (✓, white) or "Don't" line (✕, red). Used anywhere we give instructions. */
export const DoLine: React.FC<{ dont?: boolean; children: React.ReactNode; className?: string }> = ({ dont, children, className }) => (
  <p className={cx('flex items-start gap-2 text-[14px]', dont ? 'text-breach-text' : 'text-fg', className)}>
    {dont ? <X className="mt-0.5 h-4 w-4 shrink-0" aria-label="Don't" /> : <Check className="mt-0.5 h-4 w-4 shrink-0" aria-label="Do" />}
    <span>{children}</span>
  </p>
);
