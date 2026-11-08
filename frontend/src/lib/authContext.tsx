import React, { createContext, useContext, useMemo, useState } from 'react';
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

export interface CurrentUser {
  id: string; // identity hex
  name: string;
  phone: string;
  role: Role; // role in the active incident ('member' if none)
}

interface AuthContextType {
  /** My row in the `user` table, or undefined until I call registerPhone. */
  me: User | undefined;
  isRegistered: boolean;
  /** True once the user table has been replayed from the server. */
  ready: boolean;
  currentUser: CurrentUser;
  /** Incidents I'm a member of, newest first. */
  myIncidents: Incident[];
  activeIncident: Incident | undefined;
  setActiveIncidentId: (id: string) => void;
  connectionStatus: 'connected' | 'disconnected';
  spacetimedbIdentity: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { identity, isActive } = useSpacetimeDB();
  const [users, usersReady] = useTable(tables.user);
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

  const currentUser: CurrentUser = {
    id: identityHex,
    name: me?.displayName ?? 'Unregistered',
    phone: me?.phone ?? '',
    role: (activeMembership && BACKEND_ROLE_TO_UI[activeMembership.role]) || 'member',
  };

  return (
    <AuthContext.Provider
      value={{
        me,
        isRegistered: !!me,
        ready: usersReady,
        currentUser,
        myIncidents,
        activeIncident,
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
