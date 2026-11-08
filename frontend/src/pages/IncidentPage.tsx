import React, { useState } from 'react';
import { useReducer } from 'spacetimedb/react';
import { reducers } from '../module_bindings';
import { useAuth } from '../lib/authContext';
import { PHASES, SCENARIOS } from '../lib/constants';
import { isIncidentOpen, phaseName, toDate } from '../lib/live';
import { Button } from '../components/Button';
import { Card, SectionTitle } from '../components/Card';
import { Chip } from '../components/Chip';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';
import { Check, Siren } from 'lucide-react';

export const IncidentPage: React.FC = () => {
  const { isRegistered, activeIncident: incident, myIncidents, setActiveIncidentId } = useAuth();
  const createIncident = useReducer(reducers.createIncident);
  const [name, setName] = useState('');
  // Incident.incidentType is an index into SCENARIOS
  const [incidentType, setIncidentType] = useState(0);
  const [severity, setSeverity] = useState(5);
  const [error, setError] = useState<string | null>(null);

  const handleDeclare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createIncident({ name, incidentType, severity });
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const isActive = !!incident && isIncidentOpen(incident.status);
  const currentPhase = incident ? phaseName(incident.phase) : PHASES[0];
  const currentPhaseIdx = PHASES.indexOf(currentPhase);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Incident status"
        description="Declaring an incident starts the clock, opens the war room and begins the audit trail."
      />

      {error && <Notice tone="error">{error}</Notice>}
      {!isRegistered && <Notice tone="error">Sign in with your phone number before declaring an incident.</Notice>}

      {myIncidents.length > 1 && (
        <Field label="Viewing incident">
          <select value={incident?.id} onChange={(e) => setActiveIncidentId(e.target.value)} className="w-full">
            {myIncidents.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <section
        className={`rounded-2xl p-6 ${isActive ? 'bg-error-container text-on-error-container' : 'bg-surface-container'}`}
      >
        <Chip className={isActive ? '!border-on-error-container/40 !text-on-error-container' : ''}>
          {incident ? (isActive ? 'Active' : 'Closed') : 'Standby'}
        </Chip>
        <h2 className="mb-2 mt-3 type-headline-medium">{incident ? incident.name : 'No active incident'}</h2>
        {incident && (
          <dl className="m-0 flex flex-wrap gap-x-8 gap-y-1 type-body-medium">
            <div className="flex gap-2">
              <dt className="opacity-75">Phase</dt>
              <dd className="m-0 capitalize">{currentPhase}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="opacity-75">Type</dt>
              <dd className="m-0">{SCENARIOS[incident.incidentType]?.label ?? 'Other'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="opacity-75">Severity</dt>
              <dd className="m-0">{incident.severity}/10</dd>
            </div>
            <div className="flex gap-2">
              <dt className="opacity-75">Started</dt>
              <dd className="m-0">{toDate(incident.openedAt).toLocaleString()}</dd>
            </div>
          </dl>
        )}
      </section>

      <Card className="p-5">
        <SectionTitle>Declare a new incident</SectionTitle>
        <form onSubmit={handleDeclare} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ransomware on file server"
                className="w-full"
                maxLength={100}
              />
            </Field>
            <Field label="Type">
              <select value={incidentType} onChange={(e) => setIncidentType(Number(e.target.value))} className="w-full">
                {SCENARIOS.map((s, idx) => (
                  <option key={s.type} value={idx}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Severity (1-10)">
              <input
                type="number"
                min={1}
                max={10}
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                className="w-full"
              />
            </Field>
          </div>
          <Button type="submit" variant="danger" icon={<Siren />} disabled={!isRegistered || !name.trim()}>
            Declare incident
          </Button>
        </form>
      </Card>

      <Card variant="outlined" className="p-5">
        <SectionTitle trailing="NIST SP 800-61">Response phase</SectionTitle>
        {/* TODO: needs a SetPhase reducer in the backend before these can be clicked */}
        <ol className="m-0 grid list-none grid-cols-2 gap-2 p-0 md:grid-cols-4">
          {PHASES.map((p, idx) => {
            const isCurrent = !!incident && currentPhase === p;
            const isPast = !!incident && idx < currentPhaseIdx;
            return (
              <li key={p}>
                <div
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 ${
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
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
};
