import { Role, IncidentPhase } from './types';

export const ROLES: { value: Role; label: string }[] = [
  { value: 'owner', label: 'Owner (Admin)' },
  { value: 'it_lead', label: 'IT Lead' },
  { value: 'legal', label: 'In-House Legal' },
  { value: 'comms', label: 'Communications' },
  { value: 'insurer', label: 'Cyber Insurer (Guest)' },
  { value: 'outside_counsel', label: 'Outside Counsel (Guest)' },
];

export const PHASES: IncidentPhase[] = ['detection', 'containment', 'eradication', 'recovery', 'post_incident'];

