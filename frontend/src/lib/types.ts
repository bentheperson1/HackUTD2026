export type Role = 'owner' | 'it_lead' | 'legal' | 'comms' | 'insurer' | 'outside_counsel';

export type IncidentStatus = 'inactive' | 'active' | 'closed';

export type IncidentPhase = 'detection' | 'containment' | 'eradication' | 'recovery';

export type ScopeStatus = 'locked' | 'exfiltrated' | 'restored' | 'unknown';

export interface Member {
  id: string;
  identity: string;
  name: string;
  phone: string;
  role: Role;
  org_id: string;
  expires_at: string | null;
  /** Lifetime Drill Night points */
  drill_score?: number;
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

/* ---------------- Drill Night (Phase 2) ---------------- */

export interface DrillScenario {
  id: string;
  name: string;
  kind: 'cyber' | 'catastrophe';
  description: string;
  window_seconds: number;
  inject_count: number;
}

export type DrillStatus = 'lobby' | 'running' | 'finished' | 'cancelled';

export interface DrillSession {
  id: string;
  join_code: string;
  scenario_id: string;
  scenario_name: string;
  host_id: string; // member id
  host_name: string;
  status: DrillStatus;
  round_index: number; // -1 in the lobby
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface DrillPlayer {
  id: string;
  member_id: string;
  name: string;
  role: Role;
  score: number;
  correct_count: number;
  joined_at: string;
}

/** An inject that has gone live. correct_index is -1 until the round closes. */
export interface DrillRound {
  id: string;
  position: number;
  title: string;
  body: string;
  question: string;
  options: string[];
  points: number;
  role: Role;
  opened_at: string;
  closes_at: string;
  closed: boolean;
  correct_index: number;
  explanation: string;
}

/** choice is -1 while sealed (until the round closes) */
export interface DrillAnswer {
  id: string;
  round_id: string;
  player_id: string;
  choice: number;
  correct: boolean;
  points: number;
  answered_at: string;
  revealed: boolean;
}

export interface DrillState {
  scenarios: DrillScenario[];
  /** The org's newest drill (open or the last finished one) */
  session: DrillSession | null;
  players: DrillPlayer[];
  rounds: DrillRound[];
  answers: DrillAnswer[];
}

export interface ReducerCallLog {
  id: string;
  reducer_name: string;
  args: Record<string, unknown>;
  status: 'success' | 'error';
  error_message?: string;
  timestamp: string;
}

