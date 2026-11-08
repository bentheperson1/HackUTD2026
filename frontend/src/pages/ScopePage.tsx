import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { ScopeItem, ScopeStatus } from '../lib/types';
import { useAppState } from '../lib/useAppState';
import { DataTable, Column } from '../components/DataTable';
import { Field } from '../components/Field';
import { SCOPE_STATUS_META, SCOPE_SEGMENT_CLASS } from '../components/ScopeStatusBadge';
import { StackedBar } from '../components/charts';
import { Alert, Badge, Button, Card, FilterBar, FilterChip, PageHeader, Stat, StatRow } from '../components/ui';

const STATUS_ORDER: ScopeStatus[] = ['unknown', 'locked', 'exfiltrated', 'restored'];

// The dropdown carries the status color itself, so there is no separate badge
const STATUS_SELECT_TONE: Record<ScopeStatus, string> = {
  exfiltrated: 'text-breach-text border-breach/50 bg-breach-soft',
  locked: 'text-fg',
  unknown: 'text-fg-muted',
  restored: 'text-accent border-accent/40 bg-accent-soft',
};

export const ScopePage: React.FC = () => {
  const { currentUser } = useAuth();
  const scopeItems = useAppState((s) => s.scopeItems);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<ScopeStatus>('unknown');
  const [affectedStates, setAffectedStates] = useState('TX, CA');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ category: string; states: string[] } | null>(null);
  const [statusFilter, setStatusFilter] = useState<ScopeStatus | 'all'>('all');

  const handleAddScopeItem = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!category.trim()) {
      setError('Describe the data that was affected.');
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
    if (!res.success) setError(res.error || 'Failed to update scope status');
  };

  const allStates = [...new Set(scopeItems.flatMap((s) => s.affected_states))];
  const visibleItems = statusFilter === 'all' ? scopeItems : scopeItems.filter((i) => i.status === statusFilter);
  const exfiltrated = scopeItems.filter((s) => s.status === 'exfiltrated').length;

  const columns: Column<ScopeItem>[] = [
    {
      header: 'Data',
      render: (item) => (
        <div className="min-w-[200px]">
          <div className="font-medium text-fg">{item.category}</div>
          {item.notes && <div className="mt-0.5 text-xs text-fg-subtle">{item.notes}</div>}
        </div>
      ),
    },
    {
      header: 'Status',
      render: (item) => (
        <div>
          <label className="sr-only" htmlFor={`status-${item.id}`}>
            Change status for {item.category}
          </label>
          <select
            id={`status-${item.id}`}
            value={item.status}
            onChange={(e) => handleUpdateStatus(item, e.target.value as ScopeStatus)}
            className={`h-8 w-36 py-0 text-xs font-medium ${STATUS_SELECT_TONE[item.status]}`}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {SCOPE_STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>
      ),
    },
    {
      header: 'States',
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.affected_states.map((st) => (
            <Badge key={st} mono>
              {st}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      header: 'Updated',
      className: 'text-right',
      render: (item) => (
        <span className="font-mono text-xs text-fg-subtle">
          {new Date(item.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Respond"
        title="Scope"
        description="What data was hit, what happened to it, and where affected people live."
      />

      {error && (
        <Alert tone="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successInfo && (
        <Alert
          tone="success"
          title={`Added "${successInfo.category}"`}
          onDismiss={() => setSuccessInfo(null)}
        >
          Affected states: {successInfo.states.join(', ') || 'none'}.
        </Alert>
      )}

      <StatRow>
        <Stat label="Data types affected" value={scopeItems.length} />
        <Stat label="Exfiltrated" value={exfiltrated} tone={exfiltrated > 0 ? 'breach' : 'neutral'} />
        <Stat label="Restored" value={scopeItems.filter((s) => s.status === 'restored').length} tone="accent" />
        <Stat label="States involved" value={allStates.length ? allStates.join(' · ') : 'None'} mono />
      </StatRow>

      <Card kind="chart" title="Status breakdown" description="Share of affected data types by status">
        <StackedBar
          ariaLabel="Affected data by status"
          segments={STATUS_ORDER.map((st) => ({
            label: SCOPE_STATUS_META[st].label,
            value: scopeItems.filter((i) => i.status === st).length,
            className: SCOPE_SEGMENT_CLASS[st],
          }))}
        />
      </Card>

      <FilterBar>
        <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} count={scopeItems.length}>
          All
        </FilterChip>
        {STATUS_ORDER.map((st) => (
          <FilterChip
            key={st}
            active={statusFilter === st}
            onClick={() => setStatusFilter(statusFilter === st ? 'all' : st)}
            count={scopeItems.filter((i) => i.status === st).length}
          >
            {SCOPE_STATUS_META[st].label}
          </FilterChip>
        ))}
      </FilterBar>

      <Card kind="table" title="Affected data" description="scope_items" padded={false}>
        <DataTable bare columns={columns} data={visibleItems} rowKey={(i) => i.id} emptyMessage={statusFilter === 'all' ? 'No affected data recorded yet. Add the first item below.' : 'Nothing with this status.'} />
      </Card>

      <Card kind="form" title="Add affected data">
        <form onSubmit={handleAddScopeItem} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="What data?" htmlFor="scope-category">
              <input id="scope-category" type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Customer billing records" />
            </Field>
            <Field label="Status" htmlFor="scope-status">
              <select id="scope-status" value={status} onChange={(e) => setStatus(e.target.value as ScopeStatus)}>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {SCOPE_STATUS_META[s].long}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="States where affected people live" htmlFor="scope-states" help="Two-letter codes, separated by commas.">
              <input id="scope-states" type="text" value={affectedStates} onChange={(e) => setAffectedStates(e.target.value)} placeholder="TX, CA, NY" />
            </Field>
            <Field label="Notes (optional)" htmlFor="scope-notes" help="Record count, how it was found, anything useful.">
              <input id="scope-notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. About 14,000 records" />
            </Field>
          </div>
          <Button type="submit" variant="primary">
            Add to scope
          </Button>
        </form>
      </Card>
    </div>
  );
};
