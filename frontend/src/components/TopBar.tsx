import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useSpacetimeDB } from 'spacetimedb/react';
import { useAuth } from '../lib/authContext';
import { isIncidentOpen, phaseName, toDate } from '../lib/live';
import { IconButton } from './Button';
import { Chip } from './Chip';
import { roleLabel } from './RoleBadge';

const formatElapsed = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => n.toString().padStart(2, '0')).join(':');
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((part) => /^[A-Za-z]/.test(part))
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

export const TopBar: React.FC<{ onMenu: () => void }> = ({ onMenu }) => {
  const { currentUser, activeIncident: incident } = useAuth();
  const conn = useSpacetimeDB();
  const [now, setNow] = useState(Date.now());

  const isActive = !!incident && isIncidentOpen(incident.status);

  useEffect(() => {
    if (!isActive) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isActive]);

  const identity = conn.identity?.toHexString();

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 bg-surface px-2 md:px-4">
      <IconButton label="Open navigation" onClick={onMenu} className="lg:hidden">
        <Menu />
      </IconButton>

      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        {isActive ? (
          <Chip tone="error">Incident active</Chip>
        ) : (
          <Chip>{incident ? 'Incident closed' : 'Standby'}</Chip>
        )}
        {incident && <Chip className="capitalize">{phaseName(incident.phase)}</Chip>}
        {isActive && (
          <span className="hidden whitespace-nowrap font-mono type-body-medium text-on-surface-variant sm:inline">
            {formatElapsed(now - toDate(incident.openedAt).getTime())}
          </span>
        )}
      </div>

      <div
        className="hidden items-center gap-2 px-2 type-body-small text-on-surface-variant md:flex"
        title={identity ? `Identity ${identity}` : undefined}
      >
        <span className={`h-2 w-2 rounded-full ${conn.isActive ? 'bg-tertiary' : 'bg-outline'}`} />
        {conn.isActive ? 'Synced' : 'Offline, local only'}
      </div>

      <Link
        to="/login"
        title="Account"
        className="state-layer flex items-center gap-3 rounded-full py-1 pl-1 pr-1 text-on-surface md:pr-4"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tertiary-container type-label-medium text-on-tertiary-container">
          {initials(currentUser.name) || '?'}
        </span>
        <span className="hidden min-w-0 flex-col leading-tight md:flex">
          <span className="truncate type-label-large">{currentUser.name}</span>
          <span className="type-body-small text-on-surface-variant">{roleLabel(currentUser.role)}</span>
        </span>
      </Link>
    </header>
  );
};
