/**
 * Live data layer for the C# SpacetimeDB module in backend/spacetimedb.
 *
 * - When the subscription succeeds, every screen reads from the module's tables
 *   (mapped into the AppState shape the pages use) and every store action calls
 *   the matching reducer. The server enforces all permissions.
 * - If SpacetimeDB is unreachable, the app stays on local DEMO data.
 *
 * Backend conventions this file translates:
 *   roles     "Owner" | "ItLead" | "Legal" | "Comms" | "Insurer" | "Counsel"
 *   incident  status 0 = open, 1 = closed; phase 0..4; ids like INC-0001 / DRILL-0001
 *   scope     status 0 unknown, 1 exfiltrated, 2 locked, 3 restored
 *   chat      chatType 1 admin (Executive), 2 incident war room, 3 general (read via views)
 */
import { Identity } from 'spacetimedb';
import { DbConnection, tables } from '../module_bindings';
import type { AppState } from './store';
import type {
  Member,
  Role,
  ScopeStatus,
  IncidentPhase,
  ChatChannel,
  AuditLogEntry,
  Message,
  Task,
  ScopeItem,
  ReportTemplate,
  ReportDraft,
  DrillState,
  DrillStatus,
} from './types';

export type LiveStatus = 'connecting' | 'live' | 'offline' | 'not-deployed';

/** Where the signed-in browser is in onboarding (live mode only). */
export type LiveAccount =
  | { stage: 'no-phone' }
  | { stage: 'no-org'; name: string; phone: string }
  | { stage: 'ready'; memberId: string; name: string; phone: string };

type Listener = () => void;

/* ------------------------------ mappings ------------------------------ */

const ROLE_FROM_SERVER: Record<string, Role> = {
  Owner: 'owner',
  ItLead: 'it_lead',
  Legal: 'legal',
  Comms: 'comms',
  Insurer: 'insurer',
  Counsel: 'outside_counsel',
};
const ROLE_TO_SERVER: Record<Role, string> = {
  owner: 'Owner',
  it_lead: 'ItLead',
  legal: 'Legal',
  comms: 'Comms',
  insurer: 'Insurer',
  outside_counsel: 'Counsel',
};
export const roleFromServer = (r: string): Role => ROLE_FROM_SERVER[r] ?? 'comms';
export const roleToServer = (r: Role) => ROLE_TO_SERVER[r];

const PHASES: IncidentPhase[] = ['detection', 'containment', 'eradication', 'recovery', 'post_incident'];
const SCOPE_FROM: ScopeStatus[] = ['unknown', 'exfiltrated', 'locked', 'restored'];
const SCOPE_TO: Record<ScopeStatus, number> = { unknown: 0, exfiltrated: 1, locked: 2, restored: 3 };
const CHAT_TO: Record<ChatChannel, number> = { admin: 1, warroom: 2, general: 3 };

/** Broadcasts ride on normal war-room messages with this prefix (the module has no broadcast table). */
export const BROADCAST_PREFIX = '[BROADCAST] ';
export const BROADCAST_CLEARED = '[BROADCAST CLEARED]';

const tsToIso = (ts: { microsSinceUnixEpoch: bigint } | undefined | null) =>
  ts ? new Date(Number(ts.microsSinceUnixEpoch / 1000n)).toISOString() : null;
const micros = (ts: { microsSinceUnixEpoch: bigint }) => ts.microsSinceUnixEpoch;

const formatPhone = (p: string) => {
  const d = p.replace(/\D/g, '');
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  return ten.length === 10 ? `+1 (${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}` : p;
};

