import React, { createContext, useContext, useState, useEffect } from 'react';
import { Member } from './types';
import { store } from './store';

interface AuthContextType {
  currentUser: Member;
  switchUser: (memberId: string) => void;
  loginAsTestUser: () => void;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  spacetimedbIdentity: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [members, setMembers] = useState<Member[]>(store.getState().members);
  const [currentUserId, setCurrentUserId] = useState<string>(members[0]?.id || 'm-1');

  useEffect(() => {
    return store.subscribe((state) => {
      setMembers(state.members);
      if (!state.members.some((m) => m.id === currentUserId) && state.members.length > 0) {
        setCurrentUserId(state.members[0].id);
      }
    });
  }, [currentUserId]);

  const currentUser: Member = members.find((m) => m.id === currentUserId) || {
    id: 'm-guest',
    identity: 'c2004258960ee969540819c67b374986dbc6a1c460fe0d15269fd01ba21b8cc6',
    name: 'Alex Rivera (Test Commander)',
    phone: '+1 (555) 302-8841',
    role: 'owner',
    org_id: 'org-001',
    expires_at: null,
  };

  const switchUser = (memberId: string) => {
    setCurrentUserId(memberId);
  };

  const loginAsTestUser = () => {
    setCurrentUserId(members[0]?.id || 'm-1');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        switchUser,
        loginAsTestUser,
        connectionStatus: 'connected',
        spacetimedbIdentity: 'c2004258960ee969540819c67b374986dbc6a1c460fe0d15269fd01ba21b8cc6',
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

