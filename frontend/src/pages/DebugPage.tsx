import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { store, AppState } from '../lib/store';
import { ReducerCallLog } from '../lib/types';
import { useAppState } from '../lib/useAppState';
import { DataTable, Column } from '../components/DataTable';
import { live } from '../lib/live';
import { useAuth } from '../lib/authContext';
import { Badge, Button, Card, Modal, PageHeader, Segmented, StatusDot } from '../components/ui';

const TABLE_KEYS: (keyof AppState)[] = [
  'org',
  'members',
  'incident',
  'messages',
  'tasks',
  'auditLogs',
  'scopeItems',
  'reportTemplates',
  'reportDrafts',
  'drill',
];

export const DebugPage: React.FC = () => {
  const state = useAppState((s) => s);
  const [selectedTable, setSelectedTable] = useState<keyof AppState>('members');
  const [confirmReset, setConfirmReset] = useState(false);
  const { mode, liveStatus, spacetimedbIdentity, currentUser, isSignedIn } = useAuth();
  const counts = live.tableCounts();

  const reducerLogColumns: Column<ReducerCallLog>[] = [
    {
      header: 'Time',
      render: (l) => <span className="font-mono text-xs text-fg-muted">{new Date(l.timestamp).toLocaleTimeString()}</span>,
    },
    {
      header: 'Reducer',
      render: (l) => <span className="font-mono text-xs text-fg">{l.reducer_name}</span>,
    },
    {
      header: 'Result',
      render: (l) => <Badge tone={l.status === 'success' ? 'accent' : 'breach'}>{l.status === 'success' ? 'OK' : 'Error'}</Badge>,
    },
    {
      header: 'Arguments',
      render: (l) => (
        <div>
          <code className="font-mono text-[11px] break-all text-fg-muted">{JSON.stringify(l.args)}</code>
          {l.error_message && <div className="mt-0.5 text-xs text-breach-text">{l.error_message}</div>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="System"
        title="Diagnostics"
        description="Live SpacetimeDB connection, reducer calls, and the raw local tables."
        actions={
          <Button size="sm" variant="ghost" onClick={() => setConfirmReset(true)}>
            <RotateCcw className="h-4 w-4" />
            Reset demo data
          </Button>
        }
      />

      <Card kind="data" title="SpacetimeDB" description="Live connection and table row counts">
        <div className="space-y-5">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-[13px] sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase">Data source</dt>
              <dd className="mt-1 flex items-center gap-2 text-fg">
                <StatusDot tone={mode === 'live' ? 'accent' : liveStatus === 'not-deployed' ? 'drill' : 'off'} />
                {mode === 'live' ? 'Live: SpacetimeDB tables' : 'Demo: local data in this browser'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase">Connection</dt>
              <dd className="mt-1 text-fg">{liveStatus}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase">Your identity</dt>
              <dd className="mt-1 font-mono text-xs break-all text-fg-muted">{spacetimedbIdentity || 'none yet'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase">Signed in as</dt>
              <dd className="mt-1 text-fg">{isSignedIn ? `${currentUser.name} (${currentUser.role})` : 'Not linked to a roster phone'}</dd>
            </div>
          </dl>

          {live.statusDetail && <p className="text-[13px] text-drill">{live.statusDetail}</p>}

          {mode === 'live' ? (
            <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-3">
              {Object.entries(counts).map(([name, n]) => (
                <div key={name} className="flex items-baseline justify-between border-b border-line py-2 text-[13px]">
                  <span className="font-mono text-fg-muted">{name}</span>
                  <span className="font-mono text-fg tabular-nums">{n}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-fg-muted">
              Not live yet. Publish the module and regenerate bindings (see README, "Go live"), then reload.
            </p>
          )}
        </div>
      </Card>

      <Card kind="table" title="Reducer calls" description="local store · newest first" padded={false}>
        <DataTable bare columns={reducerLogColumns} data={state.reducerLogs} rowKey={(l) => l.id} emptyMessage="No reducers called yet. Do anything in the app to see calls here." />
      </Card>

      <Card kind="json" title="Raw tables">
        <div className="space-y-3">
          <Segmented<string>
            ariaLabel="Table"
            value={selectedTable as string}
            onChange={(v) => setSelectedTable(v as keyof AppState)}
            options={TABLE_KEYS.map((k) => ({ value: k as string, label: <span className="font-mono text-xs">{k as string}</span> }))}
          />
          <pre className="max-h-[360px] overflow-auto bg-surface p-4 font-mono text-xs text-fg-muted">
            {JSON.stringify(state[selectedTable], null, 2)}
          </pre>
        </div>
      </Card>

      {confirmReset && (
        <Modal title="Reset demo data?" description="Everything goes back to the starting demo state on this browser." onClose={() => setConfirmReset(false)}>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                store.resetToDefaults();
                setConfirmReset(false);
              }}
            >
              Reset
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
