import React, { createContext, useContext, useEffect, useState } from 'react';
import { Member } from './types';
import { store } from './store';
import { live, LiveStatus } from './live';

interface AuthContextType {
  currentUser: Member;
  /** In live mode: true once this browser's identity is linked to a roster phone. Always true in demo mode. */
  isSignedIn: boolean;
  mode: 'live' | 'demo';
  liveStatus: LiveStatus;
  /** Demo: switch persona locally. Live: claim that roster member's phone (no SMS yet). */
  switchUser: (memberId: string) => Promise<void>;
  /** Sign in with a phone number. Live: calls the register_phone reducer. */
  signInWithPhone: (phone: string) => Promise<void>;
  loginAsTestUser: () => Promise<void>;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  spacetimedbIdentity: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST: Member = {
  id: 'm-guest',
  identity: '',
  name: 'Not signed in',
  phone: '',
  role: 'comms',
  org_id: '',
  expires_at: null,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [members, setMembers] = useState<Member[]>(store.getState().members);
  const [demoUserId, setDemoUserId] = useState<string>(members[0]?.id || 'm-1');
  const [, force] = useState(0);

  useEffect(() => store.subscribe((state) => setMembers(state.members)), []);
  useEffect(() => live.subscribe(() => force((n) => n + 1)), []);

  const mode = store.mode();

  let currentUser: Member;
  let isSignedIn: boolean;
  if (mode === 'live') {
    const me = members.find((m) => m.id === live.myMemberId);
    currentUser = me ?? GUEST;
    isSignedIn = !!me;
  } else {
    currentUser = members.find((m) => m.id === demoUserId) ?? members[0] ?? GUEST;
    isSignedIn = true;
  }

  const signInWithPhone = async (phone: string) => {
    if (store.mode() === 'live') {
      await live.call('registerPhone', { phone });
      return;
    }
    const digits = phone.replace(/\D/g, '').slice(-10);
    const match = members.find((m) => m.phone.replace(/\D/g, '').slice(-10) === digits) || members[0];
    if (match) setDemoUserId(match.id);
  };

  const switchUser = async (memberId: string) => {
    const m = members.find((x) => x.id === memberId);
    if (!m) return;
    if (store.mode() === 'live') {
      await live.call('registerPhone', { phone: m.phone });
    } else {
      setDemoUserId(memberId);
    }
  };

  const loginAsTestUser = async () => {
    const owner = members.find((m) => m.role === 'owner') ?? members[0];
    if (owner) await switchUser(owner.id);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isSignedIn,
        mode,
        liveStatus: live.status,
        switchUser,
        signInWithPhone,
        loginAsTestUser,
        connectionStatus: live.status === 'live' ? 'connected' : live.status === 'connecting' ? 'connecting' : 'disconnected',
        spacetimedbIdentity: live.identityHex,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
