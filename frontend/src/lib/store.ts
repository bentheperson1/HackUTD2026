import {
  Member,
  Org,
  Incident,
  Message,
  Task,
  AuditLogEntry,
  ScopeItem,
  ReportTemplate,
  ReportDraft,
  DrillState,
  DrillRound,
  ReducerCallLog,
  IncidentPhase,
  Role,
  ScopeStatus,
  ChatChannel,
} from './types';
import { live, toLiveCall } from './live';
import { DRILL_SCENARIOS } from './drillContent';

export interface AppState {
  org: Org;
  members: Member[];
  incident: Incident;
  messages: Message[];
  tasks: Task[];
  auditLogs: AuditLogEntry[];
  scopeItems: ScopeItem[];
  reportTemplates: ReportTemplate[];
  reportDrafts: ReportDraft[];
  drill: DrillState;
  reducerLogs: ReducerCallLog[];
  activeBroadcast?: { id: string; message: string; author: string; timestamp: string } | null;
  slowModeSeconds: number;
}

const INITIAL_STATE: AppState = {
  org: {
    id: 'org-001',
    name: 'Acme Logistics Corp',
  },
  members: [
    {
      id: 'm-1',
      identity: 'c2004258960ee969540819c67b374986dbc6a1c460fe0d15269fd01ba21b8cc6',
      name: 'Alex Rivera',
      phone: '+1 (555) 302-8841',
      role: 'owner',
      org_id: 'org-001',
      expires_at: null,
      drill_score: 150,
    },
    {
      id: 'm-2',
      identity: '7f938b8120ef9a37bc8102394850123849102834019283401293840129384012',
      name: 'Taylor IT Lead',
      phone: '+1 (555) 771-4920',
      role: 'it_lead',
      org_id: 'org-001',
      expires_at: null,
      drill_score: 200,
    },
    {
      id: 'm-3',
      identity: '3a189f2830e84b91720349817234908123740981273409812734091827340918',
      name: 'Morgan Legal',
      phone: '+1 (555) 604-1290',
      role: 'legal',
      org_id: 'org-001',
      expires_at: null,
      drill_score: 180,
    },
    {
      id: 'm-4',
      identity: '8b72019348120349812039481203948120394812039481203948120394812039',
      name: 'Sam Insurer',
      phone: '+1 (555) 919-4402',
      role: 'insurer',
      org_id: 'org-001',
      expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
      drill_score: 0,
    },
  ],
  incident: {
    id: 'inc-001',
    status: 'inactive',
    phase: 'detection',
    started_at: null,
    closed_at: null,
    notes: 'No active incident currently running. Ready for activation or drill.',
  },
  messages: [
    {
      id: 'msg-1',
      sender_name: 'System Dispatch',
      sender_role: 'it_lead',
      content: 'Out-of-band crisis channel initialized. Secure network established.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      channel: 'warroom',
    },
    {
      id: 'msg-2',
      sender_name: 'Taylor IT Lead',
      sender_role: 'it_lead',
      content: 'Network switch port 4 disconnected. Forensic memory image acquisition started.',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      channel: 'warroom',
    },
    {
      id: 'msg-3',
      sender_name: 'Alex Rivera',
      sender_role: 'owner',
      content: 'Privileged executive channel opened. Outside counsel retention confirmed.',
      timestamp: new Date(Date.now() - 1200000).toISOString(),
      channel: 'admin',
    },
    {
      id: 'msg-4',
      sender_name: 'Casey (Accounting Staff)',
      sender_role: 'owner',
      content: 'Will Friday bi-weekly payroll processing be impacted by the IT outage?',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      channel: 'general',
    },
  ],
  tasks: [
    {
      id: 't-1',
      title: 'Isolate affected Active Directory domain controller',
      description: 'Sever network trunk port 4 on switch DC-SW01.',
      role: 'it_lead',
      assignee: 'Taylor IT Lead',
      done: false,
      created_at: new Date(Date.now() - 3000000).toISOString(),
    },
    {
      id: 't-2',
      title: 'Engage external incident response counsel',
      description: 'Confirm attorney-client privilege invocation.',
      role: 'legal',
      assignee: 'Morgan Legal',
      done: true,
      created_at: new Date(Date.now() - 2500000).toISOString(),
    },
  ],
  auditLogs: [
    {
      id: 'aud-1',
      actor: 'c20042589... (Alex Rivera)',
      action: 'SYSTEM_INIT',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      details: 'Command center environment initialized.',
    },
  ],
  scopeItems: [
    {
      id: 'scope-1',
      category: 'Customer PII (SSN, DOB, Billing)',
      status: 'unknown',
      affected_states: ['TX', 'CA'],
      notes: 'Customer database snapshot suspected touched during lateral movement.',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'scope-2',
      category: 'Employee HR Records & W-2s',
      status: 'locked',
      affected_states: ['TX', 'NY'],
      notes: 'HR network share encrypted with .drill extension.',
      updated_at: new Date().toISOString(),
    },
  ],
  reportTemplates: [
    {
      id: 'tpl-1',
      name: 'Cyber Insurance First Notice of Loss (FNOL)',
      target: 'insurer',
      content: `TO: Cyber Risk Underwriters\nRE: Incident Notice - Policy #CYB-2026-981\n\n1. Policyholder Name: Acme Logistics Corp\n2. Date/Time Discovered: [DISCOVERY_TIME]\n3. Incident Type: Ransomware / Data Exfiltration\n4. Preliminary Impact: Server shares encrypted; forensic triage ongoing.\n5. Retained IR Vendor: Pending triage approval.\n\nSubmitted by authorized representative.`,
    },
    {
      id: 'tpl-2',
      name: 'Outside Counsel Privileged Assessment Memo',
      target: 'lawyer',
      content: `CONFIDENTIAL ATTORNEY-CLIENT PRIVILEGED / WORK PRODUCT\n\nMEMORANDUM\nTO: Outside Counsel\nFROM: Incident Response Team\nDATE: [CURRENT_DATE]\nSUBJECT: Ransomware Incident Initial Briefing\n\n- Affected Systems & Scope: [SCOPE_SUMMARY]\n- Forensic Findings: Pending containment.\n- Notification Analysis: Pending counsel review.`,
    },
    {
      id: 'tpl-3',
      name: 'State AG Regulatory Notification Report',
      target: 'regulator',
      content: `FORMAL NOTIFICATION OF SECURITY INCIDENT\nTo: State Attorney General Data Privacy Division\n\nPursuant to state breach notification statutes, Acme Logistics Corp hereby provides notice of a potential unauthorized disclosure of personal information.\n\nTotal Affected Residents: [COUNT]\nRemediation Steps Taken: Systems isolated, forensic investigation underway.\nContact Person: Alex Rivera, Incident Commander.`,
    },
  ],
  reportDrafts: [
    {
      id: 'draft-1',
      template_id: 'tpl-1',
      title: 'FNOL Draft - Underwriter Submission v1',
      content: 'Draft under review by Legal and IT Lead prior to official dispatch.',
      updated_at: new Date().toISOString(),
    },
  ],
  drill: {
    scenarios: DRILL_SCENARIOS.map((sc) => ({
      id: sc.id,
      name: sc.name,
      kind: sc.kind,
      description: sc.description,
      window_seconds: sc.windowSeconds,
      inject_count: sc.injects.length,
    })),
    session: null,
    players: [],
    rounds: [],
    answers: [],
  },
  reducerLogs: [],
  activeBroadcast: null,
  slowModeSeconds: 0,
};

