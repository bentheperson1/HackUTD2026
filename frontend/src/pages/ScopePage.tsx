import React from 'react';
import { useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import type { ScopeItem } from '../module_bindings/types';
import { useAuth } from '../lib/authContext';
import { scopeStatus, toDate } from '../lib/live';
import { DataTable, Column } from '../components/DataTable';
import { Chip } from '../components/Chip';
import { SectionTitle } from '../components/Card';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';

export const ScopePage: React.FC = () => {
  const { activeIncident } = useAuth();
  const [allScopeItems] = useTable(tables.scopeItem);
  const scopeItems = allScopeItems.filter((i) => i.incidentId === activeIncident?.id);

  const columns: Column<ScopeItem>[] = [
    {
      header: 'System or data',
      render: (item) => item.dataType,
    },
    {
      header: 'Status',
      render: (item) => {
        const st = scopeStatus(item.status);
        return <Chip tone={st.value === 'exfiltrated' ? 'error' : 'neutral'}>{st.label}</Chip>;
      },
    },
    {
      header: 'Records',
      render: (item) => <span className="font-mono text-on-surface-variant">{item.recordCount.toString()}</span>,
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
        description="Every system or data set that may be compromised, and which states its records come from. This drives the notification deadlines."
      />

      {/* TODO: needs AddScopeItem / UpdateScopeItem reducers in the backend to bring back the form */}
      <Notice>Logging affected data isn't wired up yet. The backend has no reducer for it.</Notice>

      <section>
        <SectionTitle trailing={`${scopeItems.length} items`}>Inventory</SectionTitle>
        <DataTable columns={columns} data={scopeItems} emptyMessage="Nothing logged yet." />
      </section>
    </div>
  );
};
