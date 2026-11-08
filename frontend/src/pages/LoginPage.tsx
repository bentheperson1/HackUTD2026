import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReducer, useSpacetimeDB } from 'spacetimedb/react';
import { reducers } from '../module_bindings';
import { useAuth } from '../lib/authContext';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { ShieldAlert, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { isActive } = useSpacetimeDB();
  const { me } = useAuth();
  const registerPhone = useReducer(reducers.registerPhone);
  const [phone, setPhone] = useState(me?.phone ?? '');
  const [displayName, setDisplayName] = useState(me?.displayName ?? '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !displayName.trim()) return;
    setError('');
    setSubmitting(true);
    try {
      // Creates (or updates) the `user` row for this browser's identity
      await registerPhone({ phone, displayName });
      navigate('/incident');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
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
          <h1 className="m-0 type-headline-small">{me ? 'Your profile' : 'Sign in'}</h1>
          <p className="mb-6 mt-2 type-body-medium text-on-surface-variant">
            Use your personal phone number. Company SSO and email are treated as compromised during an incident.
          </p>

          {me && (
            <div className="mb-6 space-y-3">
              <Notice tone="success">
                Signed in as {me.displayName} ({me.phone}).
              </Notice>
              <Button className="w-full" icon={<ArrowRight />} onClick={() => navigate('/incident')}>
                Continue
              </Button>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-6">
            <Field label="Your name">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex Rivera"
                className="w-full"
                autoComplete="name"
                maxLength={50}
              />
            </Field>
            <Field label="Phone number" help="Teammates add you to incidents by this number.">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full font-mono"
                autoComplete="tel"
              />
            </Field>
            {error && <Notice tone="error">{error}</Notice>}
            <Button
              type="submit"
              variant={me ? 'tonal' : 'filled'}
              className="w-full"
              disabled={!isActive || submitting || !phone.trim() || !displayName.trim()}
            >
              {!isActive ? 'Connecting…' : me ? 'Update profile' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
