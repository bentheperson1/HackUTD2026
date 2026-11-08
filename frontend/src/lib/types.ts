export type Role = 'owner' | 'it_lead' | 'legal' | 'comms' | 'insurer' | 'outside_counsel';

export type IncidentStatus = 'inactive' | 'active' | 'closed';

export type IncidentPhase = 'detection' | 'containment' | 'eradication' | 'recovery' | 'post_incident';

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
  /** Live mode: guest access row id (insurer / outside counsel) */
  grant_id?: string;
  online?: boolean;
}

export interface Org {
  id: string;
  name: string;
}

export interface Incident {
  id: string;
  name?: string;
  /** 1 low .. 4 critical */
  severity?: number;
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
  is_system?: boolean;
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
  /** Number of records affected */
  record_count?: number;
  updated_at: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  target: 'insurer' | 'lawyer' | 'regulator' | 'staff';
  content: string;
}

export interface ReportDraft {
  id: string;
  /** Template it was started from, or '' for a blank document. */
  template_id: string;
  title: string;
  content: string;
  updated_at: string;
  created_at?: string;
  author?: string;
  /** False when the server would refuse a delete (not the creator or an admin). Missing means allowed. */
  can_delete?: boolean;
}

/* ---------------- Drill Night ----------------
 * Mirrors the backend (backend/spacetimedb/Drill.cs):
 * questions fire on a schedule, an answer is scored the moment it's sent,
 * and the right answers + explanations are revealed when the drill ends.
 */

export interface DrillScenario {
  id: string;
  name: string;
  kind: string;
  minutes: number;
  /** Unknown in live mode (the question script is a private table) */
  question_count: number | null;
  description: string;
}

export type DrillStatus = 'lobby' | 'running' | 'finished';

export interface DrillSession {
  id: string;
  join_code: string;
  scenario_id: string;
  scenario_name: string;
  incident_id: string;
  status: DrillStatus;
  started_at: string | null;
  /** id of the question that is open right now */
  current_question_id: string | null;
}

export interface DrillPlayer {
  id: string;
  /** identity hex (live) or member identity (demo) */
  person: string;
  name: string;
  role: Role;
  score: number;
}

export interface DrillQuestion {
  id: string;
  position: number;
  text: string;
  /** null = everyone answers; otherwise only this role can */
  for_role: Role | null;
  options: string[];
  fired_at: string;
  /** null until the drill ends */
  correct_index: number | null;
  explanation: string;
}

export interface DrillAnswer {
  id: string;
  question_id: string;
  person: string;
  choice: number;
  correct: boolean;
  answered_ms: number;
}

export interface DrillState {
  scenarios: DrillScenario[];
  session: DrillSession | null;
  players: DrillPlayer[];
  questions: DrillQuestion[];
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