const STORAGE_KEY = 'drill_night_state_v2'; // v2: Drill Night multiplayer state

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading state from localStorage', e);
  }
  return INITIAL_STATE;
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event('drill_night_store_update'));
  } catch (e) {
    console.error('Failed saving state to localStorage', e);
  }
}

let currentState: AppState = loadState();
const listeners = new Set<(state: AppState) => void>();

/* ---------- Live mode: when SpacetimeDB is connected, its tables replace the demo slices ---------- */
let merged: AppState | null = null;
let lastError: { id: number; message: string } | null = null;
const effectiveState = (): AppState => {
  if (live.isLive && live.slices) {
    if (!merged) merged = { ...currentState, ...live.slices } as AppState;
    return merged;
  }
  return currentState;
};
const notifyAll = () => {
  merged = null;
  const s = effectiveState();
  listeners.forEach((l) => l(s));
};
live.subscribe(notifyAll);

window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY && e.newValue) {
    try {
      currentState = JSON.parse(e.newValue);
      notifyAll();
    } catch (err) {
      console.error(err);
    }
  }
});

window.addEventListener('drill_night_store_update', () => {
  notifyAll();
});

export const store = {
  getState(): AppState {
    return effectiveState();
  },

  /** 'live' when reading from SpacetimeDB, 'demo' when using local demo data */
  mode(): 'live' | 'demo' {
    return live.isLive ? 'live' : 'demo';
  },

  /** The latest error returned by the server (shown as a toast). */
  getLastError() {
    return lastError;
  },
  clearLastError() {
    lastError = null;
    notifyAll();
  },
  reportError(message: string) {
    lastError = { id: Date.now(), message };
    notifyAll();
  },

  subscribe(listener: (state: AppState) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  callReducer<T = void>(
    reducerName: string,
    args: Record<string, unknown>,
    mutator: (state: AppState) => T
  ): { success: boolean; result?: T; error?: string } {
    const callId = 'call-' + Math.random().toString(36).substring(2, 9);

    // LIVE: send it to the SpacetimeDB reducer instead of changing local data.
    // The table subscription updates every screen when the server accepts it.
    const route = live.isLive ? toLiveCall(reducerName, args) : null;
    if (route) {
      const entry: ReducerCallLog = { id: callId, reducer_name: route.reducer, args: route.args, status: 'success', timestamp: new Date().toISOString() };
      currentState = { ...currentState, reducerLogs: [entry, ...currentState.reducerLogs].slice(0, 200) };
      live.call(route.reducer, route.args).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        currentState = {
          ...currentState,
          reducerLogs: currentState.reducerLogs.map((l) => (l.id === callId ? { ...l, status: 'error', error_message: message } : l)),
        };
        store.reportError(message);
      });
      notifyAll();
      return { success: true };
    }

    try {
      // Execute mutation on a cloned state
      const nextState: AppState = JSON.parse(JSON.stringify(currentState));
      const result = mutator(nextState);

      // Record in append-only reducer log
      const logEntry: ReducerCallLog = {
        id: callId,
        reducer_name: reducerName,
        args,
        status: 'success',
        timestamp: new Date().toISOString(),
      };
      nextState.reducerLogs.unshift(logEntry);

      // Commit state
      currentState = nextState;
      saveState(currentState);
      return { success: true, result };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const logEntry: ReducerCallLog = {
        id: callId,
        reducer_name: reducerName,
        args,
        status: 'error',
        error_message: errorMessage,
        timestamp: new Date().toISOString(),
      };
      currentState.reducerLogs.unshift(logEntry);
      saveState(currentState);
      return { success: false, error: errorMessage };
    }
  },

  // Reducer: recordAuditLog (APPEND-ONLY, no edit/delete)
  recordAuditLog(actor: string, action: string, details: string) {
    return this.callReducer('record_audit_log', { actor, action, details }, (draft) => {
      draft.auditLogs.unshift({
        id: 'aud-' + Date.now(),
        actor,
        action,
        timestamp: new Date().toISOString(),
        details,
      });
    });
  },

  // Reducer: addMember
  addMember(actor: string, name: string, phone: string, role: Role, expires_at: string | null) {
    return this.callReducer('add_member', { name, phone, role, expires_at }, (draft) => {
      const newMember: Member = {
        id: 'm-' + Date.now(),
        identity: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        name,
        phone,
        role,
        org_id: draft.org.id,
        expires_at,
      };
      draft.members.push(newMember);
      draft.auditLogs.unshift({
        id: 'aud-' + Date.now(),
        actor,
        action: 'ADD_MEMBER',
        timestamp: new Date().toISOString(),
        details: `Added ${name} (${role})`,
      });
    });
  },

  // Reducer: updateMemberRole
  updateMemberRole(actor: string, memberId: string, newRole: Role) {
    return this.callReducer('update_member_role', { memberId, newRole }, (draft) => {
      const m = draft.members.find((x) => x.id === memberId);
      if (!m) throw new Error('Member not found');
      const oldRole = m.role;
      m.role = newRole;
      draft.auditLogs.unshift({
        id: 'aud-' + Date.now(),
        actor,
        action: 'UPDATE_MEMBER_ROLE',
        timestamp: new Date().toISOString(),
        details: `Changed ${m.name} role from ${oldRole} to ${newRole}`,
      });
    });
  },

  // Reducer: removeMember
  removeMember(actor: string, memberId: string) {
    return this.callReducer('remove_member', { memberId }, (draft) => {
      const m = draft.members.find((x) => x.id === memberId);
      if (!m) throw new Error('Member not found');
      draft.members = draft.members.filter((x) => x.id !== memberId);
      draft.auditLogs.unshift({
        id: 'aud-' + Date.now(),
        actor,
        action: 'REMOVE_MEMBER',
        timestamp: new Date().toISOString(),
        details: `Removed member ${m.name}`,
      });
    });
  },

  // Reducer: setIncidentStatus
  setIncidentStatus(actor: string, status: 'active' | 'closed') {
    return this.callReducer('set_incident_status', { status }, (draft) => {
      draft.incident.status = status;
      if (status === 'active') {
        draft.incident.started_at = new Date().toISOString();
        draft.incident.closed_at = null;
        draft.incident.phase = 'detection';
      } else {
        draft.incident.closed_at = new Date().toISOString();
      }
      draft.auditLogs.unshift({
        id: 'aud-' + Date.now(),
        actor,
        action: status === 'active' ? 'ACTIVATE_INCIDENT' : 'CLOSE_INCIDENT',
        timestamp: new Date().toISOString(),
        details: `Incident status changed to ${status}`,
      });
    });
  },

  // Reducer: setIncidentPhase
  setIncidentPhase(actor: string, phase: IncidentPhase) {
    return this.callReducer('set_incident_phase', { phase }, (draft) => {
      draft.incident.phase = phase;
      draft.auditLogs.unshift({
        id: 'aud-' + Date.now(),
        actor,
        action: 'CHANGE_INCIDENT_PHASE',
        timestamp: new Date().toISOString(),
        details: `Incident transitioned to ${phase.toUpperCase()} phase`,
      });
    });
  },

  // Reducer: sendMessage
  sendMessage(sender_name: string, sender_role: Role, content: string, channel: ChatChannel = 'warroom') {
    return this.callReducer('send_message', { sender_name, sender_role, content, channel }, (draft) => {
      if (!content.trim()) throw new Error('Message cannot be empty');
      draft.messages.push({
        id: 'msg-' + Date.now(),
        sender_name,
        sender_role,
        content,
        timestamp: new Date().toISOString(),
        channel,
      });
    });
  },

  // Reducer: setBroadcast
  setBroadcast(author: string, message: string) {
    return this.callReducer('set_broadcast', { author, message }, (draft) => {
      draft.activeBroadcast = {
        id: 'bcast-' + Date.now(),
        message,
        author,
        timestamp: new Date().toISOString(),
      };
      draft.auditLogs.unshift({
        id: 'aud-' + Date.now(),
        actor: author,
        action: 'EMERGENCY_BROADCAST',
        timestamp: new Date().toISOString(),
        details: `[ALL-HANDS BROADCAST] ${message}`,
      });
    });
  },

  // Reducer: clearBroadcast
  clearBroadcast(author: string) {
    return this.callReducer('clear_broadcast', { author }, (draft) => {
      draft.activeBroadcast = null;
    });
  },

  // Reducer: setSlowMode
  setSlowMode(seconds: number) {
    return this.callReducer('set_slow_mode', { seconds }, (draft) => {
      draft.slowModeSeconds = seconds;
    });
  },

  // Reducer: createTask
  createTask(actor: string, title: string, description: string, role: Role, assignee: string) {
    return this.callReducer('create_task', { title, description, role, assignee }, (draft) => {
      draft.tasks.unshift({
        id: 'task-' + Date.now(),
        title,
        description,
        role,
        assignee,
        done: false,
        created_at: new Date().toISOString(),
      });
      draft.auditLogs.unshift({
        id: 'aud-' + Date.now(),
        actor,
        action: 'CREATE_TASK',
        timestamp: new Date().toISOString(),
        details: `Task created: ${title} assigned to ${assignee || role}`,
      });
    });
  },

  // Reducer: toggleTask
  toggleTask(actor: string, taskId: string) {
    return this.callReducer('toggle_task', { taskId }, (draft) => {
      const t = draft.tasks.find((x) => x.id === taskId);
      if (!t) throw new Error('Task not found');
      t.done = !t.done;
      draft.auditLogs.unshift({
        id: 'aud-' + Date.now(),
        actor,
        action: 'TOGGLE_TASK',
        timestamp: new Date().toISOString(),
        details: `Task "${t.title}" marked as ${t.done ? 'COMPLETED' : 'INCOMPLETE'}`,
      });
    });
  },

  // Reducer: addScopeItem
  addScopeItem(actor: string, category: string, status: ScopeStatus, affected_states: string[], notes: string) {
    return this.callReducer('add_scope_item', { category, status, affected_states, notes }, (draft) => {
      draft.scopeItems.push({
        id: 'scope-' + Date.now(),
        category,
        status,
        affected_states,
        notes,
        updated_at: new Date().toISOString(),
      });
      draft.auditLogs.unshift({
        id: 'aud-' + Date.now(),
        actor,
        action: 'ADD_SCOPE_ITEM',
        timestamp: new Date().toISOString(),
        details: `Added scope item: ${category} (${status})`,
      });
    });
  },

  // Reducer: updateScopeItem
  updateScopeItem(actor: string, itemId: string, status: ScopeStatus, notes: string) {
    return this.callReducer('update_scope_item', { itemId, status, notes }, (draft) => {
      const item = draft.scopeItems.find((x) => x.id === itemId);
      if (!item) throw new Error('Scope item not found');
      item.status = status;
      item.notes = notes;
      item.updated_at = new Date().toISOString();
      draft.auditLogs.unshift({
        id: 'aud-' + Date.now(),
        actor,
        action: 'UPDATE_SCOPE_ITEM',
        timestamp: new Date().toISOString(),
        details: `Updated scope item "${item.category}" to ${status}`,
      });
    });
  },

  // Reducer: saveDraft
  saveDraft(templateId: string, title: string, content: string) {
    return this.callReducer('save_draft', { templateId, title, content }, (draft) => {
      const existing = draft.reportDrafts.find((d) => d.template_id === templateId);
      if (existing) {
        existing.title = title;
        existing.content = content;
        existing.updated_at = new Date().toISOString();
      } else {
        draft.reportDrafts.push({
          id: 'draft-' + Date.now(),
          template_id: templateId,
          title,
          content,
          updated_at: new Date().toISOString(),
        });
      }
    });
  },

  /* ---------------- Drill Night ----------------
   * Live: each call goes to the matching SpacetimeDB reducer (see toLiveCall in live.ts).
   * Demo: the same rules run locally, with teammates simulated so one person can try it.
   */
  drillCreate(me: Member, scenarioId: string) {
    return this.callReducer('create_drill', { scenarioId }, (draft) => {
      if (me.role !== 'owner' && me.role !== 'it_lead') throw new Error(`Your role (${me.role}) can't host a drill.`);
      if (draft.incident.status === 'active') throw new Error("A real incident is active. Drills are paused until it's closed.");
      const open = draft.drill.session;
      if (open && (open.status === 'lobby' || open.status === 'running')) throw new Error(`A drill is already open. Join it with code ${open.join_code}.`);
      const sc = draft.drill.scenarios.find((x) => x.id === scenarioId);
      if (!sc) throw new Error('Unknown scenario.');
      const now = new Date().toISOString();
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      draft.drill = {
        ...draft.drill,
        session: {
          id: 'ds-' + Date.now(),
          join_code: Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''),
          scenario_id: sc.id,
          scenario_name: sc.name,
          host_id: me.id,
          host_name: me.name,
          status: 'lobby',
          round_index: -1,
          created_at: now,
          started_at: null,
          ended_at: null,
        },
        players: [],
        rounds: [],
        answers: [],
      };
      // Host joins automatically. In demo mode, simulated teammates join too.
      const team = [me, ...draft.members.filter((m) => m.id !== me.id && m.role !== 'insurer' && m.role !== 'outside_counsel').slice(0, 3)];
      team.forEach((m, i) =>
        draft.drill.players.push({ id: `dp-${Date.now()}-${i}`, member_id: m.id, name: m.name, role: m.role, score: 0, correct_count: 0, joined_at: now })
      );
    });
  },

  drillJoin(me: Member, code: string) {
    return this.callReducer('join_drill', { code: code.trim().toUpperCase() }, (draft) => {
      const s = draft.drill.session;
      if (!s || s.join_code !== code.trim().toUpperCase()) throw new Error('No drill with that code.');
      if (s.status !== 'lobby' && s.status !== 'running') throw new Error('That drill has already ended.');
      if (!draft.drill.players.some((p) => p.member_id === me.id)) {
        draft.drill.players.push({ id: 'dp-' + Date.now(), member_id: me.id, name: me.name, role: me.role, score: 0, correct_count: 0, joined_at: new Date().toISOString() });
      }
    });
  },

  drillLeave(me: Member) {
    const s = this.getState().drill.session;
    return this.callReducer('leave_drill', { sessionId: s?.id ?? '0' }, (draft) => {
      if (draft.drill.session?.status !== 'lobby') throw new Error('You can only leave before the drill starts.');
      if (draft.drill.session.host_id === me.id) throw new Error('The host can cancel the drill instead.');
      draft.drill.players = draft.drill.players.filter((p) => p.member_id !== me.id);
    });
  },

  drillStart(me: Member) {
    const s = this.getState().drill.session;
    return this.callReducer('start_drill', { sessionId: s?.id ?? '0' }, (draft) => {
      const ses = draft.drill.session;
      if (!ses) throw new Error('Drill not found.');
      demoRequireHost(me, ses.host_id);
      if (ses.status !== 'lobby') throw new Error('This drill has already started.');
      ses.status = 'running';
      ses.started_at = new Date().toISOString();
      ses.round_index = 0;
      demoOpenRound(draft, 0);
      draft.auditLogs.unshift({ id: 'aud-' + Date.now(), actor: me.name, action: 'DRILL_STARTED', timestamp: new Date().toISOString(), details: `${ses.scenario_name} drill started with ${draft.drill.players.length} players.` });
    });
  },

  drillAnswer(me: Member, roundId: string, choice: number) {
    return this.callReducer('answer_round', { roundId, choice }, (draft) => {
      const ses = draft.drill.session;
      const round = draft.drill.rounds.find((r) => r.id === roundId);
      if (!ses || !round) throw new Error('Inject not found.');
      if (ses.status !== 'running' || round.closed || round.position !== ses.round_index) throw new Error('This inject is closed.');
      if (Date.now() > Date.parse(round.closes_at)) throw new Error("Time's up for this inject.");
      const p = draft.drill.players.find((x) => x.member_id === me.id);
      if (!p) throw new Error('Join the drill first.');
      if (draft.drill.answers.some((a) => a.round_id === round.id && a.player_id === p.id)) throw new Error('You already locked in an answer.');
      demoLockIn(draft, round, p.id, choice);
      demoMaybeAdvance(draft);
    });
  },

  drillAdvance(me: Member) {
    const s = this.getState().drill.session;
    return this.callReducer('advance_drill', { sessionId: s?.id ?? '0' }, (draft) => {
      const ses = draft.drill.session;
      if (!ses) throw new Error('Drill not found.');
      demoRequireHost(me, ses.host_id);
      if (ses.status !== 'running') throw new Error('The drill is not running.');
      demoAdvance(draft);
    });
  },

  drillEnd(me: Member) {
    const s = this.getState().drill.session;
    return this.callReducer('end_drill', { sessionId: s?.id ?? '0' }, (draft) => {
      const ses = draft.drill.session;
      if (!ses) throw new Error('Drill not found.');
      demoRequireHost(me, ses.host_id);
      if (ses.status === 'lobby') {
        ses.status = 'cancelled';
        ses.ended_at = new Date().toISOString();
        return;
      }
      if (ses.status !== 'running') throw new Error('This drill has already ended.');
      demoCloseRound(draft);
      demoFinish(draft);
    });
  },

  // Reducer: resetToDefaults
  resetToDefaults() {
    currentState = JSON.parse(JSON.stringify(INITIAL_STATE));
    saveState(currentState);
  },
};


