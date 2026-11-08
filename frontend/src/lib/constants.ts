import { Role, IncidentPhase, ScenarioType } from './types';

export const ROLES: { value: Role; label: string }[] = [
  { value: 'owner', label: 'Owner (Admin)' },
  { value: 'it_lead', label: 'IT Lead' },
  { value: 'legal', label: 'In-House Legal' },
  { value: 'comms', label: 'Communications' },
  { value: 'member', label: 'Member' },
  { value: 'insurer', label: 'Cyber Insurer (Guest)' },
  { value: 'outside_counsel', label: 'Outside Counsel (Guest)' },
];

export const PHASES: IncidentPhase[] = ['detection', 'containment', 'eradication', 'recovery'];

export const SCENARIOS: { type: ScenarioType; label: string; description: string }[] = [
  { type: 'ransomware', label: 'Ransomware Outbreak', description: 'LockBit variant encrypting active directory and file shares.' },
  { type: 'phishing', label: 'Credential Harvesting', description: 'Executive email compromise and session token hijack.' },
  { type: 'flood', label: 'Data Center Flooding', description: 'Server room water ingress and hardware loss.' },
  { type: 'tornado', label: 'Severe Weather / Site Loss', description: 'Physical infrastructure destruction requiring cold-site migration.' },
  { type: 'power_outage', label: 'Substation Failure', description: 'Total electrical outage without generator switchover.' },
];

export interface StateNotificationRule {
  state: string;
  name: string;
  deadline_days: number;
  trigger_threshold: string;
  authority: string;
  notes: string;
}

export const STATE_BREACH_RULES: Record<string, StateNotificationRule> = {
  TX: {
    state: 'TX',
    name: 'Texas Business & Commerce Code § 521.053',
    deadline_days: 60,
    trigger_threshold: 'Sensitive PII exposed; >250 TX residents requires AG notification',
    authority: 'Texas Attorney General electronic portal',
    notes: 'Notification must occur without unreasonable delay and no later than 60 days.',
  },
  CA: {
    state: 'CA',
    name: 'California Civil Code § 1798.82',
    deadline_days: 15,
    trigger_threshold: 'Unencrypted personal info; >500 CA residents requires California AG copy',
    authority: 'California Attorney General / California Privacy Protection Agency',
    notes: 'Statute requires most expedient time possible and without unreasonable delay (industry standard <= 15 days).',
  },
  NY: {
    state: 'NY',
    name: 'New York SHIELD Act (Gen. Bus. Law § 899-aa)',
    deadline_days: 30,
    trigger_threshold: 'Private information compromised; any NY residents affected',
    authority: 'NY AG, NY Dept of State, NY State Police',
    notes: 'Notice must be provided in the most expedient time possible without unreasonable delay.',
  },
};

