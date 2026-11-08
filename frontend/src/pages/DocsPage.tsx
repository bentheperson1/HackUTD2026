<<<<<<< Updated upstream
import React, { useState } from 'react';
import { useReducer, useTable } from 'spacetimedb/react';
import { reducers, tables } from '../module_bindings';
import type { TimelineEntry } from '../module_bindings/types';
import { useAuth } from '../lib/authContext';
import { IncidentPhase } from '../lib/types';
import { PHASES } from '../lib/constants';
import { errorMessage, phaseName, toDate } from '../lib/live';
=======
import React from 'react';
import { useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import type { TimelineEntry } from '../module_bindings/types';
import { useAuth } from '../lib/authContext';
import { toDate } from '../lib/live';
>>>>>>> Stashed changes
import { DataTable, Column } from '../components/DataTable';
import { SectionTitle } from '../components/Card';
import { Chip } from '../components/Chip';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';
import { Lock } from 'lucide-react';

export const DocsPage: React.FC = () => {
<<<<<<< Updated upstream
  const { activeIncident, incidentRole } = useAuth();
  const [users] = useTable(tables.user);
  const [allTimeline] = useTable(tables.timelineEntry);
  const logAction = useReducer(reducers.logAction);
  const [phaseNotes, setPhaseNotes] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<IncidentPhase | ''>('');
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
=======
  const { activeIncident } = useAuth();
  const [users] = useTable(tables.user);
  const [allTimeline] = useTable(tables.timelineEntry);
>>>>>>> Stashed changes

  // The backend writes a timeline_entry for every action, so it doubles as the audit log
  const auditLogs = allTimeline
    .filter((t) => t.incidentId === activeIncident?.id)
    .sort((a, b) => Number(b.createdAt.microsSinceUnixEpoch - a.createdAt.microsSinceUnixEpoch));

<<<<<<< Updated upstream
  const phase = selectedPhase || (activeIncident ? phaseName(activeIncident.phase) : PHASES[0]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIncident || !phaseNotes.trim()) return;
    setError(null);
    try {
      await logAction({ incidentId: activeIncident.id, action: `[${phase.toUpperCase()}] ${phaseNotes}` });
      setPhaseNotes('');
      setStatusMessage('Note added to the audit log.');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

=======
>>>>>>> Stashed changes
  const auditColumns: Column<TimelineEntry>[] = [
    {
      header: 'Time',
      render: (log) => (
        <span className="whitespace-nowrap font-mono type-body-small text-on-surface-variant">
          {toDate(log.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'By',
      render: (log) => (
        <span className="whitespace-nowrap">
<<<<<<< Updated upstream
          {users.find((u) => u.id.isEqual(log.author))?.displayName ?? 'System'}
=======
          {users.find((u) => u.id.isEqual(log.author))?.displayName ?? 'Unknown'}
>>>>>>> Stashed changes
        </span>
      ),
    },
    {
      header: 'Action',
      render: (log) => log.action,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Audit log"
        description="Timestamped record of everything done during the incident, for insurers, counsel and regulators."
        actions={
          <Chip icon={<Lock />} title="There is no edit or delete reducer for timeline entries">
            Append-only
          </Chip>
        }
      />

<<<<<<< Updated upstream
      {statusMessage && <Notice tone="success">{statusMessage}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {!activeIncident && <Notice>You're not part of any incident yet.</Notice>}

      {activeIncident && incidentRole && (
        <Card className="p-5">
          <SectionTitle>Add a note</SectionTitle>
          <form onSubmit={handleAddNote} className="space-y-5">
            <Field label="Phase" className="md:max-w-xs">
              <select
                value={phase}
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
                maxLength={480}
              />
            </Field>

            <Button type="submit" disabled={!phaseNotes.trim()}>
              Add to log
            </Button>
          </form>
        </Card>
      )}
=======
      {/* TODO: needs an AddNote reducer in the backend to bring back the "Add a note" form */}
      {!activeIncident && <Notice>You're not part of any incident yet.</Notice>}
>>>>>>> Stashed changes

      <section>
        <SectionTitle trailing={`${auditLogs.length} entries`}>Entries</SectionTitle>
        <DataTable columns={auditColumns} data={auditLogs} emptyMessage="No entries yet." />
      </section>
    </div>
  );
};