/* ---------------- Demo-mode drill engine (same rules as the server module) ---------------- */

const DEMO_KEY = (scenarioId: string) => DRILL_SCENARIOS.find((s) => s.id === scenarioId)!;

function demoRequireHost(me: Member, hostId: string) {
  if (me.id !== hostId && me.role !== 'owner') throw new Error('Only the drill host can do that.');
}

function demoOpenRound(draft: AppState, position: number) {
  const ses = draft.drill.session!;
  const sc = DEMO_KEY(ses.scenario_id);
  const inj = sc.injects[position];
  const now = Date.now();
  draft.drill.rounds.push({
    id: `dr-${now}-${position}`,
    position,
    title: inj.title,
    body: inj.body,
    question: inj.question,
    options: inj.options,
    points: inj.points,
    role: inj.role as Role,
    opened_at: new Date(now).toISOString(),
    closes_at: new Date(now + sc.windowSeconds * 1000).toISOString(),
    closed: false,
    correct_index: -1,
    explanation: '',
  });
}

function demoLockIn(draft: AppState, round: DrillRound, playerId: string, choice: number) {
  draft.drill.answers.push({
    id: `da-${Date.now()}-${playerId}`,
    round_id: round.id,
    player_id: playerId,
    // Demo keeps the choice locally; the UI still hides other people's picks until the reveal.
    choice,
    correct: false,
    points: 0,
    answered_at: new Date().toISOString(),
    revealed: false,
  });
}

