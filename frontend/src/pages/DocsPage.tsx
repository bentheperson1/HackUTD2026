import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { AuditLogEntry, IncidentPhase } from '../lib/types';
import { PHASES } from '../lib/constants';
import { useAppState } from '../lib/useAppState';
import { DataTable, Column } from '../components/DataTable';
import { Field } from '../components/Field';
import { Alert, Badge, Button, Card, FilterBar, FilterChip, PageHeader, titleCase } from '../components/ui';

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
      setStatusMessage('Added to the audit log with a timestamp.');
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
      render: (log) => (
        <Badge mono className="text-[11px]">
          {log.action}
        </Badge>
      ),
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
        description="The permanent record for insurers and lawyers. Entries can be added but never edited or deleted."
        actions={
          <Badge tone="accent">
            <Lock className="h-3 w-3" />
            Append-only
          </Badge>
        }
      />

      {statusMessage && (
        <Alert tone="success" onDismiss={() => setStatusMessage('')}>
          {statusMessage}
        </Alert>
      )}

      <Card kind="form" title="Add an observation">
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
          <Field label="What happened" htmlFor="doc-notes" help="What was found, who was contacted, what evidence was secured.">
            <textarea
              id="doc-notes"
              value={phaseNotes}
              onChange={(e) => setPhaseNotes(e.target.value)}
              placeholder="e.g. 14:22 Ransom note found on DC-01. Memory image captured. Outbound firewall rules cut."
              rows={3}
            />
          </Field>
          <Button type="submit" variant="primary" disabled={!phaseNotes.trim()}>
            Add to audit log
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

      <Card kind="table" title="Entries" description="audit_log · newest first" padded={false}>
        <DataTable bare columns={auditColumns} data={visibleLogs} rowKey={(l) => l.id} emptyMessage={auditLogs.length ? 'No entries match.' : 'No entries yet.'} />
      </Card>
    </div>
  );
};
