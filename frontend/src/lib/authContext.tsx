import React, { createContext, useContext, useMemo, useState } from 'react';
import type { Identity } from 'spacetimedb';
import { useSpacetimeDB, useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import type { Incident, Organization, OrgMember, User } from '../module_bindings/types';
import { Role } from './types';
import { isIncidentOpen, toUiRole } from './live';

export interface CurrentUser {
  id: string; // identity hex
  name: string;
  phone: string;
  /** Role in the active incident, falling back to the company role. Null if neither. */
  role: Role | null;
}

interface AuthContextType {
  /** My row in the `user` table, or undefined until I call registerPhone. */
  me: User | undefined;
  isRegistered: boolean;
  /** True once the user table has been replayed from the server. */
  ready: boolean;
  currentUser: CurrentUser;

  /** Companies I belong to, and the one I'm working in. */
  myOrgs: Organization[];
  activeOrg: Organization | undefined;
  orgMembership: OrgMember | undefined;
  /** Company admin: sees the leadership chat, manages the roster. */
  isAdmin: boolean;
  setActiveOrgId: (id: bigint) => void;

  /** Incidents I can see (member or unexpired guest), open ones first, then newest. */
  myIncidents: Incident[];
  activeIncident: Incident | undefined;
  /** My role in the active incident, as the backend spells it (e.g. "ItLead"). */
  incidentRole: string | undefined;
  setActiveIncidentId: (id: string) => void;

  connectionStatus: 'connected' | 'disconnected';
  spacetimedbIdentity: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { identity, isActive } = useSpacetimeDB();
  const [users, usersReady] = useTable(tables.user);
  const [orgs] = useTable(tables.organization);
  const [orgMembers] = useTable(tables.orgMember);
  const [incidents] = useTable(tables.incident);
  const [incidentMembers] = useTable(tables.incidentMember);
  const [guestGrants] = useTable(tables.guestGrant);
  const [pickedOrgId, setActiveOrgId] = useState<bigint | null>(null);
  const [pickedIncidentId, setActiveIncidentId] = useState<string | null>(null);

  const identityHex = identity?.toHexString() ?? '';
  const isMe = (who: Identity) => !!identity && who.isEqual(identity);
  const me = users.find((u) => isMe(u.id));

  const myOrgMemberships = orgMembers.filter((m) => isMe(m.person));
  const myOrgs = orgs.filter((o) => myOrgMemberships.some((m) => m.orgId === o.id));
  const activeOrg = myOrgs.find((o) => o.id === pickedOrgId) ?? myOrgs[0];
  const orgMembership = myOrgMemberships.find((m) => m.orgId === activeOrg?.id);

  // incidentId -> my role: membership wins over an unexpired guest grant (same as FindIncidentRole)
  const roleIn = useMemo(() => {
    const map = new Map<string, string>();
    if (!identity) return map;
    const nowMicros = BigInt(Date.now()) * 1000n;
    for (const g of guestGrants) {
      if (g.person.isEqual(identity) && g.expiresAt.microsSinceUnixEpoch > nowMicros) map.set(g.incidentId, g.role);
    }
    for (const m of incidentMembers) if (m.person.isEqual(identity)) map.set(m.incidentId, m.role);
    return map;
  }, [incidentMembers, guestGrants, identity]);

  const myIncidents = useMemo(
    () =>
      incidents
        .filter((i) => roleIn.has(i.id))
        .sort((a, b) => {
          const open = Number(isIncidentOpen(b.status)) - Number(isIncidentOpen(a.status));
          return open || Number(b.openedAt.microsSinceUnixEpoch - a.openedAt.microsSinceUnixEpoch);
        }),
    [incidents, roleIn]
  );

  const activeIncident = myIncidents.find((i) => i.id === pickedIncidentId) ?? myIncidents[0];
  const incidentRole = activeIncident ? roleIn.get(activeIncident.id) : undefined;
  const roleString = incidentRole ?? orgMembership?.role;

  const currentUser: CurrentUser = {
    id: identityHex,
    name: me?.displayName ?? 'Unregistered',
    phone: me?.phone ?? '',
    role: roleString ? toUiRole(roleString) : null,
  };

  return (
    <AuthContext.Provider
      value={{
        me,
        isRegistered: !!me,
        ready: usersReady,
        currentUser,
        myOrgs,
        activeOrg,
        orgMembership,
        isAdmin: !!orgMembership?.isAdmin,
        setActiveOrgId,
        myIncidents,
        activeIncident,
        incidentRole,
        setActiveIncidentId,
        connectionStatus: isActive ? 'connected' : 'disconnected',
        spacetimedbIdentity: identityHex,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
