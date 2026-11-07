import React, { useState, useEffect } from 'react';
import { store } from '../lib/store';
import { STATE_BREACH_RULES } from '../lib/constants';
import { ScopeItem } from '../lib/types';
import { DataTable, Column } from '../components/DataTable';

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

  // Compute triggered rules based on scope records
  const triggeredRules: TriggeredRule[] = [];

  const baseDate = incidentStartedAt ? new Date(incidentStartedAt) : new Date();

  scopeItems.forEach((item) => {
    // Only items that are exfiltrated or locked or unknown trigger notifications
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

  const columns: Column<TriggeredRule>[] = [
    {
      header: 'State',
      render: (r) => <strong style={{ fontSize: '1.2em' }}>{r.state}</strong>,
    },
    {
      header: 'Governing Statute',
      render: (r) => <div><strong>{r.statute}</strong></div>,
    },
    {
      header: 'Statutory Authority',
      render: (r) => r.authority,
    },
    {
      header: 'Triggering Scope Category',
      render: (r) => (
        <span>
          {r.triggerCategory} (<code>{r.status}</code>)
        </span>
      ),
    },
    {
      header: 'Statutory Window',
      render: (r) => `${r.deadlineDays} calendar days`,
    },
    {
      header: 'Countdown Deadline',
      render: (r) => (
        <div style={{ color: r.daysRemaining <= 10 ? 'red' : 'green', fontWeight: 'bold' }}>
          ⏳ {r.daysRemaining} days remaining
        </div>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          border: '2px solid #e65100',
          backgroundColor: '#fff3e0',
          padding: '12px',
          marginBottom: '20px',
        }}
      >
        <h4 style={{ margin: '0 0 6px 0', color: '#e65100' }}>⚠️ Mandatory Legal Disclaimer</h4>
        <p style={{ margin: 0, fontWeight: 'bold' }}>
          Guidance for counsel to review, not legal advice.
        </p>
        <small>
          Notification timelines and triggers are determined by jurisdictional state statutes and privacy regulations.
          Final notice obligations and filings must be verified and executed by outside legal counsel.
        </small>
      </div>

      <h3>Statutory Breach-Notification Countdown Engine</h3>
      <p>
        Calculated dynamically from scope records (TX, CA, NY). Identifies applicable state laws, notice windows,
        and statutory reporting bodies once compromise or exfiltration is suspected.
      </p>

      <DataTable
        columns={columns}
        data={triggeredRules}
        emptyMessage="No breach notification triggers active. Add affected states in the Scope tab to evaluate."
      />
    </div>
  );
};
