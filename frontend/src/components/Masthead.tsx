import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useSpacetimeDB } from 'spacetimedb/react';
import { LogOut, RadioTower } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { live } from '../lib/live';
import { useAppState, useNow } from '../lib/useAppState';
import { ROLE_SHORT } from './RoleBadge';
import { PLACES } from './places';
import { Button, IconButton, Modal, StatusDot, formatClock, titleCase, cx } from './ui';

/** Nav groups, built from PLACES so the nav always matches page titles. Overview (/admin) is kept but not linked. */
export const NAV = (['Anytime', 'Respond', 'Record', 'Prepare'] as const).map((group) => ({ group, items: PLACES.filter((p) => p.group === group) }));

/** The Fifth Edge mark: four white bars and a red fifth. */
export const EdgeBars: React.FC<{ height?: number; className?: string }> = ({ height = 20, className }) => {
  const w = height * 0.27;
  const gap = height * 0.15;
  return (
    <svg width={w * 5 + gap * 4} height={height} viewBox={`0 0 ${w * 5 + gap * 4} ${height}`} className={className} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={i * (w + gap)} y={0} width={w} height={height} fill={i === 4 ? 'var(--color-brand)' : 'var(--color-fg)'} />
      ))}
    </svg>
  );
};

/** The product name, Outpost. Fifth Edge (the company) only appears in the footer and on the sign-in page. */
export const Wordmark: React.FC<{ className?: string; size?: 'sm' | 'md' | 'lg' }> = ({ className, size = 'md' }) => (
  <span className={cx('inline-flex shrink-0 items-center gap-2 select-none', className)} aria-label="Outpost">
    <RadioTower className={cx('text-brand', size === 'lg' ? 'h-12 w-12' : size === 'sm' ? 'h-5 w-5' : 'h-6 w-6')} aria-hidden="true" />
    <span className={cx('font-display leading-none font-bold tracking-[0.02em] text-fg uppercase', size === 'lg' ? 'text-[56px]' : size === 'sm' ? 'text-[22px]' : 'text-[28px]')}>
      Outpost
    </span>
  </span>
);

/** The company logo (public/fifth-edge-logo.png). Used sparingly: footer only. */
export const CompanyLogo: React.FC<{ className?: string }> = ({ className }) => (
  <img src="/fifth-edge-logo.png" alt="Fifth Edge" className={cx('block h-8 w-auto object-contain object-left select-none', className)} draggable={false} />
);

