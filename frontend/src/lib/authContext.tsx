import React, { createContext, useContext, useEffect, useState } from 'react';
import { Member } from './types';
import { store } from './store';
import { ACTIVE_ORG_KEY, live, LiveAccount, LiveStatus } from './live';
import { TOKEN_KEY } from './config';

interface AuthContextType {
  currentUser: Member;
  /** Live: phone registered AND on a company roster (or a guest). Demo: always true. */
  isSignedIn: boolean;
  /** Live onboarding stage (null in demo mode) */
  account: LiveAccount | null;
  mode: 'live' | 'demo';
  liveStatus: LiveStatus;
  /** Checks the code, then live: register_phone (creates the user, or signs in as the existing one). Demo: pick the roster member. */
  signIn: (phone: string, name: string, code: string) => Promise<void>;
  /** Live only: create_organization (you become its owner). */
  createCompany: (name: string, industry: string) => Promise<void>;
  /** Demo: switch persona. Live: take over that registered phone (the backend allows it for demos). */
  switchToPhone: (phone: string, name: string) => Promise<void>;
  /** Sign out completely. Live: forget this browser's login token and reload, so the next sign-in is a fresh account. */
  signOut: () => void;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  spacetimedbIdentity: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST: Member = { id: 'm-guest', identity: '', name: 'Not signed in', phone: '', role: 'comms', org_id: '', expires_at: null };

const digits = (p: string) => p.replace(/\D/g, '').slice(-10);

/** Prototype: no texts are sent and everyone uses this code. Checked here in the browser only. */
export const DEMO_SMS_CODE = '123456';

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
    currentUser = me ?? { ...GUEST, identity: live.identityHex };
    isSignedIn = !!me;
  } else {
    currentUser = members.find((m) => m.id === demoUserId) ?? members[0] ?? GUEST;
    isSignedIn = true;
  }

  const signIn = async (phone: string, name: string, code: string) => {
    if (code.trim() !== DEMO_SMS_CODE) throw new Error('That code is wrong. Check the text message and try again.');
    if (store.mode() === 'live') {
      // A number that's already registered keeps its stored name; only a new number uses the typed one.
      // register_phone overwrites the name with whatever it's given, so send the stored one back.
      const existing = live.registeredUsers().find((u) => digits(u.phone) === digits(phone));
      await live.call('registerPhone', { phone, displayName: existing ? existing.name : name.trim() });
      return;
    }
    const match = members.find((m) => digits(m.phone) === digits(phone));
    if (!match) throw new Error('No one on the demo roster has that number. Try one of the demo people below.');
    setDemoUserId(match.id);
  };

  const createCompany = async (name: string, industry: string) => {
    if (store.mode() !== 'live') throw new Error("You're offline. Reconnect to create a company.");
    await live.call('createOrganization', { name: name.trim(), industry: industry.trim() });
  };

  const switchToPhone = async (phone: string, name: string) => {
    if (store.mode() === 'live') {
      await live.call('registerPhone', { phone, displayName: name });
      return;
    }
    const match = members.find((m) => digits(m.phone) === digits(phone));
    if (match) setDemoUserId(match.id);
  };

  const signOut = () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('fifth_edge_checklist'); // ticks belong to the person who made them
      localStorage.removeItem(ACTIVE_ORG_KEY);
    } catch {
      /* storage unavailable */
    }
    // A full reload drops the old connection; with no token the server hands out a new identity
    window.location.assign('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isSignedIn,
        account: mode === 'live' ? live.account : null,
        mode,
        liveStatus: live.status,
        signIn,
        createCompany,
        switchToPhone,
        signOut,
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
