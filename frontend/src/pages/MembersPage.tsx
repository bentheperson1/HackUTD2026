import React, { useState } from 'react';
import type { Identity } from 'spacetimedb';
import { useReducer, useTable } from 'spacetimedb/react';
import { reducers, tables } from '../module_bindings';
import type { GuestGrant, OrgMember } from '../module_bindings/types';
import { useAuth } from '../lib/authContext';
import { Role } from '../lib/types';
import { errorMessage, GUEST_ROLES, STAFF_ROLES, toBackendRole, toDate, toUiRole } from '../lib/live';
import { DataTable, Column } from '../components/DataTable';
import { Button, IconButton } from '../components/Button';
import { Card, SectionTitle } from '../components/Card';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';
import { RoleBadge, roleLabel } from '../components/RoleBadge';
import { Trash2 } from 'lucide-react';

const CreateCompany: React.FC<{ onError: (msg: string) => void }> = ({ onError }) => {
  const createOrganization = useReducer(reducers.createOrganization);
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Makes me the Owner and an admin of the new company
      await createOrganization({ name, industry });
    } catch (err) {
      onError(errorMessage(err));
    }
  };

  return (
    <Card className="p-5">
      <SectionTitle>Set up your company</SectionTitle>
      <p className="mb-5 mt-0 type-body-medium text-on-surface-variant">
        You become the owner. Teammates join when you add their phone number, so ask them to sign in once first.
      </p>
      <form onSubmit={handleCreate} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Company name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Logistics"
              className="w-full"
              maxLength={100}
            />
          </Field>
          <Field label="Industry" help="Optional">
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Logistics"
              className="w-full"
              maxLength={60}
            />
          </Field>
        </div>
        <Button type="submit" disabled={!name.trim()}>
          Create company
        </Button>
      </form>
    </Card>
  );
};

export const MembersPage: React.FC = () => {
  const { isRegistered, myOrgs, activeOrg, setActiveOrgId, isAdmin, activeIncident, incidentRole, me } = useAuth();
  const [users] = useTable(tables.user);
  const [orgMembers] = useTable(tables.orgMember);
  const [guestGrants] = useTable(tables.guestGrant);
  const addOrgMember = useReducer(reducers.addOrgMember);
  const setOrgRole = useReducer(reducers.setOrgRole);
  const grantGuest = useReducer(reducers.grantGuest);
  const revokeGuest = useReducer(reducers.revokeGuest);

  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<Role>('it_lead');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestRole, setGuestRole] = useState<Role>('insurer');
  const [guestDays, setGuestDays] = useState(7);
  const [error, setError] = useState<string | null>(null);

  const userFor = (person: Identity) => users.find((u) => u.id.isEqual(person));
  const roster = orgMembers.filter((m) => m.orgId === activeOrg?.id);
  const guests = guestGrants.filter((g) => g.incidentId === activeIncident?.id);
  const canGrantGuests = !!activeIncident && incidentRole === 'Owner';

  // Wraps a reducer call so its error shows on the page
  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    const ok = await run(() => addOrgMember({ orgId: activeOrg.id, phone: newPhone, role: toBackendRole(newRole) }));
    if (ok) setNewPhone('');
  };

  const handleGrantGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIncident) return;
    const ok = await run(() =>
      grantGuest({ incidentId: activeIncident.id, phone: guestPhone, role: toBackendRole(guestRole), days: guestDays })
    );
    if (ok) setGuestPhone('');
  };

  const rosterColumns: Column<OrgMember>[] = [
    { header: 'Name', render: (m) => userFor(m.person)?.displayName ?? 'Unknown' },
    {
      header: 'Role',
      render: (m) => {
        const isSelf = !!me && m.person.isEqual(me.id);
        if (!isAdmin || isSelf) return <RoleBadge role={toUiRole(m.role)} />;
        return (
          <select
            aria-label={`Role for ${userFor(m.person)?.displayName}`}
            value={toUiRole(m.role)}
            onChange={(e) =>
              run(() => setOrgRole({ orgId: m.orgId, person: m.person, role: toBackendRole(e.target.value as Role) }))
            }
            className="h-9 py-0"
          >
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      header: 'Phone',
      render: (m) => <span className="whitespace-nowrap font-mono text-on-surface-variant">{userFor(m.person)?.phone}</span>,
    },
    { header: 'Online', render: (m) => (userFor(m.person)?.online ? '🟢' : '⚪') },
  ];

  const guestColumns: Column<GuestGrant>[] = [
    { header: 'Name', render: (g) => userFor(g.person)?.displayName ?? 'Unknown' },
    { header: 'Role', render: (g) => <RoleBadge role={toUiRole(g.role)} /> },
    {
      header: 'Access until',
      render: (g) => <span className="whitespace-nowrap text-on-surface-variant">{toDate(g.expiresAt).toLocaleString()}</span>,
    },
    {
      header: '',
      align: 'right',
      render: (g) =>
        canGrantGuests && (
          <IconButton
            label={`Revoke ${userFor(g.person)?.displayName}`}
            onClick={() => run(() => revokeGuest({ grantId: g.id }))}
            className="hover:text-error"
          >
            <Trash2 />
          </IconButton>
        ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team roster"
        description="Who can sign in during an incident. Outside advisors like counsel and insurers get access that expires."
      />

      {error && <Notice tone="error">{error}</Notice>}
      {!isRegistered && <Notice tone="error">Sign in with your phone number first.</Notice>}

      {isRegistered && !activeOrg && <CreateCompany onError={setError} />}

      {myOrgs.length > 1 && (
        <Field label="Company">
          <select
            value={activeOrg?.id.toString()}
            onChange={(e) => setActiveOrgId(BigInt(e.target.value))}
            className="w-full md:max-w-sm"
          >
            {myOrgs.map((o) => (
              <option key={o.id.toString()} value={o.id.toString()}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {activeOrg && (
        <>
          <section>
            <SectionTitle trailing={`${roster.length} people`}>{activeOrg.name} responders</SectionTitle>
            <DataTable columns={rosterColumns} data={roster} />
          </section>

          {isAdmin && (
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
                      {STAFF_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {roleLabel(r)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Button type="submit" disabled={!newPhone.trim()}>
                  Add to roster
                </Button>
              </form>
            </Card>
          )}
        </>
      )}

      {activeIncident && (
        <section>
          <SectionTitle trailing={activeIncident.name}>Guest access</SectionTitle>
          <DataTable columns={guestColumns} data={guests} emptyMessage="No guests on this incident." />

          {canGrantGuests && (
            <Card className="mt-4 p-5">
              <form onSubmit={handleGrantGuest} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field label="Guest phone">
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full"
                    />
                  </Field>
                  <Field label="Role">
                    <select value={guestRole} onChange={(e) => setGuestRole(e.target.value as Role)} className="w-full">
                      {GUEST_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {roleLabel(r)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Access length (days)">
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={guestDays}
                      onChange={(e) => setGuestDays(Number(e.target.value))}
                      className="w-full"
                    />
                  </Field>
                </div>
                <Button type="submit" variant="tonal" disabled={!guestPhone.trim()}>
                  Grant access
                </Button>
              </form>
            </Card>
          )}
        </section>
      )}
    </div>
  );
};
