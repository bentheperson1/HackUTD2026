import React, { useState } from 'react';
import { useReducer, useTable } from 'spacetimedb/react';
import { reducers, tables } from '../module_bindings';
import type { IncidentMember } from '../module_bindings/types';
import { useAuth, UI_ROLE_TO_BACKEND } from '../lib/authContext';
import { Role } from '../lib/types';
import { ROLES } from '../lib/constants';
import { toDate } from '../lib/live';
import { DataTable, Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Card, SectionTitle } from '../components/Card';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';
import { RoleBadge } from '../components/RoleBadge';

// Only roles the backend's AddMember accepts
const ASSIGNABLE_ROLES = ROLES.filter((r) => UI_ROLE_TO_BACKEND[r.value]);
const BACKEND_TO_UI = Object.fromEntries(Object.entries(UI_ROLE_TO_BACKEND).map(([ui, be]) => [be, ui])) as Record<
  string,
  Role
>;

export const MembersPage: React.FC = () => {
  const { activeIncident, currentUser } = useAuth();
  const [users] = useTable(tables.user);
  const [allMembers] = useTable(tables.incidentMember);
  const addMember = useReducer(reducers.addMember);
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<Role>('it_lead');
  const [error, setError] = useState<string | null>(null);

  const members = activeIncident ? allMembers.filter((m) => m.incidentId === activeIncident.id) : [];
  const userFor = (m: IncidentMember) => users.find((u) => u.id.isEqual(m.person));
  const isOwner = currentUser.role === 'owner';

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIncident) return;
    setError(null);
    try {
      // The person must have signed in once (registerPhone) so their phone is known
      await addMember({ incidentId: activeIncident.id, phone: newPhone, role: UI_ROLE_TO_BACKEND[newRole]! });
      setNewPhone('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const columns: Column<IncidentMember>[] = [
    {
      header: 'Name',
      render: (m) => userFor(m)?.displayName ?? 'Unknown',
    },
    {
      header: 'Role',
      render: (m) => <RoleBadge role={BACKEND_TO_UI[m.role] ?? 'member'} />,
    },
    {
      header: 'Phone',
      render: (m) => <span className="whitespace-nowrap font-mono text-on-surface-variant">{userFor(m)?.phone}</span>,
    },
    {
      header: 'Online',
      render: (m) => (userFor(m)?.online ? '🟢' : '⚪'),
    },
    {
      header: 'Added',
      render: (m) => <span className="whitespace-nowrap text-on-surface-variant">{toDate(m.addedAt).toLocaleString()}</span>,
    },
  ];

  if (!activeIncident) {
    return (
      <div className="space-y-8">
        <PageHeader title="Team roster" description="Who is responding to the active incident." />
        <Notice>You're not part of any incident yet. Declare one on the Incident page or ask an owner to add you.</Notice>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Team roster" description={`Who is responding to "${activeIncident.name}".`} />

      {error && <Notice tone="error">{error}</Notice>}

      <section>
        <SectionTitle trailing={`${members.length} people`}>Responders</SectionTitle>
        <DataTable columns={columns} data={members} />
      </section>

      {isOwner && (
        <Card className="p-5">
          <SectionTitle>Add a person</SectionTitle>
          <form onSubmit={handleAddMember} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Personal phone" help="They must have signed in once with this number.">
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full"
                />
              </Field>

              <Field label="Role">
                <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)} className="w-full">
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Button type="submit" disabled={!newPhone.trim()}>
              Add to incident
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
};
