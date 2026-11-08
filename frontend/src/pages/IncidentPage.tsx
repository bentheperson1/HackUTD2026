import React, { useState } from 'react';
import { Check, Siren, CircleCheck } from 'lucide-react';
import { ActivateModal } from '../components/ActivateModal';
import { RoleChecklist } from '../components/RoleChecklist';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { IncidentPhase } from '../lib/types';
import { PHASES } from '../lib/constants';
import { useAppState, useNow } from '../lib/useAppState';
import { Alert, Badge, Button, Card, Modal, PageHeader, formatClock, titleCase, cx } from '../components/ui';

const PHASE_HELP: Record<IncidentPhase, string> = {
  detection: 'Figure out what happened and which systems are affected.',
  containment: 'Stop the attack from spreading to more systems.',
  eradication: "Remove the attacker's access and any malware.",
  recovery: 'Restore systems and data from clean backups.',
  post_incident: 'Review what happened and what to change.',
};

export const IncidentPage: React.FC = () => {
  const { currentUser } = useAuth();
  const incident = useAppState((s) => s.incident);
  const memberCount = useAppState((s) => s.members.length);
  const now = useNow();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'activate' | 'close' | null>(null);

  const handleClose = () => {
    const res = store.setIncidentStatus(currentUser.name, 'closed');
    if (!res.success) setError(res.error || 'Failed to close incident');
    setConfirm(null);
  };

  const handlePhaseChange = (phase: IncidentPhase) => {
    const res = store.setIncidentPhase(currentUser.name, phase);
    if (!res.success) setError(res.error || 'Failed to update phase');
  };

  const isActive = incident.status === 'active';
  const currentIdx = PHASES.indexOf(incident.phase);
  const elapsed = isActive && incident.started_at ? (now - new Date(incident.started_at).getTime()) / 1000 : 0;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Respond"
        title="Incident"
        description="Start an incident when you think you are under attack, then update its phase as the response moves forward."
      />

      {error && (
        <Alert tone="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card kind="data" title="Status" className={cx(isActive && 'border-breach/50 hover:border-breach/60')}>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge tone={isActive ? 'breach' : 'neutral'} dot>
                {isActive ? 'Active' : incident.status === 'closed' ? 'Closed' : 'Standby'}
              </Badge>
              {isActive && <span className="font-mono text-sm text-fg-muted">{formatClock(elapsed)} elapsed</span>}
            </div>
            <h2 className="text-xl font-semibold text-fg">
              {isActive ? 'An incident is in progress' : 'No active incident'}
            </h2>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:flex sm:gap-8">
              <div>
                <dt className="text-xs text-fg-subtle">Phase</dt>
                <dd className="text-fg">{titleCase(incident.phase)}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">Started</dt>
                <dd className="font-mono text-fg">{incident.started_at ? new Date(incident.started_at).toLocaleString() : 'Not started'}</dd>
              </div>
            </dl>
          </div>

          {!isActive ? (
            <Button variant="danger" size="lg" onClick={() => setConfirm('activate')}>
              <Siren className="h-5 w-5" />
              Activate incident
            </Button>
          ) : (
            <Button variant="secondary" size="lg" onClick={() => setConfirm('close')}>
              <CircleCheck className="h-5 w-5" />
              Close incident
            </Button>
          )}
        </div>
      </Card>

      {isActive && <RoleChecklist />}

      <Card kind="timeline" title="Phase" description="Select the phase the response is in now">
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PHASES.map((p, idx) => {
            const isCurrent = incident.phase === p;
            const isDone = isActive && idx < currentIdx;
            return (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => handlePhaseChange(p)}
                  disabled={!isActive}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cx(
                    'flex h-full w-full flex-col justify-start border-t-4 px-1 pt-3 pb-2 text-left transition-colors disabled:cursor-not-allowed',
                    isCurrent ? 'border-accent' : isDone ? 'border-accent/45' : 'border-line hover:border-line-strong',
                    !isActive && 'opacity-60'
                  )}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-fg-subtle">0{idx + 1}</span>
                    {isDone && <Check className="h-3.5 w-3.5 text-accent" />}
                    {isCurrent && <span className="font-medium text-accent">Current</span>}
                  </div>
                  <div className="font-display mt-1.5 text-[22px] leading-tight font-bold text-fg uppercase">{titleCase(p)}</div>
                  <p className="mt-1 text-xs text-fg-muted">{PHASE_HELP[p]}</p>
                </button>
              </li>
            );
          })}
        </ol>
        {!isActive && <p className="mt-4 text-xs text-fg-subtle">You can change the phase once an incident is active.</p>}
      </Card>

      {confirm === 'activate' && (
        <ActivateModal actor={currentUser.name} rosterSize={memberCount} onClose={() => setConfirm(null)} onDone={(ok, err) => !ok && setError(err || 'Failed to activate incident')} />
      )}

      {confirm === 'close' && (
        <Modal
          title="Close this incident?"
          description="The incident record is saved, and you can still export it afterward."
          onClose={() => setConfirm(null)}
        >
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleClose} autoFocus>
              Close incident
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
