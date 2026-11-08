import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { AuditLogEntry, IncidentPhase } from '../lib/types';
import { PHASES } from '../lib/constants';
import { DataTable, Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Card, SectionTitle } from '../components/Card';
import { Chip } from '../components/Chip';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';
import { Lock } from 'lucide-react';

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
      setStatusMessage('Note added to the audit log.');
    }
  };

  const auditColumns: Column<AuditLogEntry>[] = [
    {
      header: 'Time',
      render: (log) => (
        <span className="whitespace-nowrap font-mono type-body-small text-on-surface-variant">
          {new Date(log.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'By',
      render: (log) => <span className="whitespace-nowrap">{log.actor}</span>,
    },
    {
      header: 'Action',
      render: (log) => <code className="font-mono type-body-small text-on-surface-variant">{log.action}</code>,
    },
    {
      header: 'Details',
      render: (log) => log.details,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Audit log"
        description="Timestamped record of everything done during the incident, for insurers, counsel and regulators."
        actions={
          <Chip icon={<Lock />} title="There is no edit or delete reducer for audit entries">
            Append-only
          </Chip>
        }
      />

      {statusMessage && <Notice tone="success">{statusMessage}</Notice>}

      <Card className="p-5">
        <SectionTitle>Add a note</SectionTitle>
        <form onSubmit={handleAddPhaseDoc} className="space-y-5">
          <Field label="Phase" className="md:max-w-xs">
            <select
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value as IncidentPhase)}
              className="w-full capitalize"
            >
              {PHASES.map((p) => (
                <option key={p} value={p}>
                  {p[0].toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="What happened" help="What was found, who was contacted, what evidence was secured.">
            <textarea
              value={phaseNotes}
              onChange={(e) => setPhaseNotes(e.target.value)}
              placeholder="14:22 UTC: Ransom note asks for contact via Tox. Memory dump captured on DC-01."
              rows={3}
              className="w-full"
            />
          </Field>

          <Button type="submit" disabled={!phaseNotes.trim()}>
            Add to log
          </Button>
        </form>
      </Card>

      <section>
        <SectionTitle trailing={`${auditLogs.length} entries`}>Entries</SectionTitle>
        <DataTable columns={auditColumns} data={auditLogs} emptyMessage="No entries yet." />
      </section>
    </div>
  );
};
