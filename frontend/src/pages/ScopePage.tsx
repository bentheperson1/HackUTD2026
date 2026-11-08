import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReducer, useTable } from 'spacetimedb/react';
import { reducers, tables } from '../module_bindings';
import type { ScopeItem } from '../module_bindings/types';
import { useAuth } from '../lib/authContext';
import { errorMessage, isIncidentOpen, SCOPE_STATUSES, toDate } from '../lib/live';
import { DataTable, Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Card, SectionTitle } from '../components/Card';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';
import { ArrowRight } from 'lucide-react';

// Matches CanEditScope in Helpers.cs
const CAN_EDIT_SCOPE = ['Owner', 'ItLead', 'Legal'];
// Data types the seeded notification rules match on (NotificationRule.coveredData in Seed.cs)
const DATA_TYPE_SUGGESTIONS = ['ssn', 'payment', 'health'];

const parseStates = (raw: string) =>
  raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0);

export const ScopePage: React.FC = () => {
  const navigate = useNavigate();
  const { activeIncident, incidentRole } = useAuth();
  const [allScopeItems] = useTable(tables.scopeItem);
  const upsertScopeItem = useReducer(reducers.upsertScopeItem);

  const [dataType, setDataType] = useState('');
  const [recordCount, setRecordCount] = useState('');
  const [status, setStatus] = useState(0);
  const [affectedStates, setAffectedStates] = useState('TX');
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ dataType: string; states: string[] } | null>(null);

  const scopeItems = allScopeItems.filter((i) => i.incidentId === activeIncident?.id);
  const canEdit =
    !!activeIncident && isIncidentOpen(activeIncident.status) && !!incidentRole && CAN_EDIT_SCOPE.includes(incidentRole);

  // id 0 creates a new row; any other id updates that row
  const save = async (item: Pick<ScopeItem, 'id' | 'dataType' | 'recordCount' | 'status' | 'states'>) => {
    if (!activeIncident) return false;
    setError(null);
    try {
      await upsertScopeItem({ incidentId: activeIncident.id, ...item });
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const states = parseStates(affectedStates);
    const ok = await save({ id: 0n, dataType, recordCount: BigInt(recordCount || 0), status, states });
    if (ok) {
      setSuccessInfo({ dataType, states });
      setDataType('');
      setRecordCount('');
    }
  };

  const columns: Column<ScopeItem>[] = [
    {
      header: 'Data type',
      render: (item) => <span className="font-mono">{item.dataType}</span>,
    },
    {
      header: 'Status',
      render: (item) => (
        <select
          aria-label={`Status for ${item.dataType}`}
          value={item.status}
          disabled={!canEdit}
          onChange={(e) => save({ ...item, status: Number(e.target.value) })}
          className={`h-9 py-0 ${item.status === 1 ? 'border-error text-error' : ''}`}
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
      header: 'Records',
      render: (item) => <span className="font-mono text-on-surface-variant">{item.recordCount.toLocaleString()}</span>,
    },
    {
      header: 'States',
      render: (item) => <span className="font-mono text-on-surface-variant">{item.states.join(', ') || '—'}</span>,
    },
    {
      header: 'Updated',
      render: (item) => (
        <span className="whitespace-nowrap text-on-surface-variant">
          {toDate(item.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Affected data"
        description="Every kind of data that may be compromised, and which states its records come from. This drives the notification deadlines."
      />

      {error && <Notice tone="error">{error}</Notice>}
      {!activeIncident && <Notice>You're not part of any incident yet.</Notice>}

      {successInfo && (
        <Notice
          tone="success"
          title={`Added ${successInfo.dataType}`}
          action={
            <Button variant="text" onClick={() => navigate('/notify')} className="!text-on-tertiary-container">
              View deadlines <ArrowRight className="h-4 w-4" />
            </Button>
          }
        >
          {successInfo.states.length > 0
            ? `Checked notification rules for ${successInfo.states.join(', ')}.`
            : 'No states were listed, so no notification rules apply yet.'}
        </Notice>
      )}

      <section>
        <SectionTitle trailing={`${scopeItems.length} items`}>Inventory</SectionTitle>
        <DataTable columns={columns} data={scopeItems} emptyMessage="Nothing logged yet." />
      </section>

      {canEdit && (
        <Card className="p-5">
          <SectionTitle>Log affected data</SectionTitle>
          <form onSubmit={handleAdd} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Data type" help="Use the standard names so state rules match: ssn, payment, health">
                <input
                  type="text"
                  list="scope-data-types"
                  value={dataType}
                  onChange={(e) => setDataType(e.target.value)}
                  placeholder="ssn"
                  className="w-full font-mono"
                  maxLength={40}
                />
                <datalist id="scope-data-types">
                  {DATA_TYPE_SUGGESTIONS.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </Field>

              <Field label="Status">
                <select value={status} onChange={(e) => setStatus(Number(e.target.value))} className="w-full">
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

              <Field label="Record count" help="Best estimate">
                <input
                  type="number"
                  min={0}
                  value={recordCount}
                  onChange={(e) => setRecordCount(e.target.value.replace(/\D/g, ''))}
                  placeholder="14000"
                  className="w-full"
                />
              </Field>
            </div>

            <Button type="submit" disabled={!dataType.trim()}>
              Add to inventory
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
};
