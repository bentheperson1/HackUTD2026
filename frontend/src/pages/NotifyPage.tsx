import React, { useState, useEffect } from 'react';
import { store } from '../lib/store';
import { STATE_BREACH_RULES } from '../lib/constants';
import { ScopeItem } from '../lib/types';
import { DataTable, Column } from '../components/DataTable';
import { Scale, AlertTriangle, Clock } from 'lucide-react';

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

  const columns: Column<TriggeredRule>[] = [
    {
      header: 'State',
      render: (r) => <span className="font-black text-base text-hazard-bright font-mono">{r.state}</span>,
    },
    {
      header: 'Governing Statute',
      render: (r) => <span className="font-bold text-white text-xs block">{r.statute}</span>,
    },
    {
      header: 'Statutory Authority',
      render: (r) => <span className="text-xs text-slate-300">{r.authority}</span>,
    },
    {
      header: 'Triggering Scope Item',
      render: (r) => (
        <span className="text-xs text-slate-200">
          {r.triggerCategory} (<code className="text-hazard-yellow">{r.status}</code>)
        </span>
      ),
    },
    {
      header: 'Notice Window',
      render: (r) => <span className="text-xs font-mono text-slate-300">{r.deadlineDays} calendar days</span>,
    },
    {
      header: 'Countdown Deadline',
      render: (r) => (
        <div className={`font-bold font-mono text-xs flex items-center gap-1.5 ${r.daysRemaining <= 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
          <Clock className="w-3.5 h-3.5" />
          <span>{r.daysRemaining} days remaining</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Legal Disclaimer Box */}
      <div className="bg-amber-950/20 border border-hazard-yellow/40 rounded-xl p-4 text-xs flex items-start gap-3 shadow-md">
        <AlertTriangle className="w-5 h-5 text-hazard-yellow shrink-0 mt-0.5" />
        <div>
          <strong className="text-white block font-bold text-sm mb-0.5">
            ⚠️ Guidance for Counsel to Review, Not Legal Advice
          </strong>
          <span className="text-slate-300">
            Statutory notification windows are triggered by jurisdictional state privacy statutes.
            Formal filings must be authorized and conducted under attorney-client privilege.
          </span>
        </div>
      </div>

      <div className="border-b border-border pb-4">
        <h2 className="text-xl font-black text-white flex items-center gap-2 m-0">
          <Scale className="w-5 h-5 text-hazard-yellow" />
          <span>Statutory Breach-Notification Countdown Engine</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1 mb-0">
          Computed dynamically from impacted scope records (TX, CA, NY). Monitors statutory notice deadlines and Attorney General portals.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 m-0">Active State Notice Clocks</h3>
        <DataTable
          columns={columns}
          data={triggeredRules}
          emptyMessage="No breach notification triggers active. Add affected states in the Scope tab to evaluate."
        />
      </div>
    </div>
  );
};
