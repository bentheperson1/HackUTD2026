import React, { useState, useEffect } from 'react';
import { store, AppState } from '../lib/store';
import { DataTable, Column } from '../components/DataTable';
import { ReducerCallLog } from '../lib/types';
import { tables, reducers } from '../module_bindings';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';

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

      {/* Live SpacetimeDB Integration Status */}
      <fieldset style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f0f7ff', border: '1px solid #90caf9' }}>
        <legend><strong>⚡ Live SpacetimeDB Connection &amp; Reducer Test</strong></legend>
        <div>
          <strong>Status:</strong>{' '}
          <span style={{ color: dbConnected ? 'green' : 'orange', fontWeight: 'bold' }}>
            {dbConnected ? '● Connected to SpacetimeDB Maincloud (drillnight-dev)' : 'Connecting to SpacetimeDB...'}
          </span>
        </div>
        <div style={{ fontSize: '0.9em', marginTop: '4px' }}>
          <strong>Connected Identity:</strong> <code>{conn?.identity ? conn.identity.toHexString() : 'Pending auth'}</code>
        </div>

        <div style={{ marginTop: '12px' }}>
          <strong>Live Database Table <code>person</code> ({people.length} rows):</strong>
          {people.length === 0 ? (
            <p style={{ fontStyle: 'italic', margin: '4px 0' }}>No rows in person table yet.</p>
          ) : (
            <ul style={{ margin: '6px 0' }}>
              {people.map((p, idx) => (
                <li key={idx}><code>{p.name}</code></li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddPerson} style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Test reducer: enter person name"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              style={{ padding: '6px', width: '260px' }}
              disabled={!dbConnected}
            />
            <button type="submit" disabled={!dbConnected} style={{ padding: '6px 12px', fontWeight: 'bold' }}>
              Call SpacetimeDB Add Reducer
            </button>
          </form>
        </div>
      </fieldset>

      <div style={{ marginBottom: '24px' }}>
        <h4>Live Reducer Call Log (Frontend Reactive Store)</h4>
        <DataTable
          columns={reducerLogColumns}
          data={state.reducerLogs}
          emptyMessage="No local reducers called yet. Trigger any action across the crisis tabs to view log."
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
                cursor: 'pointer',
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