function demoCloseRound(draft: AppState) {
  const ses = draft.drill.session!;
  const round = draft.drill.rounds.find((r) => r.position === ses.round_index);
  if (!round || round.closed) return;
  const inj = DEMO_KEY(ses.scenario_id).injects[round.position];
  const windowMs = Date.parse(round.closes_at) - Date.parse(round.opened_at);
  for (const a of draft.drill.answers.filter((x) => x.round_id === round.id)) {
    const correct = a.choice === inj.correct;
    const left = Math.max(0, Date.parse(round.closes_at) - Date.parse(a.answered_at));
    a.correct = correct;
    a.points = correct ? round.points + Math.floor((round.points / 2) * Math.min(1, left / windowMs)) : 0;
    a.revealed = true;
    const p = draft.drill.players.find((x) => x.id === a.player_id);
    if (p) {
      p.score += a.points;
      p.correct_count += correct ? 1 : 0;
    }
  }
  round.closed = true;
  round.correct_index = inj.correct;
  round.explanation = inj.explanation;
}

function demoAdvance(draft: AppState) {
  demoCloseRound(draft);
  const ses = draft.drill.session!;
  const next = ses.round_index + 1;
  if (next < DEMO_KEY(ses.scenario_id).injects.length) {
    ses.round_index = next;
    demoOpenRound(draft, next);
  } else {
    demoFinish(draft);
  }
}

