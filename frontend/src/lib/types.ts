export type Role = 'owner' | 'it_lead' | 'legal' | 'comms' | 'insurer' | 'outside_counsel';

export type IncidentStatus = 'inactive' | 'active' | 'closed';

export type IncidentPhase = 'detection' | 'containment' | 'eradication' | 'recovery' | 'post-incident';

export type ScopeStatus = 'locked' | 'exfiltrated' | 'restored' | 'unknown';

export interface Member {
  id: string;
  identity: string;
  name: string;
  phone: string;
  role: Role;
  org_id: string;
  expires_at: string | null;
}

export interface Org {
  id: string;
  name: string;
}

export interface Incident {
  id: string;
  status: IncidentStatus;
  phase: IncidentPhase;
  started_at: string | null;
  closed_at: string | null;
  notes: string;
}

export type ChatChannel = 'warroom' | 'admin' | 'general';

export interface Message {
  id: string;
  sender_name: string;
  sender_role: Role;
  content: string;
  timestamp: string;
  channel?: ChatChannel;
  is_broadcast?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  role: Role;
  assignee: string;
  done: boolean;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  timestamp: string;
  details: string;
}

export interface ScopeItem {
  id: string;
  category: string;
  status: ScopeStatus;
  affected_states: string[];
  notes: string;
  updated_at: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  target: 'insurer' | 'lawyer' | 'regulator';
  content: string;
}

export interface ReportDraft {
  id: string;
  template_id: string;
  title: string;
  content: string;
  updated_at: string;
}

export type ScenarioType = 'ransomware' | 'phishing' | 'flood' | 'tornado' | 'power_outage';

export interface DrillSession {
  id: string;
  scenario: ScenarioType;
  status: 'pending' | 'running' | 'completed';
  started_at: string | null;
  time_remaining_seconds: number;
}

export interface DrillPlayer {
  id: string;
  name: string;
  role: Role;
  score: number;
}

export interface DrillEvent {
  id: string;
  timestamp: string;
  description: string;
  points: number;
  action_required: string;
}

export interface ReducerCallLog {
  id: string;
  reducer_name: string;
  args: Record<string, unknown>;
  status: 'success' | 'error';
  error_message?: string;
  timestamp: string;
}

