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
  ReducerCallLog,
  IncidentPhase,
  Role,
  ScopeStatus,
  ChatChannel,
} from './types';
import { live, toLiveCall, drillPoints } from './live';
import { DEMO_SCENARIO } from './drillContent';

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
      name: 'Taylor Brooks',
      phone: '+1 (555) 771-4920',
      role: 'it_lead',
      org_id: 'org-001',
      expires_at: null,
      drill_score: 200,
    },
    {
      id: 'm-3',
      identity: '3a189f2830e84b91720349817234908123740981273409812734091827340918',
      name: 'Morgan Lee',
      phone: '+1 (555) 604-1290',
      role: 'legal',
      org_id: 'org-001',
      expires_at: null,
      drill_score: 180,
    },
    {
      id: 'm-4',
      identity: '8b72019348120349812039481203948120394812039481203948120394812039',
      name: 'Sam Patel',
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
    notes: '',
  },
  messages: [
    {
      id: 'msg-1',
      sender_name: 'Outpost',
      sender_role: 'it_lead',
      content: 'Outpost is set up. During an incident, use this chat instead of company email.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      channel: 'warroom',
    },
    {
      id: 'msg-2',
      sender_name: 'Taylor Brooks',
      sender_role: 'it_lead',
      content: 'I unplugged the main server from the network. I am saving a copy of its memory for the investigators.',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      channel: 'warroom',
    },
    {
      id: 'msg-3',
      sender_name: 'Alex Rivera',
      sender_role: 'owner',
      content: 'We have hired an outside breach lawyer. Keep sensitive discussion in this channel.',
      timestamp: new Date(Date.now() - 1200000).toISOString(),
      channel: 'admin',
    },
    {
      id: 'msg-4',
      sender_name: 'Casey Nguyen',
      sender_role: 'owner',
      content: 'Will payroll still go out on Friday?',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      channel: 'general',
    },
  ],
  tasks: [
    {
      id: 't-1',
      title: 'Disconnect the main server from the network',
      description: 'Unplug its network cable. Leave it powered on.',
      role: 'it_lead',
      assignee: 'Taylor Brooks',
      done: false,
      created_at: new Date(Date.now() - 3000000).toISOString(),
    },
    {
      id: 't-2',
      title: 'Hire an outside breach lawyer',
      description: 'Ask them to direct the investigation so it stays confidential.',
      role: 'legal',
      assignee: 'Morgan Lee',
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
      details: 'Outpost was set up for Acme Logistics.',
    },
  ],
  scopeItems: [
    {
      id: 'scope-1',
      category: 'Customer personal info (SSNs, birth dates, billing)',
      status: 'unknown',
      affected_states: ['TX', 'CA'],
      notes: 'The attacker may have accessed the customer database.',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'scope-2',
      category: 'Employee HR records and W-2s',
      status: 'locked',
      affected_states: ['TX', 'NY'],
      notes: 'The HR shared folder was encrypted.',
      updated_at: new Date().toISOString(),
    },
  ],
  reportTemplates: [
    {
      id: 'tpl-1',
      name: 'Cyber insurance claim notice',
      target: 'insurer',
      content: `TO: Cyber claims desk\nRE: Incident notice - Policy #[POLICY_NUMBER]\n\n1. Policyholder: Acme Logistics Corp\n2. Discovered: [DISCOVERY_TIME]\n3. Incident type: Ransomware, possible data theft\n4. What is affected so far: [IMPACT]\n5. Steps taken: Affected machines disconnected from the network\n6. Response vendor: [VENDOR or \"requesting a panel vendor\"]\n\nContact: [NAME], [PERSONAL PHONE]`,
    },
    {
      id: 'tpl-2',
      name: 'Briefing for outside counsel',
      target: 'lawyer',
      content: `PRIVILEGED AND CONFIDENTIAL\n\nTO: [LAW FIRM]\nFROM: Acme Logistics Corp\nDATE: [CURRENT_DATE]\nRE: Ransomware incident, initial briefing\n\n- Systems affected: [SYSTEMS]\n- Data possibly taken: [DATA TYPES]\n- States where affected people live: [STATES]\n- What we have done so far: [STEPS]\n\nContact: [NAME], [PERSONAL PHONE]`,
    },
    {
      id: 'tpl-3',
      name: 'State attorney general notice',
      target: 'regulator',
      content: `TO: Office of the Attorney General, [STATE]\nRE: Notice of a data security incident\n\nAcme Logistics Corp discovered unauthorized access to its systems on [DISCOVERY_TIME].\nPersonal information involved: [DATA TYPES]\nNumber of [STATE] residents affected: [COUNT]\nSteps taken to protect people: [STEPS]\n\nContact: Alex Rivera, [PHONE]\n\nDraft only. Counsel must review before sending.`,
    },
  ],
  reportDrafts: [
    {
      id: 'draft-1',
      template_id: 'tpl-1',
      title: 'Cyber insurance claim notice - Draft',
      content: 'Legal and IT are reviewing this draft before it is sent.',
      updated_at: new Date().toISOString(),
    },
  ],
  drill: {
    scenarios: [
      {
        id: DEMO_SCENARIO.id,
        name: DEMO_SCENARIO.name,
        kind: DEMO_SCENARIO.kind,
        minutes: DEMO_SCENARIO.minutes,
        question_count: DEMO_SCENARIO.injects.length,
        description: 'Six questions about a ransomware attack at a medical office, covering backups, insurance, the ransom demand, notification and staff messages.',
      },
    ],
    session: null,
    players: [],
    questions: [],
    answers: [],
  },
  reducerLogs: [],
  activeBroadcast: null,
  slowModeSeconds: 0,
};

