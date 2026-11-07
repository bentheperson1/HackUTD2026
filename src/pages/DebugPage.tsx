import React, { useState, useEffect } from 'react';
import { store, AppState } from '../lib/store';
import { DataTable, Column } from '../components/DataTable';
import { ReducerCallLog } from '../lib/types';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';

export const DebugPage: React.FC = () => {
  const [state, setState] = useState<AppState>(store.getState());
  const [selectedTable, setSelectedTable] = useState<keyof AppState>('members');
  const [newPersonName, setNewPersonName] = useState('');
  const [spacetimedbStatusMsg, setSpacetimedbStatusMsg] = useState('');

  // SpacetimeDB Live Connection & Hooks
  let conn: any = null;
  try {
    conn = useSpacetimeDB();
  } catch {
    // Graceful fallback
  }

  const isConnected = !!conn?.isActive;
  let people: readonly { name: string }[] = [];
  try {
    const [personTable] = useTable(tables.person);
    people = personTable || [];
  } catch {
    // If not subscribed yet
  }

  let addPersonReducer: any = null;
  let sayHelloReducer: any = null;
  try {
    addPersonReducer = useReducer(reducers.add);
    sayHelloReducer = useReducer(reducers.sayHello);
  } catch {
    // Fallback
  }

  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;
    try {
      if (addPersonReducer) {
        addPersonReducer({ name: newPersonName.trim() });
        setSpacetimedbStatusMsg(`Called add({ name: "${newPersonName.trim()}" }) successfully!`);
        setNewPersonName('');
      } else {
        setSpacetimedbStatusMsg('SpacetimeDB add reducer not available');
      }
    } catch (err: any) {
      setSpacetimedbStatusMsg(`Error: ${err?.message || err}`);
    }
  };

  const handleSayHello = () => {
    try {
      if (sayHelloReducer) {
        sayHelloReducer();
        setSpacetimedbStatusMsg('Triggered say_hello reducer! Check terminal/logs.');
      }
    } catch (err: any) {
      setSpacetimedbStatusMsg(`Error: ${err?.message || err}`);
    }
  };

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

      <fieldset style={{ marginBottom: '20px', padding: '16px', border: '2px solid #0066cc', backgroundColor: '#f0f7ff' }}>
        <legend><strong style={{ color: '#0066cc' }}>⚡ SpacetimeDB Live Connection &amp; Sample Reducer Test</strong></legend>
        <div style={{ marginBottom: '8px' }}>
          <strong>Status:</strong>{' '}
          <span style={{ color: isConnected ? 'green' : 'orange', fontWeight: 'bold' }}>
            ● {isConnected ? 'Connected to SpacetimeDB Cloud (wss://maincloud.spacetimedb.com)' : 'Connecting / Checking SpacetimeDB...'}
          </span>
        </div>
        <div style={{ marginBottom: '8px' }}>
          <strong>Database:</strong> <code>drillnight-dev</code> | <strong>Identity:</strong> <code>{conn?.identity ? conn.identity.toHexString() : 'Anonymous / Pending'}</code>
        </div>

        <div style={{ marginTop: '12px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <form onSubmit={handleAddPerson} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Enter name (e.g. Alice)"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              style={{ padding: '6px' }}
            />
            <button type="submit" style={{ padding: '6px 12px', fontWeight: 'bold', backgroundColor: '#0066cc', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Call add(name) Reducer
            </button>
          </form>
          <button onClick={handleSayHello} style={{ padding: '6px 12px', cursor: 'pointer' }}>
            Call say_hello Reducer
          </button>
        </div>

        {spacetimedbStatusMsg && (
          <div style={{ marginTop: '8px', color: '#004499', fontWeight: 'bold' }}>
            ℹ️ {spacetimedbStatusMsg}
          </div>
        )}

        <div style={{ marginTop: '12px' }}>
          <strong>Live <code>person</code> Table Subscription ({people.length} rows):</strong>
          {people.length === 0 ? (
            <div style={{ color: '#666', fontStyle: 'italic', marginTop: '4px' }}>No rows yet in `person` table. Submit a name above!</div>
          ) : (
            <ul style={{ margin: '6px 0 0 20px', padding: 0 }}>
              {people.map((p, idx) => (
                <li key={idx}><code>{p.name}</code></li>
              ))}
            </ul>
          )}
        </div>
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

