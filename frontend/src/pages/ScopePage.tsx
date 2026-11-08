import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { ScopeItem, ScopeStatus } from '../lib/types';
import { DataTable, Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Card, SectionTitle } from '../components/Card';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';
import { ArrowRight } from 'lucide-react';

const SCOPE_STATUSES: { value: ScopeStatus; label: string }[] = [
  { value: 'unknown', label: 'Under investigation' },
  { value: 'locked', label: 'Encrypted' },
  { value: 'exfiltrated', label: 'Exfiltrated' },
  { value: 'restored', label: 'Restored' },
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
      setError('Enter the system or kind of data affected.');
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
      header: 'System or data',
      render: (item) => item.category,
    },
    {
      header: 'Status',
      render: (item) => (
        <select
          aria-label={`Status for ${item.category}`}
          value={item.status}
          onChange={(e) => handleUpdateStatus(item, e.target.value as ScopeStatus)}
          className={`h-9 py-0 ${item.status === 'exfiltrated' ? 'border-error text-error' : ''}`}
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
      header: 'States',
      render: (item) => (
        <span className="font-mono text-on-surface-variant">{item.affected_states.join(', ') || '—'}</span>
      ),
    },
    {
      header: 'Notes',
      render: (item) => <span className="text-on-surface-variant">{item.notes || '—'}</span>,
    },
    {
      header: 'Updated',
      render: (item) => (
        <span className="whitespace-nowrap text-on-surface-variant">
          {new Date(item.updated_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Affected data"
        description="Every system or data set that may be compromised, and which states its records come from. This drives the notification deadlines."
      />

      {error && <Notice tone="error">{error}</Notice>}

      {successInfo && (
        <Notice
          tone="success"
          title={`Added ${successInfo.category}`}
          action={
            <Button variant="text" onClick={() => navigate('/notify')} className="!text-on-tertiary-container">
              View deadlines <ArrowRight className="h-4 w-4" />
            </Button>
          }
        >
          {successInfo.states.length > 0
            ? `Notification rules now apply for ${successInfo.states.join(', ')}.`
            : 'No states were listed, so no notification rules apply yet.'}
        </Notice>
      )}

      <section>
        <SectionTitle trailing={`${scopeItems.length} items`}>Inventory</SectionTitle>
        <DataTable columns={columns} data={scopeItems} emptyMessage="Nothing logged yet." />
      </section>

      <Card className="p-5">
        <SectionTitle>Log affected data</SectionTitle>
        <form onSubmit={handleAddScopeItem} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="System or data">
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Customer billing database"
                className="w-full"
              />
            </Field>

            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as ScopeStatus)} className="w-full">
                {SCOPE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Affected states" help="Comma-separated, e.g. TX, CA, NY">
              <input
                type="text"
                value={affectedStates}
                onChange={(e) => setAffectedStates(e.target.value)}
                className="w-full font-mono"
              />
            </Field>

            <Field label="Notes" help="Record counts, encryption, anything forensics found">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="About 14,000 records, backup drive unencrypted"
                className="w-full"
              />
            </Field>
          </div>

          <Button type="submit">Add to inventory</Button>
        </form>
      </Card>
    </div>
  );
};