/** Gives free-text timeline entries a short action code so the audit log can group them. */
function actionCode(text: string): string {
  const t = text.toLowerCase();
  if (t.startsWith('incident activated')) return 'INCIDENT_ACTIVATED';
  if (t.startsWith('incident closed')) return 'INCIDENT_CLOSED';
  if (t.startsWith('phase changed')) return 'PHASE_CHANGED';
  if (t.startsWith('scope')) return 'SCOPE_UPDATED';
  if (t.startsWith('task done')) return 'TASK_COMPLETED';
  if (t.startsWith('drill')) return 'DRILL';
  if (t.startsWith('exported')) return 'EXPORT';
  if (t.startsWith('notification obligation') || t.startsWith('notice for')) return 'NOTICE';
  if (t.includes('access') || t.includes('granted')) return 'ACCESS';
  if (t.includes('joined as') || t.startsWith('roster')) return 'ROSTER';
  return 'NOTE';
}

/** Same formula as ScorePoints in Drill.cs, so the UI can show points per answer. */
export const drillPoints = (points: number, ms: number) => {
  if (ms <= 5000) return points;
  if (ms >= 30000) return Math.floor(points / 2);
  return Math.floor(points * (1 - 0.5 * ((ms - 5000) / 25000)));
};

/* ------------------------------ bridge ------------------------------ */

class LiveBridge {
  conn: DbConnection | null = null;
  identityHex = '';
  status: LiveStatus = 'connecting';
  statusDetail = '';
  slices: Partial<AppState> | null = null;
  account: LiveAccount = { stage: 'no-phone' };
  /** Context the reducer calls need */
  orgId: bigint | null = null;
  incidentId: string | null = null;
  /** member id (as used in AppState) -> server Identity */
  private identities = new Map<string, Identity>();
  private listeners = new Set<Listener>();
  private rebuildQueued = false;

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  get isLive() {
    return this.status === 'live' && !!this.conn;
  }

  get myMemberId() {
    return this.account.stage === 'ready' ? this.account.memberId : null;
  }

  identityOf(memberId: string) {
    return this.identities.get(memberId) ?? null;
  }

  /** Called from main.tsx when the WebSocket connects. */
  attach(conn: DbConnection, identity: Identity) {
    this.conn = conn;
    this.identityHex = identity.toHexString();
    this.status = 'connecting';
    this.emit();

    conn
      .subscriptionBuilder()
      .onApplied(() => {
        this.status = 'live';
        this.statusDetail = '';
        this.rebuild();
      })
      .onError(() => {
        this.status = 'not-deployed';
        this.statusDetail = 'Subscription failed. Publish the backend: npm run spacetime:publish';
        this.slices = null;
        this.emit();
      })
      .subscribe([
        tables.user,
        tables.organization,
        tables.orgMember,
        tables.incident,
        tables.incidentMember,
        tables.guestGrant,
        tables.activation,
        tables.timelineEntry,
        tables.scopeItem,
        tables.task,
        tables.docTemplate,
        tables.incidentDocument,
        tables.drillScenario,
        tables.drillSession,
        tables.drillPlayer,
        tables.drillQuestion,
        tables.drillAnswer,
        tables.adminMessages,
        tables.incidentMessages,
        tables.generalMessages,
      ]);

    const db = conn.db;
    const watch = [
      db.user, db.organization, db.orgMember, db.incident, db.incidentMember, db.guestGrant, db.activation,
      db.timelineEntry, db.scopeItem, db.task, db.docTemplate, db.incidentDocument, db.drillScenario,
      db.drillSession, db.drillPlayer, db.drillQuestion, db.drillAnswer, db.adminMessages, db.incidentMessages,
      db.generalMessages,
    ];
    for (const tbl of watch) {
      const t = tbl as unknown as { onInsert: (cb: () => void) => void; onDelete: (cb: () => void) => void; onUpdate?: (cb: () => void) => void };
      t.onInsert(() => this.queueRebuild());
      t.onDelete(() => this.queueRebuild());
      t.onUpdate?.(() => this.queueRebuild());
    }
  }

  detach() {
    this.status = 'offline';
    this.emit();
  }

  private queueRebuild() {
    if (this.rebuildQueued || this.status !== 'live') return;
    this.rebuildQueued = true;
    queueMicrotask(() => {
      this.rebuildQueued = false;
      this.rebuild();
    });
  }

