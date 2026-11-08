import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2 } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { live } from '../lib/live';
import { useAppState } from '../lib/useAppState';
import { usePersisted } from '../lib/usePersisted';
import { Wordmark } from '../components/Masthead';
import { ROLE_SHORT } from '../components/RoleBadge';
import { Field } from '../components/Field';
import { Alert, Button, cx } from '../components/ui';

/**
 * Sign-in, in the order the backend needs it:
 *   1. register_phone (personal phone + display name)
 *   2. create_organization (you become owner) OR get added by your owner
 * Demo mode (no server): pick anyone from the demo roster.
 * The one-tap "registered people" list is a testing shortcut, hidden unless switched on below.
 */
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isSignedIn, account, mode, liveStatus, signIn, createCompany, switchToPhone } = useAuth();
  const demoMembers = useAppState((s) => s.members);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [submitted, setSubmitted] = useState(false);
  const [company, setCompany] = useState('');
  const [industry, setIndustry] = useState('');
  const [showShortcuts] = usePersisted('fifth_edge_show_signin_shortcuts', false); // toggle is commented out below

  const attempt = async (fn: () => Promise<void>, thenGo = false) => {
    setError('');
    setBusy(true);
    try {
      await fn();
      if (thenGo) navigate('/incident');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  // Live: once the server shows us on a roster, go in
  const stage = account?.stage;
  useEffect(() => {
    if (mode === 'live' && isSignedIn && stage === 'ready' && submitted) navigate('/incident');
  }, [mode, isSignedIn, stage, submitted, navigate]);

  // Quick sign-in list: registered users (live) or the demo roster
  const quick =
    mode === 'live'
      ? live.registeredUsers().map((u) => ({ key: u.phone, name: u.name, phone: u.phone, sub: u.role ? ROLE_SHORT[u.role] : 'no company yet' }))
      : demoMembers.map((m) => ({ key: m.id, name: m.name, phone: m.phone, sub: ROLE_SHORT[m.role] ?? m.role }));

  const needsCompany = mode === 'live' && stage === 'no-org';

  // Only a new number picks a name. A number that's already registered keeps its name (the server enforces this too).
  const last10 = (p: string) => p.replace(/\D/g, '').slice(-10);
  const isNewNumber = mode === 'live' && !live.registeredUsers().some((u) => last10(u.phone) === last10(phone));
  const codeReady = code.trim().length === 6 && (!isNewNumber || !!name.trim());

  return (
    <div className="flex min-h-screen bg-bg text-fg">
      <section className="hidden w-[50%] flex-col justify-between border-r border-line-strong bg-surface p-12 lg:flex">
        <Wordmark size="lg" />
        <div className="max-w-md space-y-4">
          <h1 className="font-display text-[64px] leading-[0.92] font-bold uppercase">When your network is compromised, your response shouldn't be.</h1>
          <p className="text-fg-muted">Separate from company email and chat, so it keeps working when they don't.</p>
        </div>
        <p className="text-xs text-fg-subtle">Made by Fifth Edge</p>
      </section>

      <section className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm space-y-8">
          <Wordmark className="lg:hidden" />

          <div className="space-y-1.5">
            <h2 className="font-display text-[32px] leading-none font-bold uppercase">{needsCompany ? 'Your company' : 'Sign in'}</h2>
            <p className="text-sm text-fg-muted">
              {needsCompany
                ? 'Create your company, or ask your owner to add your phone number.'
                : 'Use your personal phone number.'}
            </p>
            <p className="pt-1 text-xs text-fg-subtle">
              {mode === 'live' ? 'Connected' : liveStatus === 'connecting' ? 'Connecting…' : 'Offline demo'}
            </p>
            {error && (
              <div className="pt-2">
                <Alert tone="error">{error}</Alert>
              </div>
            )}
          </div>

          {needsCompany ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (company.trim()) attempt(() => createCompany(company, industry), true);
              }}
              className="space-y-4"
            >
              <Field label="Company name" htmlFor="company">
                <input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Logistics" maxLength={100} />
              </Field>
              <Field label="Industry (optional)" htmlFor="industry">
                <input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Healthcare, retail, logistics…" maxLength={60} />
              </Field>
              <Button type="submit" variant="primary" size="lg" block disabled={busy || !company.trim()}>
                <Building2 className="h-4 w-4" />
                Create company
              </Button>
              <p className="text-xs text-fg-subtle">Joining a company? Once your manager adds you, this screen moves on by itself.</p>
            </form>
          ) : (
            step === 'phone' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (last10(phone).length < 10) return setError('Enter a full phone number.');
                  setError('');
                  setCode('');
                  setStep('code');
                }}
                className="space-y-4"
              >
                <Field label="Personal phone" htmlFor="phone">
                  <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="font-mono" autoComplete="tel" autoFocus />
                </Field>
                <Button type="submit" variant="primary" size="lg" block disabled={!phone.trim()}>
                  Text me a code
                </Button>
              </form>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!codeReady) return;
                  setSubmitted(true);
                  attempt(() => signIn(phone, name, code), mode !== 'live');
                }}
                className="space-y-4"
              >
                <p className="text-sm text-fg-muted">
                  We texted a 6-digit code to <span className="font-mono text-fg">{phone}</span>.
                </p>
                <Field label="Code" htmlFor="code">
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="h-14 text-center font-mono text-2xl tracking-[0.4em]"
                    autoFocus
                  />
                </Field>
                {isNewNumber && (
                  <Field label="Your name" htmlFor="name" help="New number, so tell us who you are.">
                    <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Rivera" maxLength={50} autoComplete="name" />
                  </Field>
                )}
                <Button type="submit" variant="primary" size="lg" block disabled={busy || !codeReady}>
                  Verify and sign in
                </Button>
                <button type="button" onClick={() => setStep('phone')} className="text-[13px] font-medium text-fg-muted hover:text-fg">
                  Use a different number
                </button>
              </form>
            )
          )}

          {isSignedIn && !needsCompany && (
            <button type="button" onClick={() => navigate('/incident')} className="flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover">
              Continue as {currentUser.name.split(' ')[0]} <ArrowRight className="h-4 w-4" />
            </button>
          )}

          {showShortcuts && quick.length > 0 && (
            <div className="space-y-3 border-t border-line-strong pt-5">
              <span className="text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase">{mode === 'live' ? 'Registered people' : 'Demo people'}</span>
              <div className="grid grid-cols-2 border-t border-l border-line">
                {quick.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    disabled={busy}
                    onClick={() => attempt(() => switchToPhone(m.phone, m.name), true)}
                    title={mode === 'live' ? 'Sign in as this person in this browser (demo shortcut)' : undefined}
                    className={cx(
                      'border-r border-b border-line px-3 py-2.5 text-left transition-colors',
                      isSignedIn && currentUser.name === m.name ? 'bg-surface shadow-[inset_0_-2px_0_var(--color-accent)]' : 'hover:bg-surface'
                    )}
                  >
                    <div className="truncate text-sm text-fg">{m.name}</div>
                    <div className="text-xs text-fg-subtle">{m.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/*<label className="flex cursor-pointer items-center gap-2 text-xs text-fg-subtle select-none">
            <input type="checkbox" checked={showShortcuts} onChange={(e) => setShowShortcuts(e.target.checked)} />
            Show test sign-in shortcuts
          </label>*/}
        </div>
      </section>
    </div>
  );
};
