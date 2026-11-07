import React, { useState, useEffect } from 'react';
import { store, AppState } from '../lib/store';
import { DataTable, Column } from '../components/DataTable';
import { ReducerCallLog } from '../lib/types';

export const DebugPage: React.FC = () => {
  const [state, setState] = useState<AppState>(store.getState());
  const [selectedTable, setSelectedTable] = useState<keyof AppState>('members');

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

  const reducerLogColumns: Column<ReducerCallLog>[] = [
    {
      header: 'Time',
      render: (l) => <code>{new Date(l.timestamp).toLocaleTimeString()}</code>,
    },
    {
      header: 'Reducer Name',
      render: (l) => <strong>{l.reducer_name}</strong>,
    },
    {
      header: 'Status',
      render: (l) => (
        <span style={{ color: l.status === 'success' ? 'green' : 'red', fontWeight: 'bold' }}>
          {l.status.toUpperCase()}
        </span>
      ),
    },
    {
      header: 'Arguments & Result',
      render: (l) => (
        <div>
          <pre style={{ margin: 0, fontSize: '0.85em' }}>{JSON.stringify(l.args)}</pre>
          {l.error_message && <div style={{ color: 'red', fontWeight: 'bold' }}>{l.error_message}</div>}
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Debug Inspector &amp; Database State</h3>
        <button onClick={handleReset} style={{ padding: '6px 12px', color: 'red' }}>
          Reset Demo State
        </button>
      </div>
      <p>
        Live introspection harness. Inspects raw table subscriptions and logs every reducer execution with its status
        and arguments in real time.
      </p>

      <fieldset style={{ marginBottom: '20px', padding: '12px' }}>
        <legend><strong>SpacetimeDB Backend Integration Status</strong></legend>
        <div>
          <strong>Status:</strong> Draft Front-end Test Harness Active.
        </div>
        <div>
          <strong>Backend Note:</strong> Teammate is building backend C#/TypeScript SpacetimeDB module. Once published,
          client tables will bind directly to SpacetimeDB WebSocket subscriptions.
        </div>
        <pre style={{ margin: '8px 0 0 0', backgroundColor: '#eef', padding: '6px' }}>
{`// TODO: When backend module is published, replace store with:
// import { DbConnection } from './module_bindings';
// const conn = DbConnection.builder().withUri(VITE_SPACETIMEDB_URI)...build();`}
        </pre>
      </fieldset>

      <div style={{ marginBottom: '24px' }}>
        <h4>Live Reducer Call Log (Realtime)</h4>
        <DataTable
          columns={reducerLogColumns}
          data={state.reducerLogs}
          emptyMessage="No reducers called yet in this session. Trigger any action across the tabs to view log."
        />
      </div>

      <div>
        <h4>Raw Table JSON Dump</h4>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {tableKeys.map((key) => (
            <button
              key={key}
              onClick={() => setSelectedTable(key)}
              style={{
                padding: '4px 8px',
                backgroundColor: selectedTable === key ? '#000' : '#ddd',
                color: selectedTable === key ? '#fff' : '#000',
              }}
            >
              {key}
            </button>
          ))}
        </div>

        <pre
          style={{
            backgroundColor: '#111',
            color: '#00ff66',
            padding: '16px',
            overflowX: 'auto',
            maxHeight: '400px',
            fontSize: '0.9em',
          }}
        >
          {JSON.stringify(state[selectedTable], null, 2)}
        </pre>
      </div>
    </div>
  );
};
