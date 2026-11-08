import type { Timestamp } from 'spacetimedb';
<<<<<<< Updated upstream
import { IncidentPhase, Role } from './types';
import { PHASES } from './constants';

// Incident.phase is an int index into PHASES (matches PhaseNames in IncidentReducers.cs)
export const phaseName = (phase: number): IncidentPhase => PHASES[phase] ?? PHASES[0];

// Incident.status: 0 = open, 1 = closed (Helpers.cs)
=======
import { IncidentPhase } from './types';
import { PHASES } from './constants';

// Incident.phase is an int index into PHASES (backend starts every incident at 0)
export const phaseName = (phase: number): IncidentPhase => PHASES[phase] ?? PHASES[0];

// Incident.status: 0 = open (set by CreateIncident); anything else is treated as closed
>>>>>>> Stashed changes
export const isIncidentOpen = (status: number) => status === 0;

export const toDate = (ts: Timestamp) => new Date(Number(ts.microsSinceUnixEpoch / 1000n));

<<<<<<< Updated upstream
// ScopeItem.status values, in backend order (Helpers.cs: Unknown=0, Exfiltrated=1, Locked=2, Restored=3)
export const SCOPE_STATUSES = [
  { value: 0, key: 'unknown', label: 'Under investigation' },
  { value: 1, key: 'exfiltrated', label: 'Exfiltrated' },
  { value: 2, key: 'locked', label: 'Encrypted' },
  { value: 3, key: 'restored', label: 'Restored' },
] as const;
export const scopeStatus = (status: number) => SCOPE_STATUSES[status] ?? SCOPE_STATUSES[0];

// Backend role strings (RoleName in Helpers.cs) <-> the UI's Role type
const BACKEND_ROLES: Record<Role, string> = {
  owner: 'Owner',
  it_lead: 'ItLead',
  legal: 'Legal',
  comms: 'Comms',
  insurer: 'Insurer',
  outside_counsel: 'Counsel',
};
export const toBackendRole = (role: Role) => BACKEND_ROLES[role];
export const toUiRole = (role: string): Role =>
  (Object.keys(BACKEND_ROLES) as Role[]).find((r) => BACKEND_ROLES[r] === role) ?? 'comms';

export const STAFF_ROLES: Role[] = ['owner', 'it_lead', 'legal', 'comms'];
export const GUEST_ROLES: Role[] = ['insurer', 'outside_counsel'];

// ActivateIncident accepts severity 1-4
export const SEVERITIES = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'High' },
  { value: 4, label: 'Critical' },
];

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

=======
// ScopeItem.status is an int index into this list
export const SCOPE_STATUSES = [
  { value: 'unknown', label: 'Under investigation' },
  { value: 'locked', label: 'Encrypted' },
  { value: 'exfiltrated', label: 'Exfiltrated' },
  { value: 'restored', label: 'Restored' },
] as const;
export const scopeStatus = (status: number) => SCOPE_STATUSES[status] ?? SCOPE_STATUSES[0];

>>>>>>> Stashed changes
// JSON.stringify can't handle bigint, and Identity/Timestamp print as noise without this
export const jsonReplacer = (_key: string, value: unknown) => {
  if (typeof value === 'bigint') return value.toString();
  if (value && typeof value === 'object') {
    if ('toHexString' in value && typeof value.toHexString === 'function') return value.toHexString();
    if ('microsSinceUnixEpoch' in value && typeof value.microsSinceUnixEpoch === 'bigint') {
      return new Date(Number(value.microsSinceUnixEpoch / 1000n)).toISOString();
    }
  }
  return value;
};