  /** Turns table rows into the AppState shape the pages already use. */
  private rebuild() {
    const conn = this.conn;
    if (!conn) return;
    const db = conn.db;
    const me = this.identityHex;
    const hex = (i: Identity) => i.toHexString();

    // People
    const users = new Map([...db.user.iter()].map((u) => [hex(u.id), u]));
    const nameOf = (i: Identity) => users.get(hex(i))?.displayName ?? 'Unknown';
    const myUser = users.get(me);

    // Which company: the first one I'm on the roster of (or a guest in)
    const myMemberships = [...db.orgMember.iter()].filter((m) => hex(m.person) === me);
    const myGrants = [...db.guestGrant.iter()].filter((g) => hex(g.person) === me);
    const allIncidents = [...db.incident.iter()];
    let orgId: bigint | null = myMemberships[0]?.orgId ?? null;
    if (orgId === null && myGrants[0]) orgId = allIncidents.find((i) => i.id === myGrants[0].incidentId)?.orgId ?? null;
    this.orgId = orgId;
    const org = orgId !== null ? [...db.organization.iter()].find((o) => o.id === orgId) : undefined;

    // Current incident: newest real (non-drill) incident for the company
    const incidents = allIncidents
      .filter((i) => i.orgId === orgId && !i.isDrill)
      .sort((a, b) => (micros(a.openedAt) < micros(b.openedAt) ? 1 : -1));
    const inc = incidents.find((i) => i.status === 0) ?? incidents[0];
    const incId = inc?.id ?? null;
    this.incidentId = incId;

    // Roster: company members + live guests on the current incident
    this.identities.clear();
    const timeline = [...db.timelineEntry.iter()];
    const drillTotals = new Map<string, number>();
    const orgSessions = new Set([...db.drillSession.iter()].filter((s) => s.orgId === orgId && s.status === 'finished').map((s) => s.id));
    for (const p of db.drillPlayer.iter()) {
      if (!orgSessions.has(p.sessionId)) continue;
      drillTotals.set(hex(p.person), (drillTotals.get(hex(p.person)) ?? 0) + Number(p.score));
    }
    const members: Member[] = [...db.orgMember.iter()]
      .filter((m) => m.orgId === orgId)
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map((m) => {
        const id = String(m.id);
        this.identities.set(id, m.person);
        const u = users.get(hex(m.person));
        return {
          id,
          identity: hex(m.person),
          name: u?.displayName ?? 'Unknown',
          phone: formatPhone(u?.phone ?? ''),
          role: roleFromServer(m.role),
          org_id: String(m.orgId),
          expires_at: null,
          drill_score: drillTotals.get(hex(m.person)) ?? 0,
          online: u?.online ?? false,
        };
      });
    const nowMicros = BigInt(Date.now()) * 1000n;
    for (const g of db.guestGrant.iter()) {
      if (g.incidentId !== incId || micros(g.expiresAt) < nowMicros) continue;
      const id = `g-${g.id}`;
      this.identities.set(id, g.person);
      const u = users.get(hex(g.person));
      members.push({
        id,
        identity: hex(g.person),
        name: u?.displayName ?? 'Guest',
        phone: formatPhone(u?.phone ?? ''),
        role: roleFromServer(g.role),
        org_id: String(orgId ?? ''),
        expires_at: tsToIso(g.expiresAt),
        grant_id: String(g.id),
        online: u?.online ?? false,
      });
    }

    // Account stage (drives login / onboarding)
    const meMember = members.find((m) => m.identity === me);
    if (!myUser || myUser.phone.startsWith('moved:')) this.account = { stage: 'no-phone' };
    else if (!meMember) this.account = { stage: 'no-org', name: myUser.displayName, phone: formatPhone(myUser.phone) };
    else this.account = { stage: 'ready', memberId: meMember.id, name: myUser.displayName, phone: formatPhone(myUser.phone) };

    const roleOf = (i: Identity): Role => members.find((m) => m.identity === hex(i))?.role ?? 'comms';

    // Chat: the three views already filter by what this caller may read
    const toMsg = (channel: ChatChannel) => (m: { id: bigint; incidentId: string; sender: Identity; text: string; sentAt: { microsSinceUnixEpoch: bigint }; isSystem: boolean }): Message => ({
      id: `${channel}-${m.id}`,
      sender_name: m.isSystem ? 'System' : nameOf(m.sender),
      sender_role: roleOf(m.sender),
      content: m.text.startsWith(BROADCAST_PREFIX) ? m.text.slice(BROADCAST_PREFIX.length) : m.text,
      timestamp: tsToIso(m.sentAt as never)!,
      channel,
      is_broadcast: m.text.startsWith(BROADCAST_PREFIX),
      is_system: m.isSystem,
    });
    const forIncident = <T extends { incidentId: string }>(rows: Iterable<T>) => [...rows].filter((r) => r.incidentId === incId);
    const rawWarroom = forIncident(db.incidentMessages.iter()).sort((a, b) => (micros(a.sentAt) < micros(b.sentAt) ? -1 : 1));
    const messages: Message[] = [
      ...rawWarroom.filter((m) => m.text !== BROADCAST_CLEARED).map(toMsg('warroom')),
      ...forIncident(db.adminMessages.iter()).map(toMsg('admin')),
      ...forIncident(db.generalMessages.iter()).map(toMsg('general')),
    ].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Latest broadcast wins; a "cleared" marker after it hides the banner
    const lastBroadcast = [...rawWarroom].reverse().find((m) => m.text.startsWith(BROADCAST_PREFIX) || m.text === BROADCAST_CLEARED);
    const activeBroadcast =
      lastBroadcast && lastBroadcast.text !== BROADCAST_CLEARED
        ? { id: String(lastBroadcast.id), message: lastBroadcast.text.slice(BROADCAST_PREFIX.length), author: nameOf(lastBroadcast.sender), timestamp: tsToIso(lastBroadcast.sentAt)! }
        : null;

    const auditLogs: AuditLogEntry[] = timeline
      .filter((e) => e.incidentId === incId)
      .sort((a, b) => (micros(a.createdAt) > micros(b.createdAt) ? -1 : 1))
      .map((e) => ({ id: String(e.id), actor: nameOf(e.author), action: actionCode(e.action), timestamp: tsToIso(e.createdAt)!, details: e.action }));

    const tasks: Task[] = [...db.task.iter()]
      .filter((t) => t.incidentId === incId)
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map((t) => ({
        id: String(t.id),
        title: t.title,
        description: t.status === 'doing' ? 'In progress' : '',
        role: roleFromServer(t.forRole),
        assignee: t.assignee ? nameOf(t.assignee) : '',
        done: t.status === 'done',
        created_at: tsToIso(t.updatedAt)!,
      }));

    const scopeItems: ScopeItem[] = [...db.scopeItem.iter()]
      .filter((s) => s.incidentId === incId)
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map((s) => ({
        id: String(s.id),
        category: s.dataType,
        status: SCOPE_FROM[s.status] ?? 'unknown',
        affected_states: [...s.states],
        notes: s.recordCount > 0n ? `${Number(s.recordCount).toLocaleString()} records` : '',
        record_count: Number(s.recordCount),
        updated_at: tsToIso(s.updatedAt)!,
      }));

    const templates = [...db.docTemplate.iter()].sort((a, b) => a.name.localeCompare(b.name));
    const reportTemplates: ReportTemplate[] = templates.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      target: d.id.includes('insur') ? 'insurer' : d.id.includes('counsel') ? 'lawyer' : d.id.includes('regulat') ? 'regulator' : 'staff',
      content: d.body,
    }));
    const reportDrafts: ReportDraft[] = [...db.incidentDocument.iter()]
      .filter((d) => d.incidentId === incId)
      .map((d) => ({
        id: d.id,
        template_id: d.templateId,
        title: templates.find((t) => t.id === d.templateId)?.name ?? d.templateId,
        content: d.body,
        updated_at: tsToIso(d.updatedAt)!,
      }));

    // Drill Night: the company's newest drill session
    const ses = [...db.drillSession.iter()].filter((d) => d.orgId === orgId).sort((a, b) => (a.id < b.id ? 1 : -1))[0];
    const scenarios = [...db.drillScenario.iter()];
    const questions = ses ? [...db.drillQuestion.iter()].filter((q) => q.sessionId === ses.id).sort((a, b) => (micros(a.firedAt) < micros(b.firedAt) ? -1 : 1)) : [];
    const drill: DrillState = {
      scenarios: scenarios
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => ({ id: s.id, name: s.name, kind: s.kind, minutes: Number(s.minutes), question_count: null, description: '' })),
      session: ses
        ? {
            id: String(ses.id),
            join_code: ses.joinCode,
            scenario_id: ses.scenarioId,
            scenario_name: scenarios.find((s) => s.id === ses.scenarioId)?.name ?? ses.scenarioId,
            incident_id: ses.incidentId,
            status: ses.status as DrillStatus,
            started_at: tsToIso(ses.startedAt),
            current_question_id: ses.currentInject !== undefined && ses.currentInject !== null ? String(ses.currentInject) : null,
          }
        : null,
      players: ses
        ? [...db.drillPlayer.iter()]
            .filter((p) => p.sessionId === ses.id)
            .map((p) => ({ id: String(p.id), person: hex(p.person), name: p.nickname, role: roleFromServer(p.role), score: Number(p.score) }))
        : [],
      questions: questions.map((q, i) => ({
        id: String(q.injectId),
        position: i,
        text: q.text,
        for_role: q.forRole ? roleFromServer(q.forRole) : null,
        options: [...q.choices],
        fired_at: tsToIso(q.firedAt)!,
        correct_index: q.correctChoice !== undefined && q.correctChoice !== null ? Number(q.correctChoice) : null,
        explanation: q.explanation,
      })),
      answers: ses
        ? [...db.drillAnswer.iter()]
            .filter((a) => a.sessionId === ses.id)
            .map((a) => ({ id: String(a.id), question_id: String(a.injectId), person: hex(a.person), choice: Number(a.choice), correct: a.correct, answered_ms: Number(a.answeredMs) }))
        : [],
    };
    this.drillSessionId = ses?.id ?? null;

    this.slices = {
      drill,
      org: { id: String(orgId ?? ''), name: org?.name ?? 'Your company' },
      members,
      incident: {
        id: inc?.id ?? '—',
        name: inc?.name ?? '',
        severity: inc?.severity ?? 0,
        status: !inc ? 'inactive' : inc.status === 0 ? 'active' : 'closed',
        phase: PHASES[inc?.phase ?? 0] ?? 'detection',
        started_at: tsToIso(inc?.openedAt),
        closed_at: inc && inc.status === 1 ? tsToIso([...timeline].reverse().find((e) => e.incidentId === inc.id && e.action === 'Incident closed')?.createdAt) : null,
        notes: inc?.summary ?? '',
      },
      messages,
      tasks,
      auditLogs,
      scopeItems,
      reportTemplates,
      reportDrafts,
      activeBroadcast,
      slowModeSeconds: 0,
    };
    this.emit();
  }

  drillSessionId: bigint | null = null;

  /** Calls a reducer by its camelCase accessor name. Rejects with the server's error message. */
  async call(reducer: string, args: Record<string, unknown>): Promise<void> {
    if (!this.conn) throw new Error('Not connected to SpacetimeDB.');
    const fn = (this.conn.reducers as unknown as Record<string, (a: Record<string, unknown>) => Promise<void>>)[reducer];
    if (!fn) throw new Error(`Reducer ${reducer} is not in the bindings. Re-run npm run spacetime:generate.`);
    await fn(args);
  }

  /** Row counts per table, for the Diagnostics page. */
  tableCounts(): Record<string, number> {
    if (!this.conn) return {};
    const db = this.conn.db;
    const n = (x: { count(): number | bigint }) => Number(x.count());
    return {
      user: n(db.user),
      organization: n(db.organization),
      org_member: n(db.orgMember),
      incident: n(db.incident),
      incident_member: n(db.incidentMember),
      guest_grant: n(db.guestGrant),
      timeline_entry: n(db.timelineEntry),
      scope_item: n(db.scopeItem),
      task: n(db.task),
      doc_template: n(db.docTemplate),
      incident_document: n(db.incidentDocument),
      drill_session: n(db.drillSession),
      drill_player: n(db.drillPlayer),
      drill_question: n(db.drillQuestion),
      drill_answer: n(db.drillAnswer),
      incident_messages: n(db.incidentMessages),
      admin_messages: n(db.adminMessages),
      general_messages: n(db.generalMessages),
    };
  }

  /** Registered users who can be signed in as (demo convenience: the module allows phone takeover). */
  registeredUsers(): { name: string; phone: string; role: Role | null }[] {
    if (!this.conn) return [];
    const roles = new Map([...this.conn.db.orgMember.iter()].map((m) => [m.person.toHexString(), roleFromServer(m.role)]));
    return [...this.conn.db.user.iter()]
      .filter((u) => !u.phone.startsWith('moved:'))
      .map((u) => ({ name: u.displayName, phone: formatPhone(u.phone), role: roles.get(u.id.toHexString()) ?? null }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}

export const live = new LiveBridge();

/* ------------------------------ actions ------------------------------ */

export type LiveRoute = { reducer: string; args: Record<string, unknown> } | { unsupported: string } | null;

const needIncident = (): string => {
  if (!live.incidentId) throw new Error('There is no incident yet. Activate one first.');
  return live.incidentId;
};
const needOpenIncident = (): string => {
  const id = needIncident();
  const s = live.slices?.incident?.status;
  if (s !== 'active') throw new Error('The incident is closed. Activate a new one first.');
  return id;
};
const needOrg = (): bigint => {
  if (live.orgId === null) throw new Error('Create or join a company first.');
  return live.orgId;
};
const needIdentity = (memberId: unknown) => {
  const i = live.identityOf(String(memberId));
  if (!i) throw new Error('That person is not on the roster.');
  return i;
};
const needDrill = (): bigint => {
  if (live.drillSessionId === null) throw new Error('No drill is open.');
  return live.drillSessionId;
};

/**
 * Maps the store's action names to reducers in the C# module.
 * Returns { unsupported } for features the module doesn't have, and null to keep
 * an action local. Throws (with a readable message) when context is missing.
 */
export function toLiveCall(name: string, a: Record<string, unknown>): LiveRoute {
  switch (name) {
    case 'record_audit_log':
      return { reducer: 'logAction', args: { incidentId: needIncident(), action: String(a.details || a.action) } };
    case 'add_member': {
      const role = a.role as Role;
      if (role === 'insurer' || role === 'outside_counsel') {
        const days = typeof a.expires_at === 'string' ? Math.max(1, Math.min(30, Math.round((Date.parse(a.expires_at) - Date.now()) / 86_400_000))) : 7;
        return { reducer: 'grantGuest', args: { incidentId: needOpenIncident(), phone: a.phone, role: roleToServer(role), days } };
      }
      return { reducer: 'addOrgMember', args: { orgId: needOrg(), phone: a.phone, role: roleToServer(role) } };
    }
    case 'update_member_role':
      return { reducer: 'setOrgRole', args: { orgId: needOrg(), person: needIdentity(a.memberId), role: roleToServer(a.newRole as Role) } };
    case 'remove_member': {
      const id = String(a.memberId);
      if (id.startsWith('g-')) return { reducer: 'revokeGuest', args: { grantId: BigInt(id.slice(2)) } };
      return { unsupported: 'The server has no way to remove a company member yet. Change their role instead.' };
    }
    case 'set_incident_status':
      return a.status === 'active'
        ? {
            reducer: 'activateIncident',
            args: { orgId: needOrg(), name: String(a.name || 'Ransomware incident'), incidentType: 0, severity: Number(a.severity || 4) },
          }
        : { reducer: 'closeIncident', args: { incidentId: needIncident() } };
    case 'set_incident_phase':
      return { reducer: 'setPhase', args: { incidentId: needOpenIncident(), phase: Math.max(0, PHASES.indexOf(a.phase as IncidentPhase)) } };
    case 'update_incident_notes':
      return { reducer: 'updateIncident', args: { incidentId: needOpenIncident(), summary: String(a.notes ?? ''), currentStatus: String(a.currentStatus ?? '') } };
    case 'send_message':
      return { reducer: 'sendMessage', args: { incidentId: needIncident(), chatType: CHAT_TO[(a.channel as ChatChannel) ?? 'warroom'], text: a.content } };
    case 'set_broadcast':
      return { reducer: 'sendMessage', args: { incidentId: needIncident(), chatType: 2, text: BROADCAST_PREFIX + String(a.message) } };
    case 'clear_broadcast':
      return { reducer: 'sendMessage', args: { incidentId: needIncident(), chatType: 2, text: BROADCAST_CLEARED } };
    case 'set_slow_mode':
      return { unsupported: 'Slow mode is not available on this server.' };
    case 'create_task':
      return { reducer: 'createTask', args: { incidentId: needOpenIncident(), title: a.title, forRole: roleToServer(a.role as Role) } };
    case 'toggle_task': {
      const t = live.slices?.tasks?.find((x) => x.id === String(a.taskId));
      return { reducer: 'updateTask', args: { taskId: BigInt(String(a.taskId)), status: t?.done ? 'todo' : 'done' } };
    }
    case 'add_scope_item':
      return {
        reducer: 'upsertScopeItem',
        args: {
          incidentId: needOpenIncident(),
          id: 0n,
          dataType: a.category,
          recordCount: BigInt(Math.max(0, Math.floor(Number(a.record_count) || 0))),
          status: SCOPE_TO[a.status as ScopeStatus] ?? 0,
          states: a.affected_states ?? [],
        },
      };
    case 'update_scope_item': {
      const item = live.slices?.scopeItems?.find((s) => s.id === String(a.itemId));
      if (!item) throw new Error('That scope item is gone.');
      return {
        reducer: 'upsertScopeItem',
        args: {
          incidentId: needOpenIncident(),
          id: BigInt(item.id),
          dataType: item.category,
          recordCount: BigInt(item.record_count ?? 0),
          status: SCOPE_TO[a.status as ScopeStatus] ?? 0,
          states: item.affected_states,
        },
      };
    }
    case 'save_draft':
      return { reducer: 'saveDocument', args: { incidentId: needOpenIncident(), templateId: a.templateId, body: a.content } };
    case 'save_template':
      return { reducer: 'saveTemplate', args: { id: a.id, name: a.name, description: a.description ?? '', body: a.body } };
    case 'log_export':
      return { reducer: 'logExport', args: { incidentId: needIncident(), sections: a.sections ?? [] } };
    case 'create_drill':
      return { reducer: 'createDrill', args: { orgId: needOrg(), scenarioId: a.scenarioId } };
    case 'join_drill':
      return { reducer: 'joinDrill', args: { joinCode: a.code, nickname: a.nickname } };
    case 'start_drill':
      return { reducer: 'startDrill', args: { sessionId: needDrill() } };
    case 'answer_question':
      return { reducer: 'answerInject', args: { sessionId: needDrill(), injectId: BigInt(String(a.questionId)), choice: BigInt(Number(a.choice)) } };
    case 'next_question':
      return { reducer: 'nextInjectNow', args: { sessionId: needDrill() } };
    case 'end_drill':
      return { reducer: 'endDrill', args: { sessionId: needDrill() } };
    default:
      return null;
  }
}