export const Masthead: React.FC = () => {
  const { currentUser, spacetimedbIdentity, mode, liveStatus, signOut } = useAuth();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const lastError = useAppState(() => store.getLastError());
  const incident = useAppState((s) => s.incident);
  const drill = useAppState((s) => s.drill.session);
  const orgName = useAppState((s) => s.org.name);
  const now = useNow();

  let liveIdentity = spacetimedbIdentity;
  try {
    const conn = useSpacetimeDB();
    if (conn?.identity) liveIdentity = conn.identity.toHexString();
  } catch {
    // Not inside the provider: local sync only
  }

  const isActive = incident.status === 'active';
  const elapsed = isActive && incident.started_at ? (now - new Date(incident.started_at).getTime()) / 1000 : 0;

  return (
    <header className="sticky top-0 z-30 bg-bg">
      {/* Alert band: impossible to miss when something is live */}
      {isActive ? (
        <Link to="/incident" className="block bg-breach text-white">
          <div className="mx-auto flex h-9 max-w-[1240px] items-center gap-4 px-4 text-[13px] md:px-8">
            <span className="font-display text-[15px] font-bold tracking-[0.04em] uppercase">Incident active</span>
            <span className="hidden truncate font-semibold sm:inline">{incident.id}{incident.name ? ` · ${incident.name}` : ''}</span>
            <span className="opacity-80">{titleCase(incident.phase)}</span>
            <span className="font-mono tabular-nums">{formatClock(elapsed)}</span>
            <span className="ml-auto font-semibold underline-offset-4 hover:underline">Open incident →</span>
          </div>
        </Link>
      ) : drill?.status === 'running' ? (
        <Link to="/drill" className="block bg-drill text-bg">
          <div className="mx-auto flex h-9 max-w-[1240px] items-center gap-4 px-4 text-[13px] md:px-8">
            <span className="font-display text-[15px] font-bold tracking-[0.04em] uppercase">Drill in progress</span>
            <span>Practice only</span>
            <span className="ml-auto font-semibold">Go to drill →</span>
          </div>
        </Link>
      ) : null}

      {/* Masthead */}
      <div className="border-b border-line-strong">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center gap-5 px-4 md:px-8">
          <Link to="/incident" aria-label="Outpost home">
            <Wordmark />
          </Link>
          <span className="hidden h-6 w-px bg-line-strong sm:block" aria-hidden="true" />
          {mode === 'live' && live.myOrgs.length > 1 ? (
            <select
              aria-label="Company"
              value={live.orgId !== null ? String(live.orgId) : ''}
              onChange={(e) => live.setActiveOrg(e.target.value)}
              className="hidden h-8 w-auto max-w-56 py-0 text-[13px] sm:block"
            >
              {live.myOrgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="hidden truncate text-[13px] text-fg-muted sm:block">{orgName}</span>
          )}

          <div className="ml-auto flex items-center gap-5">
            <Link
              to="/debug"
              className="hidden items-center gap-2 text-xs text-fg-subtle hover:text-fg lg:flex"
              title={liveIdentity ? `Identity ${liveIdentity}` : undefined}
            >
              <StatusDot tone={mode === 'live' ? 'accent' : liveStatus === 'not-deployed' ? 'drill' : 'off'} pulse={liveStatus === 'connecting'} />
              {mode === 'live' ? 'Online' : liveStatus === 'connecting' ? 'Connecting…' : 'Offline demo'}
            </Link>

            <div className="text-[13px] font-semibold text-fg">{currentUser.name}</div>
            <div className="text-xs text-fg-subtle">{ROLE_SHORT[currentUser.role] ?? currentUser.role}</div>
            
            <IconButton label="Sign out" onClick={() => setConfirmSignOut(true)}>
              <LogOut className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav aria-label="Main" className="border-b border-line bg-bg">
        <div className="mx-auto flex max-w-[1240px] items-stretch gap-6 overflow-x-auto px-4 md:px-8">
          {NAV.map((g, gi) => (
            <div key={g.group} className={cx('flex items-stretch gap-5', gi > 0 && 'border-l border-line pl-6')}>
              {g.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive: on }) =>
                    cx(
                      'flex h-11 items-center border-b-2 text-[14px] whitespace-nowrap transition-colors',
                      item.group === 'Anytime' && 'my-1.5 h-8 self-center border-b-0 bg-surface px-3 font-semibold',
                      on ? (item.group === 'Anytime' ? 'bg-surface-3 text-fg' : 'border-brand font-semibold text-fg') : 'border-transparent text-fg-muted hover:text-fg'
                    )
                  }
                >
                  {item.step && <span className="mr-1.5 font-mono text-[11px] text-fg-subtle">{item.step}</span>}
                  <item.icon className="mr-1.5 h-4 w-4" />
                  {item.label}
                  {item.to === '/incident' && isActive && <span className="ml-2 h-2 w-2 bg-breach" aria-label="live" />}
                  {item.to === '/drill' && drill?.status === 'running' && <span className="ml-2 h-2 w-2 bg-drill" aria-label="running" />}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      </nav>

      {/* Server error toast: reducers reject with a clear message (no permission, slow mode, ...) */}
      {lastError && (
        <div role="alert" className="fixed right-4 bottom-20 z-50 flex max-w-sm items-start gap-3 border-t-2 border-breach bg-surface px-4 py-3 shadow-2xl">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold tracking-[0.09em] text-breach-text uppercase">That didn't work</div>
            <p className="mt-0.5 text-[13px] text-fg">{lastError.message}</p>
          </div>
          <button type="button" onClick={() => store.clearLastError()} className="text-xs font-semibold text-fg-subtle hover:text-fg">
            Dismiss
          </button>
        </div>
      )}

      {confirmSignOut && (
        <Modal title="Sign out?" description="To get back in, sign in again with the same phone number." onClose={() => setConfirmSignOut(false)}>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmSignOut(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={signOut} autoFocus>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </Modal>
      )}
    </header>
  );
};