function demoFinish(draft: AppState) {
  const ses = draft.drill.session!;
  ses.status = 'finished';
  ses.ended_at = new Date().toISOString();
  const ranked = [...draft.drill.players].sort((a, b) => b.score - a.score);
  for (const p of ranked) {
    const m = draft.members.find((x) => x.id === p.member_id);
    if (m) m.drill_score = (m.drill_score ?? 0) + p.score;
  }
  const team = ranked.reduce((n, p) => n + p.score, 0);
  draft.auditLogs.unshift({
    id: 'aud-' + Date.now(),
    actor: ses.host_name,
    action: 'DRILL_FINISHED',
    timestamp: new Date().toISOString(),
    details: `${ses.scenario_name} drill finished. ${ranked.length} players, team score ${team}${ranked[0] ? `, top: ${ranked[0].name} (${ranked[0].score})` : ''}.`,
  });
}

/** Everyone locked in? Close the round now instead of waiting for the timer. */
function demoMaybeAdvance(draft: AppState) {
  const ses = draft.drill.session!;
  const round = draft.drill.rounds.find((r) => r.position === ses.round_index);
  if (!round) return;
  const answered = draft.drill.answers.filter((a) => a.round_id === round.id).length;
  if (answered >= draft.drill.players.length) demoAdvance(draft);
}

