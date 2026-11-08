import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { store } from '../lib/store';
import { STATE_BREACH_RULES } from '../lib/constants';
import { ScopeItem } from '../lib/types';
import { DataTable, Column } from '../components/DataTable';
import { Chip } from '../components/Chip';
import { SectionTitle } from '../components/Card';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';

interface TriggeredRule {
  state: string;
  statute: string;
  authority: string;
  deadlineDays: number;
  daysRemaining: number;
  triggerCategory: string;
  status: string;
}

export const NotifyPage: React.FC = () => {
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>(store.getState().scopeItems);
  const incidentStartedAt = store.getState().incident.started_at;

  useEffect(() => {
    return store.subscribe((state) => {
      setScopeItems(state.scopeItems);
    });
  }, []);

  const triggeredRules: TriggeredRule[] = [];
  const baseDate = incidentStartedAt ? new Date(incidentStartedAt) : new Date();

  scopeItems.forEach((item) => {
    item.affected_states.forEach((stateCode) => {
      const rule = STATE_BREACH_RULES[stateCode];
      if (rule) {
        const elapsedDays = Math.floor((Date.now() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(0, rule.deadline_days - elapsedDays);

        triggeredRules.push({
          state: rule.state,
          statute: rule.name,
          authority: rule.authority,
          deadlineDays: rule.deadline_days,
          daysRemaining,
          triggerCategory: item.category,
          status: item.status,
        });
      }
    });
  });

  // Soonest deadline first
  triggeredRules.sort((a, b) => a.daysRemaining - b.daysRemaining);

  const columns: Column<TriggeredRule>[] = [
    {
      header: 'Due in',
      render: (r) => (
        <Chip tone={r.daysRemaining <= 10 ? 'error' : 'neutral'}>
          {r.daysRemaining} {r.daysRemaining === 1 ? 'day' : 'days'}
        </Chip>
      ),
    },
    {
      header: 'State',
      render: (r) => <span className="font-mono type-title-small">{r.state}</span>,
    },
    {
      header: 'Law',
      render: (r) => (
        <div>
          <div>{r.statute}</div>
          <div className="type-body-small text-on-surface-variant">{r.deadlineDays}-day window</div>
        </div>
      ),
    },
    {
      header: 'Notify',
      render: (r) => <span className="text-on-surface-variant">{r.authority}</span>,
    },
    {
      header: 'Triggered by',
      render: (r) => (
        <span className="text-on-surface-variant">
          {r.triggerCategory} <span className="capitalize">({r.status})</span>
        </span>
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

      <section>
        <SectionTitle trailing={`${triggeredRules.length} active`}>Deadlines</SectionTitle>
        {triggeredRules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-outline-variant px-6 py-10 text-center type-body-medium text-on-surface-variant">
            No deadlines yet. Add states to an item on the{' '}
            <Link to="/scope" className="text-primary">
              Affected data
            </Link>{' '}
            page.
          </div>
        ) : (
          <DataTable columns={columns} data={triggeredRules} />
        )}
      </section>
    </div>
  );
};
