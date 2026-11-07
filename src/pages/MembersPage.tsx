import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { Member, Role } from '../lib/types';
import { ROLES } from '../lib/constants';
import { DataTable, Column } from '../components/DataTable';
import { RoleBadge } from '../components/RoleBadge';
import { Field } from '../components/Field';

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

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newName.trim() || !newPhone.trim()) {
      setError('Name and phone are required.');
      return;
    }

    const expiresAt =
      newRole === 'insurer' || newRole === 'outside_counsel'
        ? new Date(Date.now() + parseInt(guestDays, 10) * 86400000).toISOString()
        : null;

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
    if (confirm('Are you sure you want to remove this crisis response member?')) {
      const res = store.removeMember(currentUser.name, memberId);
      if (!res.success) {
        setError(res.error || 'Failed to remove member');
      }
    }
  };

  const columns: Column<Member>[] = [
    {
      header: 'Name',
      render: (m) => <strong>{m.name}</strong>,
    },
    {
      header: 'Role',
      render: (m) => (
        <div>
          <RoleBadge role={m.role} />
          <div style={{ marginTop: '4px' }}>
            <select
              value={m.role}
              onChange={(e) => handleRoleChange(m.id, e.target.value as Role)}
              style={{ fontSize: '0.85em' }}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ),
    },
    {
      header: 'Phone (Out-of-Band)',
      render: (m) => m.phone,
    },
    {
      header: 'SpacetimeDB Identity',
      render: (m) => (
        <code title={m.identity}>
          {m.identity.slice(0, 10)}...{m.identity.slice(-6)}
        </code>
      ),
    },
    {
      header: 'Guest Expiration',
      render: (m) => (m.expires_at ? new Date(m.expires_at).toLocaleDateString() : 'Permanent'),
    },
    {
      header: 'Actions',
      render: (m) => (
        <button onClick={() => handleRemove(m.id)} style={{ color: 'red' }}>
          Remove
        </button>
      ),
    },
  ];

  return (
    <div>
      <h3>Crisis Team &amp; Role-Based Access Control</h3>
      <p>
        Manage pre-cleared crisis personnel and emergency outside advisors (insurers, forensic counsel).
        Role-based access is strictly enforced in backend reducers and database views.
      </p>

      {error && <div style={{ color: 'red', fontWeight: 'bold', marginBottom: '10px' }}>Error: {error}</div>}

      <div style={{ marginBottom: '24px' }}>
        <h4>Authorized Members</h4>
        <DataTable columns={columns} data={members} />
      </div>

      <fieldset style={{ padding: '16px' }}>
        <legend><strong>Add Incident Response Member / Advisor</strong></legend>
        <form onSubmit={handleAddMember}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <Field label="Full Name">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Jordan Ellis"
                style={{ padding: '6px', width: '220px' }}
              />
            </Field>

            <Field label="Personal Phone (SMS Auth)">
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                style={{ padding: '6px', width: '200px' }}
              />
            </Field>

            <Field label="Designated Role">
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
                style={{ padding: '6px' }}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>

            {(newRole === 'insurer' || newRole === 'outside_counsel') && (
              <Field label="Guest Access Expiration (Days)">
                <input
                  type="number"
                  value={guestDays}
                  onChange={(e) => setGuestDays(e.target.value)}
                  min="1"
                  max="90"
                  style={{ padding: '6px', width: '80px' }}
                />
              </Field>
            )}
          </div>

          <button type="submit" style={{ padding: '8px 16px', fontWeight: 'bold' }}>
            Add Authorized Member
          </button>
        </form>
      </fieldset>
    </div>
  );
};

