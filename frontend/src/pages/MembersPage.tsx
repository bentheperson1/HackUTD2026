import React, { useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { Member, Role } from '../lib/types';
import { ROLES } from '../lib/constants';
import { useAppState } from '../lib/useAppState';
import { DataTable, Column } from '../components/DataTable';
import { Field } from '../components/Field';
import { Alert, Badge, Button, Card, FilterBar, FilterChip, IconButton, Modal, PageHeader } from '../components/ui';
import { ROLE_SHORT } from '../components/RoleBadge';

const isGuestRole = (r: Role) => r === 'insurer' || r === 'outside_counsel';

export const MembersPage: React.FC = () => {
  const { currentUser, mode } = useAuth();
  const isLive = mode === 'live';
  const incidentOpen = useAppState((s) => s.incident.status === 'active');
  const members = useAppState((s) => s.members);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<Role>('it_lead');
  const [guestDays, setGuestDays] = useState('7');
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [roleFilter, setRoleFilter] = useState<Role | 'all' | 'guests'>('all');
  const [search, setSearch] = useState('');

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if ((!isLive && !newName.trim()) || !newPhone.trim()) {
      setError(isLive ? 'Phone is required.' : 'Name and phone are required.');
      return;
    }
    const expiresAt = isGuestRole(newRole) ? new Date(Date.now() + parseInt(guestDays, 10) * 86400000).toISOString() : null;
    const res = store.addMember(currentUser.name, newName, newPhone, newRole, expiresAt);
    if (!res.success) {
      setError(res.error || 'Failed to add member');
    } else {
      setNewName('');
      setNewPhone('');
    }
  };

  const handleRoleChange = (memberId: string, role: Role) => {
    const res = store.updateMemberRole(currentUser.name, memberId, role);
    if (!res.success) setError(res.error || 'Failed to update role');
  };

  const confirmRemove = () => {
    if (!removing) return;
    const res = store.removeMember(currentUser.name, removing.id);
    if (!res.success) setError(res.error || 'Failed to remove member');
    setRemoving(null);
  };

  const guests = members.filter((m) => m.expires_at).length;
  const q = search.trim().toLowerCase();
  const visibleMembers = members.filter(
    (m) =>
      (roleFilter === 'all' || (roleFilter === 'guests' ? !!m.expires_at : m.role === roleFilter)) &&
      (!q || `${m.name} ${m.phone}`.toLowerCase().includes(q))
  );
  const rolesPresent = ROLES.map((r) => r.value).filter((r) => members.some((m) => m.role === r));

  const columns: Column<Member>[] = [
    {
      header: 'Name',
      render: (m) => (
        <div>
          <div className="flex items-center gap-2 font-medium text-fg">
            {m.name}
            {isLive && <span className={m.online ? 'h-1.5 w-1.5 bg-accent' : 'h-1.5 w-1.5 bg-line-strong'} title={m.online ? 'Online now' : 'Offline'} />}
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      render: (m) => (
        <>
          <label className="sr-only" htmlFor={`role-${m.id}`}>
            Role for {m.name}
          </label>
          <select
            id={`role-${m.id}`}
            value={m.role}
            disabled={isLive && !!m.grant_id}
            onChange={(e) => handleRoleChange(m.id, e.target.value as Role)}
            className="h-8 w-48 py-0 text-xs"
          >
            {ROLES.filter((r) => !isLive || m.grant_id || !isGuestRole(r.value)).map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </>
      ),
    },
    {
      header: 'Phone',
      render: (m) => <span className="font-mono text-xs whitespace-nowrap text-fg-muted">{m.phone}</span>,
    },
    {
      header: 'Access',
      render: (m) =>
        m.expires_at ? (
          <Badge tone="accent">Until {new Date(m.expires_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Badge>
        ) : (
          <span className="text-xs text-fg-subtle">Always</span>
        ),
    },
    {
      header: '',
      className: 'w-12 text-right',
      render: (m) =>
        !isLive || m.grant_id ? (
          <IconButton label={isLive ? `Revoke ${m.name}'s guest access` : `Remove ${m.name}`} tone="danger" onClick={() => setRemoving(m)}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        ) : null,
    },
  ];

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Prepare"
        title="Team"
        description="Everyone in your company who can use Outpost. Insurers and outside lawyers are added as guests, and their access ends after the number of days you choose."
      />

      {error && (
        <Alert tone="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <FilterBar
        right={
          <>
            <label htmlFor="member-search" className="sr-only">
              Search people
            </label>
            <input id="member-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone" className="h-7 w-56 text-xs" />
          </>
        }
      >
        <FilterChip active={roleFilter === 'all'} onClick={() => setRoleFilter('all')} count={members.length}>
          All
        </FilterChip>
        <FilterChip active={roleFilter === 'guests'} onClick={() => setRoleFilter(roleFilter === 'guests' ? 'all' : 'guests')} count={guests}>
          Guests
        </FilterChip>
        {rolesPresent.map((r) => (
          <FilterChip key={r} active={roleFilter === r} onClick={() => setRoleFilter(roleFilter === r ? 'all' : r)} count={members.filter((m) => m.role === r).length}>
            {ROLE_SHORT[r]}
          </FilterChip>
        ))}
      </FilterBar>

      <Card kind="people" title="People" padded={false}>
        <DataTable bare columns={columns} data={visibleMembers} rowKey={(m) => m.id} emptyMessage="No one matches these filters." />
      </Card>

      <Card kind="form" title="Add a person">
        <form onSubmit={handleAddMember} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {!isLive && (
              <Field label="Full name" htmlFor="m-name">
                <input id="m-name" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Jordan Ellis" />
              </Field>
            )}
            <Field label="Personal phone" htmlFor="m-phone" help={isLive ? 'This person must have signed in to Outpost with this number at least once.' : undefined}>
              <input id="m-phone" type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
            </Field>
            <Field label="Role" htmlFor="m-role">
              <select id="m-role" value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
            {isGuestRole(newRole) && (
              <Field label="Guest access (days)" htmlFor="m-days">
                <input id="m-days" type="number" value={guestDays} onChange={(e) => setGuestDays(e.target.value)} min="1" max="30" />
              </Field>
            )}
          </div>
          {isLive && isGuestRole(newRole) && !incidentOpen && (
            <p className="text-xs text-fg-subtle">Guests can only be added while an incident is active.</p>
          )}
          <Button type="submit" variant="primary">
            <UserPlus className="h-4 w-4" />
            Add person
          </Button>
        </form>
      </Card>

      {removing && (
        <Modal title={isLive ? `Revoke ${removing.name}'s access?` : `Remove ${removing.name}?`} description="They will lose access to Outpost immediately." onClose={() => setRemoving(null)}>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmRemove}>
              Remove
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
