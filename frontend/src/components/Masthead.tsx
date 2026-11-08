import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useSpacetimeDB } from 'spacetimedb/react';
import { Siren } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { ActivateModal } from './ActivateModal';
import { store } from '../lib/store';
import { useAppState, useNow } from '../lib/useAppState';
import { ROLE_SHORT } from './RoleBadge';
import { Button, StatusDot, formatClock, titleCase, cx } from './ui';

export const NAV: { group: string; items: { to: string; label: string }[] }[] = [
  {
    group: 'Respond',
    items: [
      { to: '/admin', label: 'Overview' },
      { to: '/incident', label: 'Incident' },
      { to: '/warroom', label: 'War room' },
      { to: '/scope', label: 'Scope' },
    ],
  },
  {
    group: 'Record',
    items: [
      { to: '/docs', label: 'Audit log' },
      { to: '/editor', label: 'Reports' },
      { to: '/export', label: 'Export' },
    ],
  },
  {
    group: 'Prepare',
    items: [
      { to: '/drill', label: 'Drill Night' },
      { to: '/members', label: 'Team' },
    ],
  },
  { group: 'System', items: [{ to: '/debug', label: 'Diagnostics' }] },
];

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

/** The Fifth Edge logo image (public/fifth-edge-logo.png, background removed). */
export const Wordmark: React.FC<{ className?: string; size?: 'sm' | 'md' | 'lg' }> = ({ className, size = 'md' }) => (
  <img
    src="/fifth-edge-logo.png"
    alt="Fifth Edge"
    className={cx('block w-auto max-w-full shrink-0 self-start object-contain object-left select-none', size === 'lg' ? 'h-28' : size === 'sm' ? 'h-10' : 'h-12', className)}
    draggable={false}
  />
);

export const Masthead: React.FC = () => {
  const { currentUser, spacetimedbIdentity, mode, liveStatus } = useAuth();
  const lastError = useAppState(() => store.getLastError());
  const incident = useAppState((s) => s.incident);
  const drill = useAppState((s) => s.drill.session);
  const orgName = useAppState((s) => s.org.name);
  const memberCount = useAppState((s) => s.members.length);
  const now = useNow();
  const [confirmOpen, setConfirmOpen] = useState(false);

  let isDbConnected = false;
  let liveIdentity = spacetimedbIdentity;
  try {
    const conn = useSpacetimeDB();
    if (conn) {
      isDbConnected = conn.isActive;
      if (conn.identity) liveIdentity = conn.identity.toHexString();
    }
  } catch {
    // Not inside the provider: local sync only
  }

  const isActive = incident.status === 'active';
  const elapsed = isActive && incident.started_at ? (now - new Date(incident.started_at).getTime()) / 1000 : 0;
  const canActivate = currentUser.role === 'owner' || currentUser.role === 'it_lead';

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
            <span>Practice only. Nothing here is real.</span>
            <span className="ml-auto font-semibold">Go to drill →</span>
          </div>
        </Link>
      ) : null}

      {/* Masthead */}
      <div className="border-b border-line-strong">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center gap-5 px-4 md:px-8">
          <Link to="/admin" aria-label="Fifth Edge home">
            <Wordmark />
          </Link>
          <span className="hidden h-6 w-px bg-line-strong sm:block" aria-hidden="true" />
          <span className="hidden truncate text-[13px] text-fg-muted sm:block">{orgName}</span>

          <div className="ml-auto flex items-center gap-5">
            <Link
              to="/debug"
              className="hidden items-center gap-2 text-xs text-fg-subtle hover:text-fg lg:flex"
              title={liveIdentity ? `Identity ${liveIdentity}` : undefined}
            >
              <StatusDot tone={mode === 'live' ? 'accent' : liveStatus === 'not-deployed' ? 'drill' : 'off'} pulse={liveStatus === 'connecting'} />
              {mode === 'live' ? 'Live · SpacetimeDB' : liveStatus === 'connecting' ? 'Connecting…' : liveStatus === 'not-deployed' ? 'Module not published' : 'Demo data'}
              {mode === 'live' && isDbConnected && <span className="font-mono">{liveIdentity.slice(0, 6)}</span>}
            </Link>
            <Link to="/login" className="hidden text-right leading-tight md:block" title="Switch persona">
              <div className="text-[13px] font-semibold text-fg">{currentUser.name}</div>
              <div className="text-xs text-fg-subtle">{ROLE_SHORT[currentUser.role] ?? currentUser.role} · switch</div>
            </Link>
            {!isActive && canActivate && (
              <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                <Siren className="h-4 w-4" />
                Activate incident
              </Button>
            )}
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
                      on ? 'border-brand font-semibold text-fg' : 'border-transparent text-fg-muted hover:text-fg'
                    )
                  }
                >
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
        <div role="alert" className="fixed right-4 bottom-4 z-50 flex max-w-sm items-start gap-3 border-t-2 border-breach bg-surface px-4 py-3 shadow-2xl">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold tracking-[0.09em] text-breach-text uppercase">Server said no</div>
            <p className="mt-0.5 text-[13px] text-fg">{lastError.message}</p>
          </div>
          <button type="button" onClick={() => store.clearLastError()} className="text-xs font-semibold text-fg-subtle hover:text-fg">
            Dismiss
          </button>
        </div>
      )}

      {confirmOpen && <ActivateModal actor={currentUser.name} rosterSize={memberCount} onClose={() => setConfirmOpen(false)} />}
    </header>
  );
};
