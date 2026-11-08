<<<<<<< Updated upstream
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
=======
import React, { useState } from 'react';
>>>>>>> Stashed changes
import { useReducer } from 'spacetimedb/react';
import { reducers } from '../module_bindings';
import { useAuth } from '../lib/authContext';
import { PHASES, SCENARIOS } from '../lib/constants';
<<<<<<< Updated upstream
import { errorMessage, isIncidentOpen, phaseName, SEVERITIES, toDate } from '../lib/live';
=======
import { isIncidentOpen, phaseName, toDate } from '../lib/live';
>>>>>>> Stashed changes
import { Button } from '../components/Button';
import { Card, SectionTitle } from '../components/Card';
import { Chip } from '../components/Chip';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';
import { Check, Siren } from 'lucide-react';

// Role checks mirror Helpers.cs so buttons are only enabled when the backend will accept them
const CAN_ACTIVATE = ['Owner', 'ItLead'];
const CAN_CHANGE_PHASE = ['Owner', 'ItLead'];
const CAN_EDIT_DOCS = ['Owner', 'ItLead', 'Legal', 'Comms', 'Counsel'];

export const IncidentPage: React.FC = () => {
<<<<<<< Updated upstream
  const { isRegistered, activeOrg, orgMembership, activeIncident: incident, incidentRole, myIncidents, setActiveIncidentId } =
    useAuth();
  const activateIncident = useReducer(reducers.activateIncident);
  const setPhase = useReducer(reducers.setPhase);
  const closeIncident = useReducer(reducers.closeIncident);
  const updateIncident = useReducer(reducers.updateIncident);

  const [name, setName] = useState('');
  // Incident.incidentType is an index into SCENARIOS
  const [incidentType, setIncidentType] = useState(0);
  const [severity, setSeverity] = useState(3);
  const [summary, setSummary] = useState('');
  const [currentStatus, setCurrentStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load the saved summary/status whenever a different incident is shown (or it changes on the server)
  useEffect(() => {
    setSummary(incident?.summary ?? '');
    setCurrentStatus(incident?.currentStatus ?? '');
  }, [incident?.id, incident?.summary, incident?.currentStatus]);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    const ok = await run(() => activateIncident({ orgId: activeOrg.id, name, incidentType, severity }));
    if (ok) setName('');
  };

  const handleClose = () => {
    if (incident && confirm('Mark the incident as resolved and close it?')) {
      run(() => closeIncident({ incidentId: incident.id }));
    }
  };

  const isActive = !!incident && isIncidentOpen(incident.status);
  const currentPhase = incident ? phaseName(incident.phase) : PHASES[0];
  const currentPhaseIdx = PHASES.indexOf(currentPhase);
  const canActivate = !!orgMembership && CAN_ACTIVATE.includes(orgMembership.role);
  const canChangePhase = isActive && !!incidentRole && CAN_CHANGE_PHASE.includes(incidentRole);
  const canEditDocs = isActive && !!incidentRole && CAN_EDIT_DOCS.includes(incidentRole);
  const summaryDirty = !!incident && (summary !== incident.summary || currentStatus !== incident.currentStatus);
=======
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
>>>>>>> Stashed changes

  return (
    <div className="space-y-8">
      <PageHeader
        title="Incident status"
        description="Declaring an incident starts the clock, opens the war room and begins the audit trail."
      />

      {error && <Notice tone="error">{error}</Notice>}
<<<<<<< Updated upstream
      {!isRegistered && <Notice tone="error">Sign in with your phone number first.</Notice>}
      {isRegistered && !activeOrg && (
        <Notice>
          Incidents belong to a company. <Link to="/members" className="text-primary">Set one up on the Team roster page</Link>{' '}
          or ask your owner to add your phone number.
        </Notice>
      )}

      {myIncidents.length > 1 && (
        <Field label="Viewing incident">
          <select value={incident?.id} onChange={(e) => setActiveIncidentId(e.target.value)} className="w-full md:max-w-md">
            {myIncidents.map((i) => (
              <option key={i.id} value={i.id}>
                {i.id} · {i.name}
                {i.isDrill ? ' (drill)' : ''}
                {isIncidentOpen(i.status) ? '' : ' (closed)'}
=======
      {!isRegistered && <Notice tone="error">Sign in with your phone number before declaring an incident.</Notice>}

      {myIncidents.length > 1 && (
        <Field label="Viewing incident">
          <select value={incident?.id} onChange={(e) => setActiveIncidentId(e.target.value)} className="w-full">
            {myIncidents.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
>>>>>>> Stashed changes
              </option>
            ))}
          </select>
        </Field>
      )}

      <section
        className={`rounded-2xl p-6 ${isActive ? 'bg-error-container text-on-error-container' : 'bg-surface-container'}`}
      >
<<<<<<< Updated upstream
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Chip className={isActive ? '!border-on-error-container/40 !text-on-error-container' : ''}>
              {incident ? (isActive ? 'Active' : 'Closed') : 'Standby'}
              {incident?.isDrill ? ' · Drill' : ''}
            </Chip>
            <h2 className="mb-2 mt-3 type-headline-medium">{incident ? incident.name : 'No active incident'}</h2>
            {incident && (
              <dl className="m-0 flex flex-wrap gap-x-8 gap-y-1 type-body-medium">
                <div className="flex gap-2">
                  <dt className="opacity-75">ID</dt>
                  <dd className="m-0 font-mono">{incident.id}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="opacity-75">Type</dt>
                  <dd className="m-0">{SCENARIOS[incident.incidentType]?.label ?? 'Other'}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="opacity-75">Severity</dt>
                  <dd className="m-0">{SEVERITIES.find((s) => s.value === incident.severity)?.label ?? incident.severity}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="opacity-75">Started</dt>
                  <dd className="m-0">{toDate(incident.openedAt).toLocaleString()}</dd>
                </div>
              </dl>
            )}
          </div>

          {isActive && incidentRole === 'Owner' && (
            <Button
              variant="outlined"
              icon={<Check />}
              onClick={handleClose}
              className="!border-on-error-container/40 !text-on-error-container"
            >
              Close incident
            </Button>
          )}
        </div>
      </section>

      {incident && (
        <Card variant="outlined" className="p-5">
          <SectionTitle trailing="NIST SP 800-61">Response phase</SectionTitle>
          {!canChangePhase && (
            <p className="mb-4 mt-0 type-body-medium text-on-surface-variant">
              {isActive ? 'Only the owner or IT lead can change the phase.' : 'This incident is closed.'}
            </p>
          )}
          <ol className="m-0 grid list-none grid-cols-2 gap-2 p-0 md:grid-cols-5">
            {PHASES.map((p, idx) => {
              const isCurrent = currentPhase === p;
              const isPast = idx < currentPhaseIdx;
              return (
                <li key={p}>
                  <button
                    onClick={() => run(() => setPhase({ incidentId: incident.id, phase: idx }))}
                    disabled={!canChangePhase}
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
      )}

      {incident && (
        <Card className="p-5">
          <SectionTitle>Summary</SectionTitle>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => updateIncident({ incidentId: incident.id, summary, currentStatus }));
            }}
            className="space-y-5"
          >
            <Field label="What happened">
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                className="w-full"
                disabled={!canEditDocs}
              />
            </Field>
            <Field label="Current status">
              <textarea
                value={currentStatus}
                onChange={(e) => setCurrentStatus(e.target.value)}
                rows={2}
                className="w-full"
                disabled={!canEditDocs}
              />
            </Field>
            {canEditDocs && (
              <Button type="submit" variant="tonal" disabled={!summaryDirty}>
                Save summary
              </Button>
            )}
          </form>
        </Card>
      )}

      {activeOrg && (
        <Card className="p-5">
          <SectionTitle trailing={activeOrg.name}>Activate a new incident</SectionTitle>
          {!canActivate ? (
            <p className="m-0 type-body-medium text-on-surface-variant">Only the owner or IT lead can activate an incident.</p>
          ) : (
            <form onSubmit={handleActivate} className="space-y-5">
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
                <Field label="Severity">
                  <select value={severity} onChange={(e) => setSeverity(Number(e.target.value))} className="w-full">
                    {SEVERITIES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <p className="m-0 type-body-small text-on-surface-variant">
                Everyone on the company roster joins the war room and gets starter tasks for their role.
              </p>
              <Button type="submit" variant="danger" icon={<Siren />} disabled={!name.trim()}>
                Declare incident
              </Button>
            </form>
          )}
        </Card>
      )}
=======
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
>>>>>>> Stashed changes
    </div>
  );
};