/**
 * Demo heartbeat (the server uses a scheduled reducer instead).
 * Simulated teammates lock in answers over time; the round closes when time runs out.
 */
const DEMO_BOT_ACCURACY = 0.7;
setInterval(() => {
  if (live.isLive) return;
  const ses = currentState.drill?.session;
  if (!ses || ses.status !== 'running') return;
  const draft: AppState = JSON.parse(JSON.stringify(currentState));
  const d = draft.drill.session!;
  const round = draft.drill.rounds.find((r) => r.position === d.round_index);
  if (!round) return;
  let changed = false;
  if (Date.now() >= Date.parse(round.closes_at)) {
    demoAdvance(draft);
    changed = true;
  } else {
    const answeredBy = new Set(draft.drill.answers.filter((a) => a.round_id === round.id).map((a) => a.player_id));
    const humans = new Set(demoHumans);
    for (const p of draft.drill.players) {
      if (answeredBy.has(p.id) || humans.has(p.member_id)) continue;
      if (Math.random() < 0.09) {
        const correct = DEMO_KEY(d.scenario_id).injects[round.position].correct;
        const pick = Math.random() < DEMO_BOT_ACCURACY ? correct : (correct + 1 + Math.floor(Math.random() * (round.options.length - 1))) % round.options.length;
        demoLockIn(draft, round, p.id, pick);
        changed = true;
      }
    }
    if (changed) demoMaybeAdvance(draft);
  }
  if (changed) {
    currentState = draft;
    saveState(currentState);
  }
}, 1000);

/** Members being played by a real person in this browser (they never auto-answer). */
const demoHumans: string[] = [];
export function markDemoHuman(memberId: string) {
  if (!demoHumans.includes(memberId)) demoHumans.push(memberId);
}
