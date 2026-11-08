import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReducer, useTable } from 'spacetimedb/react';
import { reducers, tables } from '../module_bindings';
import type { NotificationObligation } from '../module_bindings/types';
import { useAuth } from '../lib/authContext';
import { errorMessage, toDate } from '../lib/live';
import { DataTable, Column } from '../components/DataTable';
import { Chip } from '../components/Chip';
import { SectionTitle } from '../components/Card';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';

// Matches CanMarkNotices in Helpers.cs, and the statuses SetObligationStatus accepts
const CAN_MARK_NOTICES = ['Owner', 'Legal', 'Counsel'];
const OBLIGATION_STATUSES = [
  { value: 'open', label: 'Not sent' },
  { value: 'sent', label: 'Sent' },
  { value: 'not_required', label: 'Not required' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export const NotifyPage: React.FC = () => {
  const { activeIncident, incidentRole } = useAuth();
  const [allObligations] = useTable(tables.notificationObligation);
  const [rules] = useTable(tables.notificationRule);
  const setObligationStatus = useReducer(reducers.setObligationStatus);
  const [error, setError] = useState<string | null>(null);

  const canMark = !!incidentRole && CAN_MARK_NOTICES.includes(incidentRole);
  const daysLeft = (ob: NotificationObligation) =>
    ob.dueAt ? Math.ceil((toDate(ob.dueAt).getTime() - Date.now()) / DAY_MS) : null;

  // The server recomputes these whenever scope items change; open ones first, soonest deadline first
  const obligations = allObligations
    .filter((ob) => ob.incidentId === activeIncident?.id)
    .sort((a, b) => {
      const open = Number(b.status === 'open') - Number(a.status === 'open');
      return open || (daysLeft(a) ?? Infinity) - (daysLeft(b) ?? Infinity);
    });

  const handleStatus = async (ob: NotificationObligation, status: string) => {
    setError(null);
    try {
      await setObligationStatus({ obligationId: ob.id, status });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const columns: Column<NotificationObligation>[] = [
    {
      header: 'Due in',
      render: (ob) => {
        const days = daysLeft(ob);
        if (ob.status !== 'open') return <Chip>Handled</Chip>;
        if (days === null) return <Chip>No fixed deadline</Chip>;
        return (
          <Chip tone={days <= 10 ? 'error' : 'neutral'}>
            {days <= 0 ? 'Overdue' : `${days} ${days === 1 ? 'day' : 'days'}`}
          </Chip>
        );
      },
    },
    {
      header: 'State',
      render: (ob) => <span className="font-mono type-title-small">{ob.state}</span>,
    },
    {
      header: 'Notify',
      render: (ob) => {
        const rule = rules.find((r) => r.state === ob.state);
        if (!rule) return '—';
        return (
          <div>
            <div className="text-on-surface-variant">{rule.regulatorNotice}</div>
            {rule.sourceUrl && (
              <a href={rule.sourceUrl} target="_blank" rel="noreferrer" className="type-body-small text-primary">
                Source
              </a>
            )}
          </div>
        );
      },
    },
    {
      header: 'Triggered by',
      render: (ob) => <span className="text-on-surface-variant">{ob.reason}</span>,
    },
    {
      header: 'Status',
      render: (ob) => (
        <select
          aria-label={`Status for ${ob.state}`}
          value={ob.status}
          disabled={!canMark}
          onChange={(e) => handleStatus(ob, e.target.value)}
          className="h-9 py-0"
        >
          {OBLIGATION_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notification deadlines"
        description="State breach-notice clocks, worked out from the states listed on affected data."
      />

      <Notice tone="warning" title="For counsel to review, not legal advice">
        Filings should go through your attorney so they stay under privilege.
      </Notice>

      {error && <Notice tone="error">{error}</Notice>}

      <section>
        <SectionTitle trailing={`${obligations.filter((o) => o.status === 'open').length} open`}>Deadlines</SectionTitle>
        {obligations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-outline-variant px-6 py-10 text-center type-body-medium text-on-surface-variant">
            No deadlines yet. Add states to an item on the{' '}
            <Link to="/scope" className="text-primary">
              Affected data
            </Link>{' '}
            page.
          </div>
        ) : (
          <DataTable columns={columns} data={obligations} />
        )}
      </section>
    </div>
  );
};
