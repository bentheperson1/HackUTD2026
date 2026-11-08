import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { useAppState } from '../lib/useAppState';
import { Wordmark } from '../components/Masthead';
import { ROLE_SHORT } from '../components/RoleBadge';
import { Field } from '../components/Field';
import { Alert, Button, cx } from '../components/ui';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, switchUser, loginAsTestUser, signInWithPhone, mode, liveStatus } = useAuth();
  const members = useAppState((s) => s.members);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Runs a sign-in action, shows the server's error if it fails, otherwise enters the app
  const attempt = async (fn: () => Promise<void>) => {
    setError('');
    setBusy(true);
    try {
      await fn();
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };
  const [phone, setPhone] = useState('+1 (555) 302-8841');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [message, setMessage] = useState('');

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setIsOtpSent(true);
    setMessage('Code sent to your phone. Demo code: 849201');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO (real version): verify the code with the SMS provider before linking the phone
    attempt(() => signInWithPhone(phone));
  };

  const handleQuickAdminLogin = () => attempt(loginAsTestUser);

  return (
    <div className="flex min-h-screen bg-bg text-fg">
      {/* Left: what this is */}
      <section className="hidden w-[50%] flex-col justify-between border-r border-line-strong bg-surface p-12 lg:flex">
        <Wordmark />
        <div className="max-w-md space-y-4">
          <h1 className="font-display text-[64px] leading-[0.92] font-bold uppercase">When your network is compromised, your response shouldn't be.</h1>
          <p className="text-fg-muted">
            A crisis command center that runs on separate servers and separate logins. Nothing here touches company email, Slack or SSO.
          </p>
        </div>
        <ul className="space-y-2.5 text-sm text-fg-muted">
          {['Isolated from company infrastructure', 'Personal phone sign-in, passkeys next', 'Append-only audit log'].map((t) => (
            <li key={t} className="flex items-center gap-2.5">
              <span className="h-2 w-2 bg-accent" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      {/* Right: sign in */}
      <section className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm space-y-8">
          <Wordmark className="lg:hidden" />

          <div className="space-y-1.5">
            <h2 className="font-display text-[32px] leading-none font-bold uppercase">Sign in</h2>
            <p className="text-sm text-fg-muted">Use the personal phone number on your company's crisis roster.</p>
            <p className="pt-1 text-xs text-fg-subtle">
              {mode === 'live' ? 'Connected to SpacetimeDB. Sign-in links this browser to your roster entry.' : liveStatus === 'connecting' ? 'Connecting to SpacetimeDB…' : 'Demo mode: SpacetimeDB not connected, using local demo data.'}
            </p>
            {error && <div className="pt-2"><Alert tone="error">{error}</Alert></div>}
          </div>

          {!isOtpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <Field label="Phone number" htmlFor="phone">
                <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="font-mono" autoComplete="tel" />
              </Field>
              <Button type="submit" variant="primary" size="lg" block>
                Send code
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {message && <Alert tone="success">{message}</Alert>}
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
              <Button type="submit" variant="primary" size="lg" block>
                <KeyRound className="h-4 w-4" />
                Verify and continue
              </Button>
              <button type="button" onClick={() => setIsOtpSent(false)} className="w-full text-center text-xs text-fg-subtle hover:text-fg">
                Use a different number
              </button>
            </form>
          )}

          <div className="space-y-3 border-t border-line-strong pt-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase">Demo access</span>
              <button type="button" onClick={handleQuickAdminLogin} className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover">
                Enter as owner <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 border-t border-l border-line">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => attempt(() => switchUser(m.id))}
                  disabled={busy}
                  className={cx(
                    'border-r border-b border-line px-3 py-2.5 text-left transition-colors',
                    currentUser.id === m.id ? 'bg-surface shadow-[inset_0_-2px_0_var(--color-accent)]' : 'hover:bg-surface'
                  )}
                >
                  <div className="truncate text-sm text-fg">{m.name}</div>
                  <div className="text-xs text-fg-subtle">{ROLE_SHORT[m.role] ?? m.role}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
