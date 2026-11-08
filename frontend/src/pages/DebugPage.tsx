import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Card, SectionTitle } from '../components/Card';
import { Chip } from '../components/Chip';
import { PageHeader } from '../components/PageHeader';
import { tables, reducers } from '../module_bindings';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { jsonReplacer } from '../lib/live';

export const DebugPage: React.FC = () => {
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [registerError, setRegisterError] = useState('');

  // Live SpacetimeDB hook connection
  const conn = useSpacetimeDB();
  const dbConnected = conn?.isActive ?? false;
  const registerPhone = useReducer(reducers.registerPhone);

  // One subscription per backend table, for the raw inspector below
  const [users] = useTable(tables.user);
  const [incidents] = useTable(tables.incident);
  const [incidentMembers] = useTable(tables.incidentMember);
<<<<<<< Updated upstream
  const [adminMessages] = useTable(tables.adminMessages);
  const [incidentMessages] = useTable(tables.incidentMessages);
  const [generalMessages] = useTable(tables.generalMessages);
=======
  const [messages] = useTable(tables.message);
>>>>>>> Stashed changes
  const [timelineEntries] = useTable(tables.timelineEntry);
  const [scopeItems] = useTable(tables.scopeItem);
  const [docTemplates] = useTable(tables.docTemplate);
  const [incidentDocuments] = useTable(tables.incidentDocument);

  const liveTables: Record<string, readonly unknown[]> = {
    user: users,
    incident: incidents,
    incident_member: incidentMembers,
<<<<<<< Updated upstream
    admin_messages: adminMessages,
    incident_messages: incidentMessages,
    general_messages: generalMessages,
=======
    message: messages,
>>>>>>> Stashed changes
    timeline_entry: timelineEntries,
    scope_item: scopeItems,
    doc_template: docTemplates,
    incident_document: incidentDocuments,
  };
  const [selectedTable, setSelectedTable] = useState('user');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !phone.trim()) return;
    setRegisterError('');
    try {
      await registerPhone({ phone, displayName });
      setDisplayName('');
      setPhone('');
    } catch (err) {
      // Exceptions thrown by the C# reducer land here
      setRegisterError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Diagnostics" description="Connection state and the raw contents of every SpacetimeDB table." />

      <Card className="space-y-4 p-5">
        <SectionTitle>
          SpacetimeDB <code className="font-mono">user</code> table
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
          {users.length === 0 ? (
            <span className="type-body-medium text-on-surface-variant">No rows yet.</span>
          ) : (
            users.map((u) => (
              <Chip key={u.id.toHexString()}>
                {u.displayName} · {u.phone} {u.online ? '🟢' : '⚪'}
              </Chip>
            ))
          )}
        </div>

        <form onSubmit={handleRegister} className="flex gap-2">
          <input
            type="text"
            aria-label="Display name"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="h-10 flex-1 py-0"
            disabled={!dbConnected}
          />
          <input
            type="tel"
            aria-label="Phone"
            placeholder="Phone (10 digits)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-10 flex-1 py-0"
            disabled={!dbConnected}
          />
          <Button
            type="submit"
            variant="tonal"
            disabled={!dbConnected || !displayName.trim() || !phone.trim()}
          >
            Call registerPhone
          </Button>
        </form>
        {registerError && <p className="m-0 type-body-medium text-error">{registerError}</p>}
      </Card>

      <section>
        <SectionTitle>Live tables</SectionTitle>
        <div className="mb-3 flex flex-wrap gap-2">
          {Object.entries(liveTables).map(([key, rows]) => {
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
                {key} ({rows.length})
              </button>
            );
          })}
        </div>
        <pre className="max-h-[360px] overflow-auto rounded-xl bg-surface-container-lowest p-4 font-mono type-body-small text-on-surface-variant">
          {JSON.stringify(liveTables[selectedTable], jsonReplacer, 2)}
        </pre>
      </section>
    </div>
  );
};
