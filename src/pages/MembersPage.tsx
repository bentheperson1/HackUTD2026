import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { Member, Role } from '../lib/types';
import { ROLES } from '../lib/constants';
import { DataTable, Column } from '../components/DataTable';
import { Users, UserPlus, Trash2, AlertCircle } from 'lucide-react';

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
      header: 'Responder Name',
      render: (m) => <strong className="text-white text-sm">{m.name}</strong>,
    },
    {
      header: 'Crisis Role',
      render: (m) => (
        <select
          value={m.role}
          onChange={(e) => handleRoleChange(m.id, e.target.value as Role)}
          className="text-xs font-bold"
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
      header: 'Out-of-Band Phone',
      render: (m) => <span className="font-mono text-xs text-slate-300">{m.phone}</span>,
    },
    {
      header: 'SpacetimeDB Identity',
      render: (m) => (
        <code className="text-[11px] text-slate-400 bg-[#0B0D11] px-2 py-0.5 rounded border border-[#1E2431]" title={m.identity}>
          {m.identity.slice(0, 10)}...{m.identity.slice(-6)}
        </code>
      ),
    },
    {
      header: 'Guest Expiry',
      render: (m) => (
        <span className="text-xs text-slate-400">
          {m.expires_at ? new Date(m.expires_at).toLocaleDateString() : 'Permanent'}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (m) => (
        <button
          onClick={() => handleRemove(m.id)}
          className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/30 transition-all"
          title="Remove Member"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2 m-0">
            <Users className="w-5 h-5 text-hazard-yellow" />
            <span>Crisis Command Team &amp; Roster</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 mb-0">
            Pre-cleared emergency personnel and time-limited outside advisors (forensic counsel, cyber underwriters).
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Error: {error}</span>
        </div>
      )}

      {/* Directory Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 m-0">Authorized Responders</h3>
        <DataTable columns={columns} data={members} />
      </div>

      {/* Add Member Form */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xl">
        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-hazard-yellow" />
          <span>Add Emergency Responder or Advisor</span>
        </h4>

        <form onSubmit={handleAddMember} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Jordan Ellis"
                className="w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Personal Phone (SMS Auth)
              </label>
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Designated Crisis Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
                className="w-full text-xs font-semibold"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {(newRole === 'insurer' || newRole === 'outside_counsel') && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Guest Expiration (Days)
                </label>
                <input
                  type="number"
                  value={guestDays}
                  onChange={(e) => setGuestDays(e.target.value)}
                  min="1"
                  max="90"
                  className="w-full text-xs"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="min-h-[44px] px-6 bg-hazard-yellow hover:bg-hazard-bright text-black font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-hazard-yellow/20 transition-all flex items-center gap-2"
          >
            <span>Add to Crisis Roster</span>
          </button>
        </form>
      </div>
    </div>
  );
};
