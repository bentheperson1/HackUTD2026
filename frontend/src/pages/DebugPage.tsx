import React, { useState, useEffect } from 'react';
import { store, AppState } from '../lib/store';
import { DataTable, Column } from '../components/DataTable';
import { ReducerCallLog } from '../lib/types';
import { tables, reducers } from '../module_bindings';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { Terminal, Database, RotateCcw } from 'lucide-react';

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
      render: (l) => <span className="font-mono text-slate-400 text-xs">{new Date(l.timestamp).toLocaleTimeString()}</span>,
    },
    {
      header: 'Reducer',
      render: (l) => <strong className="text-white text-xs">{l.reducer_name}</strong>,
    },
    {
      header: 'Status',
      render: (l) => (
        <span className={`text-[11px] font-bold uppercase font-mono ${l.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
          {l.status}
        </span>
      ),
    },
    {
      header: 'Payload',
      render: (l) => (
        <div>
          <pre className="m-0 text-[11px] font-mono text-slate-300">{JSON.stringify(l.args)}</pre>
          {l.error_message && <div className="text-xs text-rose-400 font-bold mt-0.5">{l.error_message}</div>}
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2 m-0">
            <Terminal className="w-5 h-5 text-hazard-yellow" />
            <span>SpacetimeDB Diagnostics &amp; State Introspection</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 mb-0">
            Introspection harness for live table subscriptions and real-time reducer execution logs.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border border-rose-800/40 flex items-center gap-1.5 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Simulation State</span>
        </button>
      </div>

      {/* Live SpacetimeDB Integration Status */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 m-0">
          <Database className="w-4 h-4 text-hazard-yellow" />
          <span>Live SpacetimeDB Cloud Table: <code>person</code></span>
        </h3>

        <div className="text-xs space-y-1">
          <div>
            Status:{' '}
            <span className={`font-bold ${dbConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
              ● {dbConnected ? 'Connected to Maincloud (drillnight-dev)' : 'Connecting to SpacetimeDB...'}
            </span>
          </div>
          <div className="font-mono text-slate-400 text-[11px]">
            Identity: {conn?.identity ? conn.identity.toHexString() : 'Pending'}
          </div>
        </div>

        <div className="pt-2 border-t border-[#1F2531]">
          <div className="text-xs font-semibold text-slate-300 mb-1.5">
            Current Rows in <code>person</code> table ({people.length}):
          </div>
          {people.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No rows in person table yet.</p>
          ) : (
            <div className="flex gap-2 flex-wrap mb-3">
              {people.map((p, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded bg-[#0B0D11] border border-border text-xs text-white font-mono">
                  {p.name}
                </span>
              ))}
            </div>
          )}

          <form onSubmit={handleAddPerson} className="flex gap-2 mt-2">
            <input
              type="text"
              placeholder="Test cloud reducer: enter person name"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              className="flex-1 text-xs"
              disabled={!dbConnected}
            />
            <button
              type="submit"
              disabled={!dbConnected}
              className="min-h-[40px] px-5 bg-hazard-yellow hover:bg-hazard-bright text-black font-extrabold text-xs uppercase tracking-wider rounded-lg disabled:opacity-50 transition-all shrink-0"
            >
              Call Add Reducer
            </button>
          </form>
        </div>
      </div>

      {/* Reducer Call Log */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 m-0">Live Reducer Execution Log</h3>
        <DataTable
          columns={reducerLogColumns}
          data={state.reducerLogs}
          emptyMessage="No reducers called yet. Trigger any action across the crisis tabs to view log."
        />
      </div>

      {/* Table JSON Dump */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-white m-0">Raw Table JSON Inspector</h3>

        <div className="flex gap-1.5 flex-wrap">
          {tableKeys.map((key) => (
            <button
              key={key}
              onClick={() => setSelectedTable(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedTable === key
                  ? 'bg-hazard-yellow text-black font-bold'
                  : 'bg-[#0B0D11] text-slate-300 hover:text-white border border-border'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <pre className="bg-[#0B0D11] border border-[#1E2431] text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-[350px]">
          {JSON.stringify(state[selectedTable], null, 2)}
        </pre>
      </div>
    </div>
  );
};
