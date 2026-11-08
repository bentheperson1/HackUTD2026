import React, { createContext, useContext, useMemo, useState } from 'react';
<<<<<<< Updated upstream
import type { Identity } from 'spacetimedb';
import { useSpacetimeDB, useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import type { Incident, Organization, OrgMember, User } from '../module_bindings/types';
import { Role } from './types';
import { isIncidentOpen, toUiRole } from './live';
=======
import { useSpacetimeDB, useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import type { Incident, User } from '../module_bindings/types';
import { Role } from './types';

// Backend roles live on IncidentMember.role; map them onto the UI's Role type
const BACKEND_ROLE_TO_UI: Record<string, Role> = {
  Owner: 'owner',
  IT: 'it_lead',
  Legal: 'legal',
  Comms: 'comms',
  Member: 'member',
};

export const UI_ROLE_TO_BACKEND: Partial<Record<Role, string>> = {
  owner: 'Owner',
  it_lead: 'IT',
  legal: 'Legal',
  comms: 'Comms',
  member: 'Member',
};
>>>>>>> Stashed changes

export interface CurrentUser {
  id: string; // identity hex
  name: string;
  phone: string;
<<<<<<< Updated upstream
  /** Role in the active incident, falling back to the company role. Null if neither. */
  role: Role | null;
=======
  role: Role; // role in the active incident ('member' if none)
>>>>>>> Stashed changes
}

interface AuthContextType {
  /** My row in the `user` table, or undefined until I call registerPhone. */
  me: User | undefined;
  isRegistered: boolean;
  /** True once the user table has been replayed from the server. */
  ready: boolean;
  currentUser: CurrentUser;
<<<<<<< Updated upstream

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

=======
  /** Incidents I'm a member of, newest first. */
  myIncidents: Incident[];
  activeIncident: Incident | undefined;
  setActiveIncidentId: (id: string) => void;
>>>>>>> Stashed changes
  connectionStatus: 'connected' | 'disconnected';
  spacetimedbIdentity: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { identity, isActive } = useSpacetimeDB();
  const [users, usersReady] = useTable(tables.user);
<<<<<<< Updated upstream
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
=======
  const [incidents] = useTable(tables.incident);
  const [memberships] = useTable(tables.incidentMember);
  const [pickedIncidentId, setActiveIncidentId] = useState<string | null>(null);

  const identityHex = identity?.toHexString() ?? '';
  const me = identity ? users.find((u) => u.id.isEqual(identity)) : undefined;

  const myMemberships = useMemo(
    () => (identity ? memberships.filter((m) => m.person.isEqual(identity)) : []),
    [memberships, identity]
  );

  const myIncidents = useMemo(() => {
    const ids = new Set(myMemberships.map((m) => m.incidentId));
    return incidents
      .filter((i) => ids.has(i.id))
      .sort((a, b) => Number(b.openedAt.microsSinceUnixEpoch - a.openedAt.microsSinceUnixEpoch));
  }, [incidents, myMemberships]);

  const activeIncident = myIncidents.find((i) => i.id === pickedIncidentId) ?? myIncidents[0];
  const activeMembership = myMemberships.find((m) => m.incidentId === activeIncident?.id);
>>>>>>> Stashed changes

  const currentUser: CurrentUser = {
    id: identityHex,
    name: me?.displayName ?? 'Unregistered',
    phone: me?.phone ?? '',
<<<<<<< Updated upstream
    role: roleString ? toUiRole(roleString) : null,
=======
    role: (activeMembership && BACKEND_ROLE_TO_UI[activeMembership.role]) || 'member',
>>>>>>> Stashed changes
  };

  return (
    <AuthContext.Provider
      value={{
        me,
        isRegistered: !!me,
        ready: usersReady,
        currentUser,
<<<<<<< Updated upstream
        myOrgs,
        activeOrg,
        orgMembership,
        isAdmin: !!orgMembership?.isAdmin,
        setActiveOrgId,
        myIncidents,
        activeIncident,
        incidentRole,
=======
        myIncidents,
        activeIncident,
>>>>>>> Stashed changes
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
