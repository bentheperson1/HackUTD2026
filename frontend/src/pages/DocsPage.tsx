import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { AuditLogEntry, IncidentPhase } from '../lib/types';
import { PHASES } from '../lib/constants';
import { useAppState } from '../lib/useAppState';
import { DataTable, Column } from '../components/DataTable';
import { Field } from '../components/Field';
import { Alert, Button, Card, FilterBar, FilterChip, PageHeader, titleCase } from '../components/ui';

export const DocsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const auditLogs = useAppState((s) => s.auditLogs);
  const [phaseNotes, setPhaseNotes] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<IncidentPhase>('detection');
  const [statusMessage, setStatusMessage] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

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
      setStatusMessage('Your note was added to the audit log.');
    }
  };

  // Group actions by their first word (PHASE_DOC_X -> PHASE, TASK_COMPLETED -> TASK)
  const groupOf = (a: string) => a.split('_')[0];
  const actionGroups = Object.entries(
    auditLogs.reduce<Record<string, number>>((acc, l) => ({ ...acc, [groupOf(l.action)]: (acc[groupOf(l.action)] || 0) + 1 }), {})
  ).sort((a, b) => b[1] - a[1]);
  const q = search.trim().toLowerCase();
  const visibleLogs = auditLogs.filter(
    (l) =>
      (actionFilter === 'all' || groupOf(l.action) === actionFilter) &&
      (!q || `${l.actor} ${l.action} ${l.details}`.toLowerCase().includes(q))
  );

  const auditColumns: Column<AuditLogEntry>[] = [
    {
      header: 'Time',
      render: (log) => <span className="font-mono text-xs whitespace-nowrap text-fg-muted">{new Date(log.timestamp).toLocaleString()}</span>,
    },
    {
      header: 'Who',
      render: (log) => <span className="whitespace-nowrap text-fg">{log.actor}</span>,
    },
    {
      header: 'Action',
      render: (log) => <span className="text-xs whitespace-nowrap text-fg-muted">{titleCase(log.action.toLowerCase())}</span>,
    },
    {
      header: 'Details',
      render: (log) => <span className="text-fg-muted">{log.details}</span>,
    },
  ];

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Record"
        title="Audit log"
        description="A permanent record of everything done during the incident. Outpost adds entries automatically, and you can add your own notes. Entries can't be changed or deleted."
      />

      {statusMessage && (
        <Alert tone="success" onDismiss={() => setStatusMessage('')}>
          {statusMessage}
        </Alert>
      )}

      <Card kind="form" title="Add a note">
        <form onSubmit={handleAddPhaseDoc} className="space-y-4">
          <Field label="Phase" htmlFor="doc-phase" className="md:max-w-xs">
            <select id="doc-phase" value={selectedPhase} onChange={(e) => setSelectedPhase(e.target.value as IncidentPhase)}>
              {PHASES.map((p) => (
                <option key={p} value={p}>
                  {titleCase(p)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="What happened" htmlFor="doc-notes">
            <textarea
              id="doc-notes"
              value={phaseNotes}
              onChange={(e) => setPhaseNotes(e.target.value)}
              placeholder="e.g. Found a ransom note on the front desk PC. Unplugged it."
              rows={3}
            />
          </Field>
          <Button type="submit" variant="primary" disabled={!phaseNotes.trim()}>
            Add note
          </Button>
        </form>
      </Card>

      <FilterBar
        right={
          <>
            <label htmlFor="audit-search" className="sr-only">
              Search entries
            </label>
            <input id="audit-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search entries" className="h-7 w-56 text-xs" />
          </>
        }
      >
        <FilterChip active={actionFilter === 'all'} onClick={() => setActionFilter('all')} count={auditLogs.length}>
          All
        </FilterChip>
        {actionGroups.map(([group, n]) => (
          <FilterChip key={group} active={actionFilter === group} onClick={() => setActionFilter(actionFilter === group ? 'all' : group)} count={n}>
            {titleCase(group.toLowerCase())}
          </FilterChip>
        ))}
      </FilterBar>

      <Card kind="table" title="Entries" description="Newest first" padded={false}>
        <DataTable bare columns={auditColumns} data={visibleLogs} rowKey={(l) => l.id} emptyMessage={auditLogs.length ? 'No entries match your search.' : 'No entries yet.'} />
      </Card>
    </div>
  );
};
