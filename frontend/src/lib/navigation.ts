import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  MessagesSquare,
  Siren,
  Database,
  CalendarClock,
  ScrollText,
  FileText,
  Download,
  Timer,
  Users,
  Terminal,
  Building2,
} from 'lucide-react';

export interface NavDestination {
  to: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  heading: string;
  items: NavDestination[];
}

/**
 * Ordered by how urgently a responder needs each screen during an incident:
 * act first, then work out what was hit, then produce paperwork, and finally
 * the setup screens that matter between incidents.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    heading: 'Respond',
    items: [
      { to: '/admin', label: 'Command center', icon: LayoutDashboard },
      { to: '/warroom', label: 'War room', icon: MessagesSquare },
      { to: '/incident', label: 'Incident status', icon: Siren },
    ],
  },
  {
    heading: 'Assess',
    items: [
      { to: '/scope', label: 'Affected data', icon: Database },
      { to: '/notify', label: 'Notification deadlines', icon: CalendarClock },
    ],
  },
  {
    heading: 'Report',
    items: [
      { to: '/docs', label: 'Audit log', icon: ScrollText },
      { to: '/editor', label: 'Insurance & legal drafts', icon: FileText },
      { to: '/export', label: 'Export package', icon: Download },
    ],
  },
  {
    heading: 'Prepare',
    items: [
      { to: '/drill', label: 'Drills', icon: Timer },
      { to: '/members', label: 'Team roster', icon: Users },
    ],
  },
  {
    heading: 'Insurer',
    items: [{ to: '/insurer', label: 'Insurer board', icon: Building2 }],
  },
];

export const UTILITY_DESTINATIONS: NavDestination[] = [{ to: '/debug', label: 'Diagnostics', icon: Terminal }];
