import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { AuditLogEntry, IncidentPhase } from '../lib/types';
import { PHASES } from '../lib/constants';
import { DataTable, Column } from '../components/DataTable';
import { Field } from '../components/Field';

export const DocsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(store.getState().auditLogs);
  const [phaseNotes, setPhaseNotes] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<IncidentPhase>('detection');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    return store.subscribe((state) => {
      setAuditLogs(state.auditLogs);
    });
  }, []);

  const handleAddPhaseDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phaseNotes.trim()) return;
    const res = store.recordAuditLog(
      currentUser.name,
      `PHASE_DOC_${selectedPhase.toUpperCase()}`,
      `[${selectedPhase.toUpperCase()}] ${phaseNotes}`
    );
    if (res.success) {
      setPhaseNotes('');
      setStatusMessage('Documentation timestamped and appended to immutable audit log.');
    }
  };

  const auditColumns: Column<AuditLogEntry>[] = [
    {
      header: 'Timestamp (UTC / Local)',
      render: (log) => <span style={{ fontFamily: 'monospace' }}>{new Date(log.timestamp).toLocaleString()}</span>,
    },
    {
      header: 'Actor',
      render: (log) => <strong>{log.actor}</strong>,
    },
    {
      header: 'Action',
      render: (log) => (
        <code style={{ backgroundColor: '#eee', padding: '2px 4px', fontWeight: 'bold' }}>
          {log.action}
        </code>
      ),
    },
    {
      header: 'Details & Documentation',
      render: (log) => log.details,
    },
  ];

  return (
    <div>
      <h3>Incident Documentation &amp; Immutable Audit Log</h3>
      <p>
        Court-admissible and insurer-grade crisis records.
        <strong> Notice:</strong> The audit log is strictly <em>APPEND-ONLY</em>. No update or delete reducers exist on the backend.
      </p>

      {statusMessage && <div style={{ color: 'green', fontWeight: 'bold', marginBottom: '10px' }}>{statusMessage}</div>}

      <fieldset style={{ marginBottom: '24px', padding: '16px' }}>
        <legend><strong>Record Formal Phase Documentation</strong></legend>
        <form onSubmit={handleAddPhaseDoc}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '10px' }}>
            <Field label="Target Incident Phase">
              <select
                value={selectedPhase}
                onChange={(e) => setSelectedPhase(e.target.value as IncidentPhase)}
                style={{ padding: '6px' }}
              >
                {PHASES.map((p) => (
                  <option key={p} value={p}>
                    {p.toUpperCase()}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Documentation Entry (Forensics, Actions Taken, External Advisories)">
            <textarea
              value={phaseNotes}
              onChange={(e) => setPhaseNotes(e.target.value)}
              placeholder="e.g. 14:22 UTC: Ransomware payload reversed; identified ransom note demanding communication via Tox ID. No exfiltration markers discovered on backup repository."
              rows={4}
              style={{ width: '100%', padding: '8px' }}
            />
          </Field>

          <button type="submit" style={{ padding: '8px 16px', fontWeight: 'bold' }}>
            Commit to Append-Only Audit Log
          </button>
        </form>
      </fieldset>

      <div>
        <h4>Immutable Audit Trail (Read-Only)</h4>
        <DataTable columns={auditColumns} data={auditLogs} emptyMessage="No audit logs recorded yet." />
      </div>
    </div>
  );
};
