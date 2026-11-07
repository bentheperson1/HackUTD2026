import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { ScopeItem, ScopeStatus } from '../lib/types';
import { DataTable, Column } from '../components/DataTable';
import { Field } from '../components/Field';

const SCOPE_STATUSES: { value: ScopeStatus; label: string }[] = [
  { value: 'unknown', label: 'Unknown / Under Investigation' },
  { value: 'locked', label: 'Locked / Encrypted' },
  { value: 'exfiltrated', label: 'Exfiltrated / Leaked' },
  { value: 'restored', label: 'Restored / Clean' },
];

export const ScopePage: React.FC = () => {
  const { currentUser } = useAuth();
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>(store.getState().scopeItems);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<ScopeStatus>('unknown');
  const [affectedStates, setAffectedStates] = useState('TX, CA');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return store.subscribe((state) => {
      setScopeItems(state.scopeItems);
    });
  }, []);

  const handleAddScopeItem = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!category.trim()) {
      setError('Data Category is required');
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
      render: (item) => <strong>{item.category}</strong>,
    },
    {
      header: 'Current Compromise Status',
      render: (item) => (
        <div>
          <select
            value={item.status}
            onChange={(e) => handleUpdateStatus(item, e.target.value as ScopeStatus)}
            style={{ fontWeight: 'bold' }}
          >
            {SCOPE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      ),
    },
    {
      header: 'Affected US States',
      render: (item) => item.affected_states.join(', ') || 'None specified',
    },
    {
      header: 'Triage Notes',
      render: (item) => item.notes || '—',
    },
    {
      header: 'Last Updated',
      render: (item) => new Date(item.updated_at).toLocaleTimeString(),
    },
  ];

  return (
    <div>
      <h3>Scope Definitions &amp; Asset Exposure</h3>
      <p>
        Catalog affected databases, repositories, and categories of compromised or encrypted records.
        Data entered here directly powers the statutory breach-notification countdown engine.
      </p>

      {error && <div style={{ color: 'red', fontWeight: 'bold', marginBottom: '10px' }}>Error: {error}</div>}

      <div style={{ marginBottom: '24px' }}>
        <h4>Impacted Data &amp; Systems Catalog</h4>
        <DataTable columns={columns} data={scopeItems} emptyMessage="No scope items recorded." />
      </div>

      <fieldset style={{ padding: '16px' }}>
        <legend><strong>Add Scope Definition Item</strong></legend>
        <form onSubmit={handleAddScopeItem}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Data Category / Asset Name" help="e.g. Employee Payroll, Patient Medical Charts, Active Directory">
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Data Category"
                style={{ width: '100%', padding: '6px' }}
              />
            </Field>

            <Field label="Compromise Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ScopeStatus)}
                style={{ width: '100%', padding: '6px' }}
              >
                {SCOPE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Potentially Affected States (comma-separated)" help="e.g. TX, CA, NY">
              <input
                type="text"
                value={affectedStates}
                onChange={(e) => setAffectedStates(e.target.value)}
                style={{ width: '100%', padding: '6px' }}
              />
            </Field>

            <Field label="Forensic Observations / Volume of Records">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. ~12,000 records, backup verified unencrypted"
                style={{ width: '100%', padding: '6px' }}
              />
            </Field>
          </div>

          <button type="submit" style={{ padding: '8px 16px', fontWeight: 'bold', marginTop: '12px' }}>
            Record Scope Item
          </button>
        </form>
      </fieldset>
    </div>
  );
};

