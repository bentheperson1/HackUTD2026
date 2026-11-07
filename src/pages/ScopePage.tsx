import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { ScopeItem, ScopeStatus } from '../lib/types';
import { DataTable, Column } from '../components/DataTable';
import { Database, Plus, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

const SCOPE_STATUSES: { value: ScopeStatus; label: string }[] = [
  { value: 'unknown', label: 'Under Forensic Investigation' },
  { value: 'locked', label: 'Encrypted / Locked (.lock)' },
  { value: 'exfiltrated', label: 'Exfiltrated / Dark Web Proof' },
  { value: 'restored', label: 'Restored & Sanitized' },
];

export const ScopePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>(store.getState().scopeItems);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<ScopeStatus>('unknown');
  const [affectedStates, setAffectedStates] = useState('TX, CA');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ category: string; states: string[] } | null>(null);

  useEffect(() => {
    return store.subscribe((state) => {
      setScopeItems(state.scopeItems);
    });
  }, []);

  const handleAddScopeItem = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!category.trim()) {
      setError('Data Asset / Category is required');
      return;
    }

    const stateList = affectedStates
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);

    const res = store.addScopeItem(currentUser.name, category, status, stateList, notes);
    if (!res.success) {
      setError(res.error || 'Failed to add scope item');
    } else {
      setSuccessInfo({ category, states: stateList });
      setCategory('');
      setNotes('');
    }
  };

  const handleUpdateStatus = (item: ScopeItem, newStatus: ScopeStatus) => {
    const res = store.updateScopeItem(currentUser.name, item.id, newStatus, item.notes);
    if (!res.success) {
      setError(res.error || 'Failed to update scope status');
    }
  };

  const columns: Column<ScopeItem>[] = [
    {
      header: 'Data Category / System Asset',
      render: (item) => (
        <div>
          <strong className="text-white text-sm block">{item.category}</strong>
          <span className="text-[11px] text-slate-400">ID: {item.id}</span>
        </div>
      ),
    },
    {
      header: 'Compromise Status',
      render: (item) => (
        <select
          value={item.status}
          onChange={(e) => handleUpdateStatus(item, e.target.value as ScopeStatus)}
          className="text-xs font-bold"
        >
          {SCOPE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      header: 'Affected States',
      render: (item) => (
        <div className="flex gap-1 flex-wrap">
          {item.affected_states.map((st) => (
            <span key={st} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold font-mono">
              {st}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: 'Triage Notes',
      render: (item) => <span className="text-xs text-slate-300">{item.notes || '—'}</span>,
    },
    {
      header: 'Updated',
      render: (item) => <span className="text-[11px] text-slate-400 font-mono">{new Date(item.updated_at).toLocaleTimeString()}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2 m-0">
            <Database className="w-5 h-5 text-hazard-yellow" />
            <span>Scope of Compromise &amp; Impacted Data</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 mb-0">
            Catalog affected databases, repositories, and customer records. Powers the statutory breach-notification countdown engine.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Error: {error}</span>
        </div>
      )}

      {successInfo && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border-2 border-emerald-500/80 text-emerald-200 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <strong className="text-white text-sm block">
                ✓ Cataloged "{successInfo.category}" into Scope!
              </strong>
              <span>
                Triggered notification laws for {successInfo.states.join(', ')}.
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/notify')}
            className="min-h-[40px] px-5 py-2 bg-hazard-yellow hover:bg-hazard-bright text-black font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-1.5 transition-all shrink-0"
          >
            <span>View Breach Deadlines Tab</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Catalog Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 m-0">Impacted Asset Directory</h3>
        <DataTable columns={columns} data={scopeItems} emptyMessage="No affected systems or data cataloged yet." />
      </div>

      {/* Add Form */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xl">
        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-hazard-yellow" />
          <span>Add Suspected Compromise Scope</span>
        </h4>

        <form onSubmit={handleAddScopeItem} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Data Category / System Asset
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Employee W-2s, Customer Billing Database"
                className="w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Compromise Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ScopeStatus)}
                className="w-full text-xs font-semibold"
              >
                {SCOPE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Potentially Affected US States (comma-separated)
              </label>
              <input
                type="text"
                value={affectedStates}
                onChange={(e) => setAffectedStates(e.target.value)}
                placeholder="e.g. TX, CA, NY"
                className="w-full text-xs"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Trigger state attorney general notification timelines.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Forensic Observations / Record Count
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Approx 14,000 records, backup drive unencrypted"
                className="w-full text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            className="min-h-[44px] px-6 bg-hazard-yellow hover:bg-hazard-bright text-black font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-hazard-yellow/20 transition-all flex items-center gap-2"
          >
            <span>Add to Scope Catalog</span>
          </button>
        </form>
      </div>
    </div>
  );
};