const STORAGE_KEY = 'drill_night_state_v3'; // v3: drill model matches the C# backend

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
    // Server messages that need a next step for non-technical people
    if (message.includes('Nobody has registered with that phone number'))
      message = "That person hasn't signed in yet. Ask them to open Outpost and sign in with that phone number, then add them again.";
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
    let route: ReturnType<typeof toLiveCall> = null;
    if (live.isLive) {
      try {
        route = toLiveCall(reducerName, args);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        store.reportError(message);
        return { success: false, error: message };
      }
      if (route && 'unsupported' in route) {
        store.reportError(route.unsupported);
        return { success: false, error: route.unsupported };
      }
    }
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
  setIncidentStatus(actor: string, status: 'active' | 'closed', opts: { name?: string; severity?: number } = {}) {
    return this.callReducer('set_incident_status', { status, ...opts }, (draft) => {
      draft.incident.status = status;
      if (opts.name) draft.incident.name = opts.name;
      if (opts.severity) draft.incident.severity = opts.severity;
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
  addScopeItem(actor: string, category: string, status: ScopeStatus, affected_states: string[], record_count: number) {
    return this.callReducer('add_scope_item', { category, status, affected_states, record_count }, (draft) => {
      draft.scopeItems.push({
        id: 'scope-' + Date.now(),
        category,
        status,
        affected_states,
        notes: record_count > 0 ? `${record_count.toLocaleString()} records` : '',
        record_count,
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

  // Reducers: report documents (create / update / delete)
  // In demo mode `result` is the new id; live, the row arrives through the subscription.
  createDraft(templateId: string, title: string, content: string) {
    return this.callReducer('create_draft', { templateId, title, content }, (draft) => {
      if (!title.trim()) throw new Error('Title can\'t be empty.');
      const now = new Date().toISOString();
      const id = 'draft-' + Date.now();
      draft.reportDrafts.unshift({ id, template_id: templateId, title: title.trim(), content, created_at: now, updated_at: now });
      return id;
    });
  },

  updateDraft(id: string, title: string, content: string) {
    return this.callReducer('update_draft', { id, title, content }, (draft) => {
      if (!title.trim()) throw new Error('Title can\'t be empty.');
      const existing = draft.reportDrafts.find((d) => d.id === id);
      if (!existing) throw new Error('That document no longer exists.');
      existing.title = title.trim();
      existing.content = content;
      existing.updated_at = new Date().toISOString();
    });
  },

  deleteDraft(id: string) {
    return this.callReducer('delete_draft', { id }, (draft) => {
      if (!draft.reportDrafts.some((d) => d.id === id)) throw new Error('That document no longer exists.');
      draft.reportDrafts = draft.reportDrafts.filter((d) => d.id !== id);
    });
  },

  // Reducer: updateIncident (summary)
  updateIncidentNotes(_actor: string, notes: string) {
    return this.callReducer('update_incident_notes', { notes }, (draft) => {
      draft.incident.notes = notes;
    });
  },

  // Reducer: saveTemplate (owner only on the server)
  saveTemplate(id: string, name: string, description: string, body: string) {
    return this.callReducer('save_template', { id, name, description, body }, (draft) => {
      const target = id.includes('insur') ? 'insurer' : id.includes('counsel') ? 'lawyer' : id.includes('regulat') ? 'regulator' : 'staff';
      const row = { id, name, description, target: target as 'insurer', content: body };
      const i = draft.reportTemplates.findIndex((t) => t.id === id);
      if (i >= 0) draft.reportTemplates[i] = row;
      else draft.reportTemplates.push(row);
    });
  },

  // Reducer: logExport (records which sections went into the PDF)
  logExport(actor: string, sections: string[]) {
    return this.callReducer('log_export', { sections }, (draft) => {
      draft.auditLogs.unshift({ id: 'aud-' + Date.now(), actor, action: 'EXPORT', timestamp: new Date().toISOString(), details: `Exported PDF: ${sections.join(', ') || '(no sections)'}` });
    });
  },

  /* ---------------- Drill Night ----------------
   * Same rules as backend/spacetimedb/Drill.cs. Live: calls the C# reducers.
   * Demo: runs locally, with simulated teammates so one person can try it.
   */
  drillCreate(me: Member, scenarioId: string) {
    return this.callReducer('create_drill', { scenarioId }, (draft) => {
      if (me.role !== 'owner') throw new Error('Only the owner can open a drill.');
      if (scenarioId !== DEMO_SCENARIO.id) throw new Error('No such scenario.');
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const id = String(Date.now());
      draft.drill = {
        ...draft.drill,
        session: {
          id,
          join_code: Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''),
          scenario_id: DEMO_SCENARIO.id,
          scenario_name: DEMO_SCENARIO.name,
          incident_id: `DRILL-${id.slice(-4)}`,
          status: 'lobby',
          started_at: null,
          current_question_id: null,
        },
        players: [],
        questions: [],
        answers: [],
      };
      // Demo only: teammates join on their own
      draft.members
        .filter((m) => m.id !== me.id && m.role !== 'insurer' && m.role !== 'outside_counsel')
        .slice(0, 3)
        .forEach((m, i) => draft.drill.players.push({ id: `dp-${id}-${i}`, person: m.identity, name: m.name.split(' ')[0], role: m.role, score: 0 }));
    });
  },

  drillJoin(me: Member, code: string, nickname: string) {
    return this.callReducer('join_drill', { code: code.trim().toUpperCase(), nickname: nickname.trim() }, (draft) => {
      const s = draft.drill.session;
      if (!s || s.join_code !== code.trim().toUpperCase()) throw new Error('No drill with that code.');
      if (s.status === 'finished') throw new Error('That drill is over.');
      if (!nickname.trim()) throw new Error("Nickname can't be empty.");
      const mine = draft.drill.players.find((p) => p.person === me.identity);
      if (mine) mine.name = nickname.trim();
      else draft.drill.players.push({ id: 'dp-' + Date.now(), person: me.identity, name: nickname.trim(), role: me.role, score: 0 });
    });
  },

  drillStart(me: Member) {
    return this.callReducer('start_drill', {}, (draft) => {
      const s = draft.drill.session;
      if (!s) throw new Error('No such drill.');
      if (me.role !== 'owner') throw new Error('Only the owner can do that.');
      if (s.status !== 'lobby') throw new Error('This drill already started.');
      s.status = 'running';
      s.started_at = new Date().toISOString();
      s.current_question_id = null;
    });
  },

  drillAnswer(me: Member, questionId: string, choice: number) {
    return this.callReducer('answer_question', { questionId, choice }, (draft) => {
      const s = draft.drill.session;
      if (!s || s.status !== 'running') throw new Error("This drill isn't running.");
      if (s.current_question_id !== questionId) throw new Error("That question isn't open.");
      const p = draft.drill.players.find((x) => x.person === me.identity);
      if (!p) throw new Error('Join the drill first.');
      demoAnswer(draft, questionId, p.person, choice);
    });
  },

  drillNext(me: Member) {
    return this.callReducer('next_question', {}, (draft) => {
      if (me.role !== 'owner') throw new Error('Only the owner can do that.');
      if (draft.drill.session?.status !== 'running') throw new Error("This drill isn't running.");
      demoAdvance(draft);
    });
  },

  drillEnd(me: Member) {
    return this.callReducer('end_drill', {}, (draft) => {
      if (me.role !== 'owner') throw new Error('Only the owner can do that.');
      if (!draft.drill.session || draft.drill.session.status === 'finished') return;
      demoFinish(draft);
    });
  },

  resetToDefaults() {
    currentState = JSON.parse(JSON.stringify(INITIAL_STATE));
    saveState(currentState);
  },
};


/* ---------------- Demo-mode drill engine (same rules as backend/spacetimedb/Drill.cs) ---------------- */

/** Demo pace: a new question every 30 s (the server's scenario spaces them 2 minutes apart). */
const DEMO_QUESTION_SECONDS = 30;

function demoAnswer(draft: AppState, questionId: string, person: string, choice: number) {
  const q = draft.drill.questions.find((x) => x.id === questionId)!;
  const p = draft.drill.players.find((x) => x.person === person)!;
  const inj = DEMO_SCENARIO.injects[q.position];
  if (q.for_role && q.for_role !== p.role) throw new Error(`That question is for ${q.for_role.replace('_', ' ')}.`);
  if (choice < 0 || choice >= q.options.length) throw new Error('Not a valid choice.');
  if (draft.drill.answers.some((a) => a.question_id === questionId && a.person === person)) throw new Error('You already answered.');
  const ms = Math.max(0, Date.now() - Date.parse(q.fired_at));
  const correct = choice === inj.correct;
  draft.drill.answers.push({ id: `da-${Date.now()}-${person.slice(0, 6)}`, question_id: questionId, person, choice, correct, answered_ms: ms });
  if (correct) p.score += drillPoints(inj.points, ms);
}

function demoAdvance(draft: AppState) {
  const next = draft.drill.questions.length;
  if (next >= DEMO_SCENARIO.injects.length) {
    demoFinish(draft);
    return;
  }
  const inj = DEMO_SCENARIO.injects[next];
  const id = `q-${Date.now()}-${next}`;
  draft.drill.questions.push({
    id,
    position: next,
    text: inj.text,
    for_role: inj.forRole,
    options: inj.choices,
    fired_at: new Date().toISOString(),
    correct_index: null,
    explanation: '',
  });
  draft.drill.session!.current_question_id = id;
}

function demoFinish(draft: AppState) {
  const s = draft.drill.session!;
  s.status = 'finished';
  // Reveal every answer + explanation (the server does this in FinishDrill)
  for (const q of draft.drill.questions) {
    const inj = DEMO_SCENARIO.injects[q.position];
    q.correct_index = inj.correct;
    q.explanation = inj.explanation;
  }
  for (const p of draft.drill.players) {
    const m = draft.members.find((x) => x.identity === p.person);
    if (m) m.drill_score = (m.drill_score ?? 0) + p.score;
  }
  const best = [...draft.drill.players].sort((a, b) => b.score - a.score)[0];
  draft.auditLogs.unshift({
    id: 'aud-' + Date.now(),
    actor: 'Drill Night',
    action: 'DRILL',
    timestamp: new Date().toISOString(),
    details: best ? `Drill finished. Top scorer: ${best.name} (${best.score} pts).` : 'Drill finished.',
  });
}

/** Members played by a real person in this browser (they never auto-answer). */
const demoHumans: string[] = [];
export function markDemoHuman(identity: string) {
  if (!demoHumans.includes(identity)) demoHumans.push(identity);
}

/** Demo heartbeat (the server uses the scheduled DrillTick table instead). */
setInterval(() => {
  if (live.isLive) return;
  const s = currentState.drill?.session;
  if (!s || s.status !== 'running') return;
  const draft: AppState = JSON.parse(JSON.stringify(currentState));
  const d = draft.drill;
  const cur = d.questions.find((q) => q.id === d.session!.current_question_id);
  let changed = false;
  const since = (iso: string) => (Date.now() - Date.parse(iso)) / 1000;
  if (!cur ? since(d.session!.started_at!) >= 5 : since(cur.fired_at) >= DEMO_QUESTION_SECONDS) {
    demoAdvance(draft);
    changed = true;
  } else if (cur) {
    for (const p of d.players) {
      if (demoHumans.includes(p.person)) continue;
      if (cur.for_role && cur.for_role !== p.role) continue;
      if (d.answers.some((a) => a.question_id === cur.id && a.person === p.person)) continue;
      if (Math.random() < 0.12) {
        const inj = DEMO_SCENARIO.injects[cur.position];
        const pick = Math.random() < 0.7 ? inj.correct : (inj.correct + 1 + Math.floor(Math.random() * 3)) % 4;
        demoAnswer(draft, cur.id, p.person, pick);
        changed = true;
      }
    }
  }
  if (changed) {
    currentState = draft;
    saveState(currentState);
  }
}, 1000);
