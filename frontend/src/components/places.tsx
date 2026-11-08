import { Database, Download, FileText, MessagesSquare, ScrollText, Siren, Target, Users } from 'lucide-react';

/**
 * Every place in the app, in the order you use them during an emergency.
 * The same icon and step number appear in the nav, the page title and any button that sends you there,
 * so people learn "the speech bubble is chat" once and can follow it everywhere.
 * Chat is used the whole time, so it has no step number and sits apart from the walkthrough.
 */
export interface Place {
  to: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  group: 'Anytime' | 'Respond' | 'Record' | 'Prepare';
  /** Position in the emergency walkthrough. Chat and Prepare pages are not part of it. */
  step?: number;
}

export const PLACES: Place[] = [
  { to: '/chat', label: 'Chat', icon: MessagesSquare, group: 'Anytime' },
  { to: '/incident', label: 'Incident', icon: Siren, group: 'Respond', step: 1 },
  { to: '/scope', label: 'Affected data', icon: Database, group: 'Respond', step: 2 },
  { to: '/docs', label: 'Audit log', icon: ScrollText, group: 'Record', step: 3 },
  { to: '/editor', label: 'Reports', icon: FileText, group: 'Record', step: 4 },
  { to: '/export', label: 'Export', icon: Download, group: 'Record', step: 5 },
  { to: '/drill', label: 'Drill Night', icon: Target, group: 'Prepare' },
  { to: '/members', label: 'Team', icon: Users, group: 'Prepare' },
];

export const FLOW_LENGTH = PLACES.filter((p) => p.step).length;

export const placeFor = (pathname: string) => PLACES.find((p) => p.to === pathname);
