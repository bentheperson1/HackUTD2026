import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { Incident, IncidentPhase } from '../lib/types';
import { PHASES } from '../lib/constants';

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
    if (confirm('Are you sure you want to mark the incident as resolved and closed?')) {
      const res = store.setIncidentStatus(currentUser.name, 'closed');
      if (!res.success) setError(res.error || 'Failed to close incident');
    }
  };

  const handlePhaseChange = (phase: IncidentPhase) => {
    const res = store.setIncidentPhase(currentUser.name, phase);
    if (!res.success) setError(res.error || 'Failed to update phase');
  };

  const isActive = incident.status === 'active';

  return (
    <div>
      <h3>Incident Status &amp; Command Trigger</h3>
      <p>
        The central kill-switch and phase coordinator. Activating an incident automatically alerts all pre-rostered roles,
        provisions the isolated war room, and locks down the immutable crisis timeline.
      </p>

      {error && <div style={{ color: 'red', fontWeight: 'bold', marginBottom: '10px' }}>Error: {error}</div>}

      <div style={{ border: '2px solid black', padding: '16px', marginBottom: '24px', backgroundColor: isActive ? '#ffebee' : '#f9f9f9' }}>
        <h4>Current Incident Status: <span style={{ textTransform: 'uppercase', color: isActive ? 'red' : 'inherit' }}>{incident.status}</span></h4>
        <div><strong>Current Phase:</strong> <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{incident.phase}</span></div>
        <div><strong>Started At:</strong> {incident.started_at ? new Date(incident.started_at).toLocaleString() : 'N/A'}</div>
        <div><strong>Closed At:</strong> {incident.closed_at ? new Date(incident.closed_at).toLocaleString() : 'N/A'}</div>

        <div style={{ marginTop: '16px', display: 'flex', gap: '16px' }}>
          {!isActive ? (
            <button
              onClick={handleActivate}
              style={{
                backgroundColor: '#d32f2f',
                color: 'white',
                padding: '12px 24px',
                fontSize: '1.1em',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              🚨 ACTIVATE INCIDENT
            </button>
          ) : (
            <button
              onClick={handleClose}
              style={{
                backgroundColor: '#388e3c',
                color: 'white',
                padding: '12px 24px',
                fontSize: '1.1em',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              ✓ CLOSE / RESOLVE INCIDENT
            </button>
          )}
        </div>
      </div>

      <fieldset style={{ padding: '16px' }}>
        <legend><strong>Incident Phase Progression</strong></legend>
        <p>Transition the response through NIST / CISA incident response stages:</p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {PHASES.map((p) => {
            const isCurrent = incident.phase === p;
            return (
              <button
                key={p}
                onClick={() => handlePhaseChange(p)}
                disabled={!isActive}
                style={{
                  padding: '10px 16px',
                  fontWeight: isCurrent ? 'bold' : 'normal',
                  backgroundColor: isCurrent ? '#000' : '#eee',
                  color: isCurrent ? '#fff' : '#000',
                  border: '1px solid black',
                  cursor: isActive ? 'pointer' : 'not-allowed',
                }}
              >
                {p.toUpperCase()} {isCurrent && '✓ (Active Phase)'}
              </button>
            );
          })}
        </div>
        {!isActive && <small style={{ display: 'block', marginTop: '8px', color: '#666' }}>* Activate incident to change lifecycle phases.</small>}
      </fieldset>
    </div>
  );
};

