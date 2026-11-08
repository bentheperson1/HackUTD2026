import React, { useState, useEffect } from 'react';
import { store, AppState } from '../lib/store';
import { DataTable, Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Card, SectionTitle } from '../components/Card';
import { Chip } from '../components/Chip';
import { PageHeader } from '../components/PageHeader';
import { ReducerCallLog } from '../lib/types';
import { tables, reducers } from '../module_bindings';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { RotateCcw } from 'lucide-react';

export const DebugPage: React.FC = () => {
  const [state, setState] = useState<AppState>(store.getState());
  const [selectedTable, setSelectedTable] = useState<keyof AppState>('members');
  const [personName, setPersonName] = useState('');

  // Live SpacetimeDB hook connection
  const conn = useSpacetimeDB();
  const dbConnected = conn?.isActive ?? false;
  const [people] = useTable(tables.person);
  const addReducer = useReducer(reducers.add);

  useEffect(() => {
    return store.subscribe((nextState) => {
      setState(nextState);
    });
  }, []);

  const handleReset = () => {
    if (confirm('Reset store back to default demo state?')) {
      store.resetToDefaults();
    }
  };

  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) return;
    try {
      addReducer({ name: personName });
      setPersonName('');
    } catch (err) {
      console.error(err);
    }
  };

  const reducerLogColumns: Column<ReducerCallLog>[] = [
    {
      header: 'Time',
      render: (l) => (
        <span className="whitespace-nowrap font-mono type-body-small text-on-surface-variant">
          {new Date(l.timestamp).toLocaleTimeString()}
        </span>
      ),
    },
    {
      header: 'Reducer',
      render: (l) => <code className="font-mono">{l.reducer_name}</code>,
    },
    {
      header: 'Status',
      render: (l) => <Chip tone={l.status === 'success' ? 'success' : 'error'}>{l.status}</Chip>,
    },
    {
      header: 'Args',
      render: (l) => (
        <div>
          <pre className="m-0 whitespace-pre-wrap break-all font-mono type-body-small text-on-surface-variant">
            {JSON.stringify(l.args)}
          </pre>
          {l.error_message && <div className="mt-0.5 type-body-small text-error">{l.error_message}</div>}
        </div>
      ),
    },
  ];

  const tableKeys: (keyof AppState)[] = [
    'org',
    'members',
    'incident',
    'messages',
    'tasks',
    'auditLogs',
    'scopeItems',
    'reportTemplates',
    'reportDrafts',
    'drillSession',
    'drillPlayers',
    'drillEvents',
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Diagnostics"
        description="Connection state, reducer calls and the raw local store."
        actions={
          <Button variant="outlined" icon={<RotateCcw />} onClick={handleReset}>
            Reset demo data
          </Button>
        }
      />

      <Card className="space-y-4 p-5">
        <SectionTitle>
          SpacetimeDB <code className="font-mono">person</code> table
        </SectionTitle>

        <dl className="m-0 space-y-1 type-body-medium">
          <div className="flex gap-2">
            <dt className="text-on-surface-variant">Status</dt>
            <dd className="m-0">{dbConnected ? 'Connected to Maincloud' : 'Connecting…'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-on-surface-variant">Identity</dt>
            <dd className="m-0 break-all font-mono type-body-small">
              {conn?.identity ? conn.identity.toHexString() : 'Pending'}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2">
          {people.length === 0 ? (
            <span className="type-body-medium text-on-surface-variant">No rows yet.</span>
          ) : (
            people.map((p, idx) => <Chip key={idx}>{p.name}</Chip>)
          )}
        </div>

        <form onSubmit={handleAddPerson} className="flex gap-2">
          <input
            type="text"
            aria-label="Person name"
            placeholder="Name to insert"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            className="h-10 flex-1 py-0"
            disabled={!dbConnected}
          />
          <Button type="submit" variant="tonal" disabled={!dbConnected || !personName.trim()}>
            Call add
          </Button>
        </form>
      </Card>

      <section>
        <SectionTitle trailing={`${state.reducerLogs.length} calls`}>Reducer calls</SectionTitle>
        <DataTable
          columns={reducerLogColumns}
          data={state.reducerLogs}
          emptyMessage="No reducer calls yet. Do anything elsewhere in the app and it will show up here."
        />
      </section>

      <section>
        <SectionTitle>Local store</SectionTitle>
        <div className="mb-3 flex flex-wrap gap-2">
          {tableKeys.map((key) => {
            const selected = selectedTable === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedTable(key)}
                className={`state-layer inline-flex h-8 items-center rounded-lg px-3 font-mono type-body-small ${
                  selected
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'border border-outline-variant text-on-surface-variant'
                }`}
              >
                {key}
              </button>
            );
          })}
        </div>
        <pre className="max-h-[360px] overflow-auto rounded-xl bg-surface-container-lowest p-4 font-mono type-body-small text-on-surface-variant">
          {JSON.stringify(state[selectedTable], null, 2)}
        </pre>
      </section>
    </div>
  );
};
