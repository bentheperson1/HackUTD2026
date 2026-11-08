import type { Timestamp } from 'spacetimedb';
import { IncidentPhase } from './types';
import { PHASES } from './constants';

// Incident.phase is an int index into PHASES (backend starts every incident at 0)
export const phaseName = (phase: number): IncidentPhase => PHASES[phase] ?? PHASES[0];

// Incident.status: 0 = open (set by CreateIncident); anything else is treated as closed
export const isIncidentOpen = (status: number) => status === 0;

export const toDate = (ts: Timestamp) => new Date(Number(ts.microsSinceUnixEpoch / 1000n));

// ScopeItem.status is an int index into this list
export const SCOPE_STATUSES = [
  { value: 'unknown', label: 'Under investigation' },
  { value: 'locked', label: 'Encrypted' },
  { value: 'exfiltrated', label: 'Exfiltrated' },
  { value: 'restored', label: 'Restored' },
] as const;
export const scopeStatus = (status: number) => SCOPE_STATUSES[status] ?? SCOPE_STATUSES[0];

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
