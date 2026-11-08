import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { ShieldAlert, X } from 'lucide-react';
import { NAV_SECTIONS, UTILITY_DESTINATIONS, NavDestination } from '../lib/navigation';
<<<<<<< Updated upstream
import { useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';
=======
>>>>>>> Stashed changes
import { useAuth } from '../lib/authContext';
import { IconButton } from './Button';

interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
}

const NavItem: React.FC<{ item: NavDestination; badge?: number; onNavigate: () => void }> = ({
  item,
  badge,
  onNavigate,
}) => {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `state-layer flex h-12 items-center gap-3 rounded-full px-4 type-label-large transition-colors ${
          isActive
            ? 'bg-secondary-container text-on-secondary-container'
            : 'text-on-surface-variant hover:text-on-surface'
        }`
      }
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
      <span className="flex-1 truncate">{item.label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="min-w-6 rounded-full bg-primary px-1.5 text-center type-label-small text-on-primary">
          {badge}
        </span>
      )}
    </NavLink>
  );
};

export const NavDrawer: React.FC<NavDrawerProps> = ({ open, onClose }) => {
<<<<<<< Updated upstream
  const { activeOrg, activeIncident } = useAuth();
  const [tasks] = useTable(tables.task);
  const orgName = activeOrg?.name ?? 'No company yet';
  const openTasks = tasks.filter((t) => t.incidentId === activeIncident?.id && t.status !== 'done').length;
=======
  const { activeIncident } = useAuth();
  const orgName = activeIncident?.name ?? 'No active incident';
>>>>>>> Stashed changes

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // No task table in the backend yet, so no badge counts
  const badges: Record<string, number> = {};

  return (
    <>
      {/* Scrim, only for the modal drawer below the lg breakpoint */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-scrim/40 transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <nav
        aria-label="Main"
        className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col bg-surface-container-low transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 ${
          open ? 'translate-x-0 rounded-r-2xl lg:rounded-none' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-container text-on-primary-container">
            <ShieldAlert className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="type-title-medium text-on-surface">Drill Night</div>
            <div className="truncate type-body-small text-on-surface-variant">{orgName}</div>
          </div>
          <IconButton label="Close navigation" onClick={onClose} className="lg:hidden">
            <X />
          </IconButton>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {NAV_SECTIONS.map((section, idx) => (
            <div key={section.heading} className={idx > 0 ? 'mt-2 border-t border-outline-variant pt-2' : ''}>
              <div className="px-4 pb-1 pt-3 type-title-small text-on-surface-variant">{section.heading}</div>
              {section.items.map((item) => (
                <NavItem key={item.to} item={item} badge={badges[item.to]} onNavigate={onClose} />
              ))}
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t border-outline-variant px-3 py-2">
          {UTILITY_DESTINATIONS.map((item) => (
            <NavItem key={item.to} item={item} onNavigate={onClose} />
          ))}
        </div>
      </nav>
    </>
  );
};
