import React from 'react';
import { useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import type { TimelineEntry } from '../module_bindings/types';
import { useAuth } from '../lib/authContext';
import { toDate } from '../lib/live';
import { DataTable, Column } from '../components/DataTable';
import { SectionTitle } from '../components/Card';
import { Chip } from '../components/Chip';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';
import { Lock } from 'lucide-react';

export const DocsPage: React.FC = () => {
  const { activeIncident } = useAuth();
  const [users] = useTable(tables.user);
  const [allTimeline] = useTable(tables.timelineEntry);

  // The backend writes a timeline_entry for every action, so it doubles as the audit log
  const auditLogs = allTimeline
    .filter((t) => t.incidentId === activeIncident?.id)
    .sort((a, b) => Number(b.createdAt.microsSinceUnixEpoch - a.createdAt.microsSinceUnixEpoch));

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
          {users.find((u) => u.id.isEqual(log.author))?.displayName ?? 'Unknown'}
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

      {/* TODO: needs an AddNote reducer in the backend to bring back the "Add a note" form */}
      {!activeIncident && <Notice>You're not part of any incident yet.</Notice>}

      <section>
        <SectionTitle trailing={`${auditLogs.length} entries`}>Entries</SectionTitle>
        <DataTable columns={auditColumns} data={auditLogs} emptyMessage="No entries yet." />
      </section>
    </div>
  );
};
