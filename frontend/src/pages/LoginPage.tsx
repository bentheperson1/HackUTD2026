import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2 } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { live } from '../lib/live';
import { Wordmark } from '../components/Masthead';
import { Field } from '../components/Field';
import { Alert, Button, StatusDot } from '../components/ui';

/**
 * Sign-in, in the order the backend needs it:
 *   1. register_phone (personal phone + display name)
 *   2. get added by your manager (most people) OR create_organization (you become owner)
 */
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isSignedIn, account, mode, signIn, createCompany } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [submitted, setSubmitted] = useState(false);
  const [company, setCompany] = useState('');
  const [industry, setIndustry] = useState('');

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

  // Live: once the server shows us on a roster, go in. Also covers waiting to be added after a reload.
  const stage = account?.stage;
  const wasWaiting = useRef(false);
  if (stage === 'no-org') wasWaiting.current = true;
  useEffect(() => {
    if (mode === 'live' && isSignedIn && stage === 'ready' && (submitted || wasWaiting.current)) navigate('/incident');
  }, [mode, isSignedIn, stage, submitted, navigate]);
  const [creating, setCreating] = useState(false);

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
          <h1 className="font-display text-[64px] leading-[0.92] font-bold uppercase">
            When your network is compromised, <span className="block text-red-500">your response shouldn't be.</span>
          </h1>
          <p className="text-fg-muted">Separate from company email and chat, so it keeps working when they don't.</p>
        </div>
        <p className="text-xs text-fg-subtle">Made by a 4 college students for HackUTD 2026 in 24 hours</p>
      </section>

      <section className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm space-y-8">
          <Wordmark className="lg:hidden" />

          <div className="space-y-1.5">
            <h2 className="font-display text-[32px] leading-none font-bold uppercase">{needsCompany ? (creating ? 'New company' : 'Almost in') : 'Sign in'}</h2>
            <p className="text-sm text-fg-muted">
              {needsCompany
                ? creating
                  ? "You'll be the owner and can add your team."
                  : 'Ask your manager to add you to the team using this phone number.'
                : 'Use your personal phone number.'}
            </p>
            {error && (
              <div className="pt-2">
                <Alert tone="error">{error}</Alert>
              </div>
            )}
          </div>

          {needsCompany ? (
            !creating ? (
              <div className="space-y-5">
                <div className="border-l-4 border-accent bg-surface px-4 py-4">
                  <div className="text-[11px] font-bold tracking-[0.12em] text-fg-subtle uppercase">Your number</div>
                  <div className="mt-1 font-mono text-[24px] text-fg">{account && 'phone' in account ? account.phone : ''}</div>
                  <div className="mt-3 flex items-center gap-2 text-[13px] text-fg-muted">
                    <StatusDot tone="accent" pulse /> Waiting to be added. This screen moves on by itself.
                  </div>
                </div>
                <p className="text-[13px] text-fg-subtle">
                  Starting Outpost for your business?{' '}
                  <button type="button" onClick={() => setCreating(true)} className="font-semibold text-fg underline underline-offset-4 hover:text-accent-hover">
                    Create a new company
                  </button>
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (company.trim()) attempt(() => createCompany(company, industry), true);
                }}
                className="space-y-4"
              >
                <Field label="Company name" htmlFor="company">
                  <input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Logistics" maxLength={100} autoFocus />
                </Field>
                <Field label="Industry (optional)" htmlFor="industry">
                  <input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Healthcare, retail, logistics…" maxLength={60} />
                </Field>
                <Button type="submit" variant="primary" size="lg" block disabled={busy || !company.trim()}>
                  <Building2 className="h-4 w-4" />
                  Create company
                </Button>
                <button type="button" onClick={() => setCreating(false)} className="text-[13px] font-medium text-fg-muted hover:text-fg">
                  Back: my company already uses Outpost
                </button>
              </form>
            )
          ) : step === 'phone' ? (
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
          )}

          {isSignedIn && !needsCompany && (
            <button type="button" onClick={() => navigate('/incident')} className="flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover">
              Continue as {currentUser.name.split(' ')[0]} <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>
    </div>
  );
};