import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { Member, Role } from '../lib/types';
import { ROLES } from '../lib/constants';
import { DataTable, Column } from '../components/DataTable';
import { Button, IconButton } from '../components/Button';
import { Card, SectionTitle } from '../components/Card';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';
import { Trash2 } from 'lucide-react';

export const MembersPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [members, setMembers] = useState<Member[]>(store.getState().members);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<Role>('it_lead');
  const [guestDays, setGuestDays] = useState('7');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return store.subscribe((state) => {
      setMembers(state.members);
    });
  }, []);

  const isGuestRole = newRole === 'insurer' || newRole === 'outside_counsel';

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newName.trim() || !newPhone.trim()) {
      setError('Name and phone are required.');
      return;
    }

    const expiresAt = isGuestRole ? new Date(Date.now() + parseInt(guestDays, 10) * 86400000).toISOString() : null;

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
    if (!res.success) {
      setError(res.error || 'Failed to update role');
    }
  };

  const handleRemove = (memberId: string) => {
    if (confirm('Remove this person from the response roster?')) {
      const res = store.removeMember(currentUser.name, memberId);
      if (!res.success) {
        setError(res.error || 'Failed to remove member');
      }
    }
  };

  const columns: Column<Member>[] = [
    {
      header: 'Name',
      render: (m) => m.name,
    },
    {
      header: 'Role',
      render: (m) => (
        <select
          aria-label={`Role for ${m.name}`}
          value={m.role}
          onChange={(e) => handleRoleChange(m.id, e.target.value as Role)}
          className="h-9 py-0"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      header: 'Phone',
      render: (m) => <span className="whitespace-nowrap font-mono text-on-surface-variant">{m.phone}</span>,
    },
    {
      header: 'Identity',
      render: (m) => (
        <code className="font-mono type-body-small text-on-surface-variant" title={m.identity}>
          {m.identity.slice(0, 8)}…{m.identity.slice(-4)}
        </code>
      ),
    },
    {
      header: 'Access until',
      render: (m) => (
        <span className="whitespace-nowrap text-on-surface-variant">
          {m.expires_at ? new Date(m.expires_at).toLocaleDateString() : 'No expiry'}
        </span>
      ),
    },
    {
      header: '',
      align: 'right',
      render: (m) => (
        <IconButton label={`Remove ${m.name}`} onClick={() => handleRemove(m.id)} className="hover:text-error">
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

      <section>
        <SectionTitle trailing={`${members.length} people`}>Responders</SectionTitle>
        <DataTable columns={columns} data={members} />
      </section>

      <Card className="p-5">
        <SectionTitle>Add a person</SectionTitle>
        <form onSubmit={handleAddMember} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Full name">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Jordan Ellis"
                className="w-full"
              />
            </Field>

            <Field label="Personal phone">
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
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>

            {isGuestRole && (
              <Field label="Access length (days)">
                <input
                  type="number"
                  value={guestDays}
                  onChange={(e) => setGuestDays(e.target.value)}
                  min="1"
                  max="90"
                  className="w-full"
                />
              </Field>
            )}
          </div>

          <Button type="submit">Add to roster</Button>
        </form>
      </Card>
    </div>
  );
};
