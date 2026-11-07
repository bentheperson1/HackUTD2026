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
  DrillSession,
  DrillPlayer,
  DrillEvent,
  ReducerCallLog,
  IncidentPhase,
  Role,
  ScopeStatus,
  ScenarioType,
} from './types';

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
  drillSession: DrillSession;
  drillPlayers: DrillPlayer[];
  drillEvents: DrillEvent[];
  reducerLogs: ReducerCallLog[];
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
    },
    {
      id: 'm-2',
      identity: '7f938b8120ef9a37bc8102394850123849102834019283401293840129384012',
      name: 'Taylor IT Lead',
      phone: '+1 (555) 771-4920',
      role: 'it_lead',
      org_id: 'org-001',
      expires_at: null,
    },
    {
      id: 'm-3',
      identity: '3a189f2830e84b91720349817234908123740981273409812734091827340918',
      name: 'Morgan Legal',
      phone: '+1 (555) 604-1290',
      role: 'legal',
      org_id: 'org-001',
      expires_at: null,
    },
    {
      id: 'm-4',
      identity: '8b72019348120349812039481203948120394812039481203948120394812039',
      name: 'Sam Insurer',
      phone: '+1 (555) 919-4402',
      role: 'insurer',
      org_id: 'org-001',
      expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
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
      sender_name: 'System',
      sender_role: 'it_lead',
      content: 'Out-of-band crisis channel initialized. Secure network established.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
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
      content: `CONFIDENTIAL ATTORNEY-CLIENT PRIVILEGED / WORK PRODUCT\n\nMEMORANDUM\nTO: Outside Counsel\nFROM: Incident Response Team\nDATE: [CURRENT_DATE]\nSUBJECT: Ransomware Incident Initial Briefing\n\n- Affected Systems & Scope: [SCOPE_SUMMARY]\n- Forensic Findings: Pending containment.\n- Notification Analysis: Evaluating state statutory deadlines.`,
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
  drillSession: {
    id: 'drill-001',
    scenario: 'ransomware',
    status: 'pending',
    started_at: null,
    time_remaining_seconds: 900,
  },
  drillPlayers: [
    { id: 'dp-1', name: 'Alex Rivera', role: 'owner', score: 150 },
    { id: 'dp-2', name: 'Taylor IT Lead', role: 'it_lead', score: 200 },
    { id: 'dp-3', name: 'Morgan Legal', role: 'legal', score: 180 },
  ],
  drillEvents: [
    {
      id: 'dev-1',
      timestamp: '00:00',
      description: 'Ransomware detected on NAS storage cluster. Threat actor demands 15 BTC.',
      points: 50,
      action_required: 'Isolate storage vLAN immediately.',
    },
    {
      id: 'dev-2',
      timestamp: '03:15',
      description: 'Threat actor leaks sample proof of customer directory on dark web forum.',
      points: 75,
      action_required: 'Review regulatory notification timeline for affected states.',
    },
  ],
  reducerLogs: [],
};

const STORAGE_KEY = 'drill_night_state_v1';

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

window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY && e.newValue) {
    try {
      currentState = JSON.parse(e.newValue);
      listeners.forEach((l) => l(currentState));
    } catch (err) {
      console.error(err);
    }
  }
});

window.addEventListener('drill_night_store_update', () => {
  listeners.forEach((l) => l(currentState));
});

export const store = {
  getState(): AppState {
    return currentState;
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
  sendMessage(sender_name: string, sender_role: Role, content: string) {
    return this.callReducer('send_message', { sender_name, sender_role, content }, (draft) => {
      if (!content.trim()) throw new Error('Message cannot be empty');
      draft.messages.push({
        id: 'msg-' + Date.now(),
        sender_name,
        sender_role,
        content,
        timestamp: new Date().toISOString(),
      });
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

  // Reducer: startDrill
  startDrill(actor: string, scenario: ScenarioType) {
    return this.callReducer('start_drill', { scenario }, (draft) => {
      draft.drillSession = {
        id: 'drill-' + Date.now(),
        scenario,
        status: 'running',
        started_at: new Date().toISOString(),
        time_remaining_seconds: 900,
      };
      draft.auditLogs.unshift({
        id: 'aud-' + Date.now(),
        actor,
        action: 'START_DRILL',
        timestamp: new Date().toISOString(),
        details: `Started 15-minute drill session: ${scenario.toUpperCase()}`,
      });
    });
  },

  // Reducer: awardPoints
  awardPoints(playerId: string, points: number) {
    return this.callReducer('award_drill_points', { playerId, points }, (draft) => {
      const p = draft.drillPlayers.find((x) => x.id === playerId);
      if (p) p.score += points;
    });
  },

  // Reducer: resetToDefaults
  resetToDefaults() {
    currentState = JSON.parse(JSON.stringify(INITIAL_STATE));
    saveState(currentState);
  },
};
