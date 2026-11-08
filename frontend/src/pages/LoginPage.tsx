import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { roleLabel } from '../components/RoleBadge';
import { ShieldAlert, Check, ArrowLeft } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, switchUser, loginAsTestUser } = useAuth();
  const [members] = useState(store.getState().members);
  const [phone, setPhone] = useState('+1 (555) 302-8841');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [message, setMessage] = useState('');

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setIsOtpSent(true);
    setMessage('Code sent. In this demo, any code works (try 849201).');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const match = members.find((m) => m.phone.trim() === phone.trim()) || members[0];
    switchUser(match.id);
    navigate('/admin');
  };

  const handleQuickAdminLogin = () => {
    loginAsTestUser();
    navigate('/admin');
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-surface px-4 py-12 text-on-surface md:items-center">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container text-on-primary-container">
            <ShieldAlert className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <span className="type-title-large">Drill Night</span>
        </div>

        <div className="rounded-[28px] bg-surface-container-low p-6 md:p-8">
          <h1 className="m-0 type-headline-small">Sign in</h1>
          <p className="mb-6 mt-2 type-body-medium text-on-surface-variant">
            Use the personal phone number on the response roster. Company SSO and email are treated as compromised
            during an incident.
          </p>

          {!isOtpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <Field label="Phone number" help="Must match a number on the roster.">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full font-mono"
                  autoComplete="tel"
                />
              </Field>
              <Button type="submit" className="w-full">
                Text me a code
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              {message && <Notice tone="success">{message}</Notice>}
              <Field label="6-digit code">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="000000"
                  className="w-full text-center font-mono text-lg tracking-[0.4em]"
                  autoFocus
                />
              </Field>
              <div className="flex items-center justify-between gap-2">
                <Button variant="text" icon={<ArrowLeft />} onClick={() => setIsOtpSent(false)}>
                  Change number
                </Button>
                <Button type="submit">Verify</Button>
              </div>
            </form>
          )}
        </div>

        <section className="mt-8">
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 className="m-0 type-title-small text-on-surface-variant">Demo personas</h2>
            <Button variant="text" onClick={handleQuickAdminLogin}>
              Skip as commander
            </Button>
          </div>
          <ul className="m-0 list-none overflow-hidden rounded-xl border border-outline-variant p-0">
            {members.map((m) => {
              const isCurrent = currentUser.id === m.id;
              return (
                <li key={m.id} className="border-b border-outline-variant last:border-b-0">
                  <button
                    onClick={() => {
                      switchUser(m.id);
                      navigate('/admin');
                    }}
                    className={`state-layer flex w-full items-center gap-3 px-4 py-3 text-left ${
                      isCurrent ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate type-body-large">{m.name}</div>
                      <div className="type-body-small opacity-75">{roleLabel(m.role)}</div>
                    </div>
                    {isCurrent && <Check className="h-5 w-5 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
};
