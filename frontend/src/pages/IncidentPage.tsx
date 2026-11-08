import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { Incident, IncidentPhase } from '../lib/types';
import { PHASES } from '../lib/constants';
import { Button } from '../components/Button';
import { Card, SectionTitle } from '../components/Card';
import { Chip } from '../components/Chip';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';
import { Check, Siren } from 'lucide-react';

export const IncidentPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [incident, setIncident] = useState<Incident>(store.getState().incident);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return store.subscribe((state) => {
      setIncident(state.incident);
    });
  }, []);

  const handleActivate = () => {
    const res = store.setIncidentStatus(currentUser.name, 'active');
    if (!res.success) setError(res.error || 'Failed to activate incident');
  };

  const handleClose = () => {
    if (confirm('Mark the incident as resolved and close it?')) {
      const res = store.setIncidentStatus(currentUser.name, 'closed');
      if (!res.success) setError(res.error || 'Failed to close incident');
    }
  };

  const handlePhaseChange = (phase: IncidentPhase) => {
    const res = store.setIncidentPhase(currentUser.name, phase);
    if (!res.success) setError(res.error || 'Failed to update phase');
  };

  const isActive = incident.status === 'active';
  const currentPhaseIdx = PHASES.indexOf(incident.phase);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Incident status"
        description="Declaring an incident starts the clock, opens the war room and begins the audit trail."
      />

      {error && <Notice tone="error">{error}</Notice>}

      <section
        className={`rounded-2xl p-6 ${isActive ? 'bg-error-container text-on-error-container' : 'bg-surface-container'}`}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Chip className={`capitalize ${isActive ? '!border-on-error-container/40 !text-on-error-container' : ''}`}>
              {incident.status}
            </Chip>
            <h2 className="mb-2 mt-3 type-headline-medium">
              {isActive ? 'Incident in progress' : incident.status === 'closed' ? 'Incident closed' : 'No active incident'}
            </h2>
            <dl className="m-0 flex flex-wrap gap-x-8 gap-y-1 type-body-medium">
              <div className="flex gap-2">
                <dt className="opacity-75">Phase</dt>
                <dd className="m-0 capitalize">{incident.phase}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="opacity-75">Started</dt>
                <dd className="m-0">{incident.started_at ? new Date(incident.started_at).toLocaleString() : 'Not started'}</dd>
              </div>
            </dl>
          </div>

          {!isActive ? (
            <Button variant="danger" icon={<Siren />} onClick={handleActivate} className="h-12 px-8">
              Declare incident
            </Button>
          ) : (
            <Button variant="outlined" icon={<Check />} onClick={handleClose} className="!border-on-error-container/40 !text-on-error-container">
              Close incident
            </Button>
          )}
        </div>
      </section>

      <Card variant="outlined" className="p-5">
        <SectionTitle trailing="NIST SP 800-61">Response phase</SectionTitle>
        {!isActive && (
          <p className="mb-4 mt-0 type-body-medium text-on-surface-variant">Declare an incident to move between phases.</p>
        )}

        <ol className="m-0 grid list-none grid-cols-2 gap-2 p-0 md:grid-cols-4">
          {PHASES.map((p, idx) => {
            const isCurrent = incident.phase === p;
            const isPast = idx < currentPhaseIdx;
            return (
              <li key={p}>
                <button
                  onClick={() => handlePhaseChange(p)}
                  disabled={!isActive}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`state-layer flex w-full items-center gap-3 rounded-xl p-3 text-left disabled:cursor-not-allowed disabled:opacity-50 ${
                    isCurrent ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full type-label-large ${
                      isCurrent
                        ? 'bg-primary text-on-primary'
                        : isPast
                          ? 'bg-tertiary-container text-on-tertiary-container'
                          : 'border border-outline text-on-surface-variant'
                    }`}
                  >
                    {isPast ? <Check className="h-4 w-4" /> : idx + 1}
                  </span>
                  <span className="type-title-small capitalize">{p}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
};
