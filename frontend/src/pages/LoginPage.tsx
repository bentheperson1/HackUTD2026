import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, KeyRound } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { live } from '../lib/live';
import { useAppState } from '../lib/useAppState';
import { Wordmark } from '../components/Masthead';
import { ROLE_SHORT } from '../components/RoleBadge';
import { Field } from '../components/Field';
import { Alert, Button, cx } from '../components/ui';

/**
 * Sign-in, in the order the backend needs it:
 *   1. register_phone (personal phone + display name)
 *   2. create_organization (you become owner) OR get added by your owner
 * Demo mode (no server): pick anyone from the demo roster.
 */
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isSignedIn, account, mode, liveStatus, signIn, createCompany, switchToPhone } = useAuth();
  const demoMembers = useAppState((s) => s.members);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [company, setCompany] = useState('');
  const [industry, setIndustry] = useState('');

  const attempt = async (fn: () => Promise<void>, thenGo = false) => {
    setError('');
    setBusy(true);
    try {
      await fn();
      if (thenGo) navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  // Live: once the server shows us on a roster, go in
  const stage = account?.stage;
  useEffect(() => {
    if (mode === 'live' && isSignedIn && stage === 'ready' && step === 'code') navigate('/admin');
  }, [mode, isSignedIn, stage, step, navigate]);

  // Quick sign-in list: registered users (live) or the demo roster
  const quick =
    mode === 'live'
      ? live.registeredUsers().map((u) => ({ key: u.phone, name: u.name, phone: u.phone, sub: u.role ? ROLE_SHORT[u.role] : 'no company yet' }))
      : demoMembers.map((m) => ({ key: m.id, name: m.name, phone: m.phone, sub: ROLE_SHORT[m.role] ?? m.role }));

  const needsCompany = mode === 'live' && stage === 'no-org';

  return (
    <div className="flex min-h-screen bg-bg text-fg">
      <section className="hidden w-[50%] flex-col justify-between border-r border-line-strong bg-surface p-12 lg:flex">
        <Wordmark size="lg" />
        <div className="max-w-md space-y-4">
          <h1 className="font-display text-[64px] leading-[0.92] font-bold uppercase">When your network is compromised, your response shouldn't be.</h1>
          <p className="text-fg-muted">A crisis command center that runs on separate servers and separate logins. Nothing here touches company email, Slack or SSO.</p>
        </div>
        <ul className="space-y-2.5 text-sm text-fg-muted">
          {['Isolated from company infrastructure', 'Personal phone sign-in', 'Append-only audit log'].map((t) => (
            <li key={t} className="flex items-center gap-2.5">
              <span className="h-2 w-2 bg-brand" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm space-y-8">
          <Wordmark className="lg:hidden" />

          <div className="space-y-1.5">
            <h2 className="font-display text-[32px] leading-none font-bold uppercase">{needsCompany ? 'Your company' : 'Sign in'}</h2>
            <p className="text-sm text-fg-muted">
              {needsCompany
                ? `Signed in as ${account && 'name' in account ? account.name : ''}. Create your company's crisis room, or ask your owner to add ${account && 'phone' in account ? account.phone : 'your number'}.`
                : "Use your personal phone, not a company account. If the network is compromised, company logins can't be trusted."}
            </p>
            <p className="pt-1 text-xs text-fg-subtle">
              {mode === 'live' ? 'Connected to SpacetimeDB.' : liveStatus === 'connecting' ? 'Connecting to SpacetimeDB…' : 'Demo mode: SpacetimeDB not connected, using local demo data.'}
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
                Create company (you're the owner)
              </Button>
              <p className="text-xs text-fg-subtle">Joining an existing company? Your owner adds you on the Team page with this phone number. This screen moves on by itself.</p>
            </form>
          ) : step === 'phone' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (phone.trim() && (name.trim() || mode !== 'live')) setStep('code');
              }}
              className="space-y-4"
            >
              {mode === 'live' && (
                <Field label="Your name" htmlFor="name">
                  <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Rivera" maxLength={50} autoComplete="name" />
                </Field>
              )}
              <Field label="Personal phone" htmlFor="phone">
                <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="font-mono" autoComplete="tel" />
              </Field>
              <Button type="submit" variant="primary" size="lg" block disabled={!phone.trim() || (mode === 'live' && !name.trim())}>
                Send code
              </Button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                // TODO (real version): verify the code with an SMS provider before register_phone
                attempt(() => signIn(phone, name || currentUser.name), mode !== 'live');
              }}
              className="space-y-4"
            >
              <Alert tone="success">Code sent. Demo: any 6 digits work.</Alert>
              <Field label="6-digit code" htmlFor="otp">
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="h-12 text-center font-mono text-lg tracking-[0.5em]"
                  autoFocus
                />
              </Field>
              <Button type="submit" variant="primary" size="lg" block disabled={busy}>
                <KeyRound className="h-4 w-4" />
                Verify and continue
              </Button>
              <button type="button" onClick={() => setStep('phone')} className="w-full text-center text-xs text-fg-subtle hover:text-fg">
                Use a different number
              </button>
            </form>
          )}

          {quick.length > 0 && (
            <div className="space-y-3 border-t border-line-strong pt-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase">{mode === 'live' ? 'Registered people' : 'Demo access'}</span>
                {isSignedIn && (
                  <button type="button" onClick={() => navigate('/admin')} className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover">
                    Continue as {currentUser.name.split(' ')[0]} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
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
              {mode === 'live' && <p className="text-xs text-fg-subtle">Demo shortcut: the server lets a browser take over a registered number, so you can switch people for a recording.</p>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
