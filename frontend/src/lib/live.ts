/**
 * Live data layer: connects the app's store to SpacetimeDB.
 *
 * - When the module is published and the subscription succeeds, the store
 *   switches to LIVE: every screen reads from SpacetimeDB tables, and every
 *   store action calls the matching reducer on the server.
 * - If SpacetimeDB is unreachable or the module isn't published yet, the app
 *   stays on DEMO data (local, this browser only) so the UI still works.
 */
import type { Identity } from 'spacetimedb';
import { DbConnection, tables } from '../module_bindings';
import type { AppState } from './store';
import type { Member, Role, ScopeStatus, IncidentPhase, ChatChannel, AuditLogEntry, Message, Task, ScopeItem, ReportTemplate, ReportDraft, DrillState, DrillStatus } from './types';

export type LiveStatus = 'connecting' | 'live' | 'offline' | 'not-deployed';

type Listener = () => void;

const tsToIso = (ts: { microsSinceUnixEpoch: bigint } | undefined | null) =>
  ts ? new Date(Number(ts.microsSinceUnixEpoch / 1000n)).toISOString() : null;

const formatPhone = (digits: string) =>
  digits.length === 10 ? `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : digits;

class LiveBridge {
  conn: DbConnection | null = null;
  identityHex = '';
  status: LiveStatus = 'connecting';
  statusDetail = '';
  slices: Partial<AppState> | null = null;
  myMemberId: string | null = null;
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

  /** Called from main.tsx when the WebSocket connects. */
  attach(conn: DbConnection, identity: Identity) {
    this.conn = conn;
    this.identityHex = identity.toHexString();
    this.status = 'connecting';
    this.emit();

    const all = [
      tables.organization,
      tables.member,
      tables.incident,
      tables.message,
      tables.timelineEntry,
      tables.scopeItem,
      tables.task,
      tables.docTemplate,
      tables.incidentDocument,
      tables.drillScenario,
      tables.drillSession,
      tables.drillPlayer,
      tables.drillRound,
      tables.drillAnswer,
    ];

    conn
      .subscriptionBuilder()
      .onApplied(() => {
        this.status = 'live';
        this.statusDetail = '';
        this.rebuild();
      })
      .onError((_ctx: unknown) => {
        // Most common cause: the new module hasn't been published yet
        this.status = 'not-deployed';
        this.statusDetail = 'Subscription failed. Publish the module: npm run spacetime:publish';
        this.slices = null;
        this.emit();
      })
      .subscribe(all);

    const db = conn.db;
    const tablesToWatch = [db.organization, db.member, db.incident, db.message, db.timelineEntry, db.scopeItem, db.task, db.docTemplate, db.incidentDocument, db.drillScenario, db.drillSession, db.drillPlayer, db.drillRound, db.drillAnswer];
    for (const tbl of tablesToWatch) {
      tbl.onInsert(() => this.queueRebuild());
      tbl.onDelete(() => this.queueRebuild());
      // Tables with a primary key also fire onUpdate
      (tbl as unknown as { onUpdate?: (cb: () => void) => void }).onUpdate?.(() => this.queueRebuild());
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

    const memberRows = [...db.member.iter()];
    const me = memberRows.find((m) => m.identity && m.identity.toHexString() === this.identityHex);
    this.myMemberId = me ? String(me.id) : null;

    const orgId = me?.orgId ?? memberRows[0]?.orgId ?? [...db.organization.iter()][0]?.id;
    const orgRow = [...db.organization.iter()].find((o) => o.id === orgId);

    const incidents = [...db.incident.iter()].filter((i) => i.orgId === orgId).sort((a, b) => (a.id < b.id ? 1 : -1));
    const inc = incidents[0];
    const incId = inc?.id ?? -1n;

    const members: Member[] = memberRows
      .filter((m) => m.orgId === orgId)
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map((m) => ({
        id: String(m.id),
        identity: m.identity ? m.identity.toHexString() : '',
        name: m.fullName,
        phone: formatPhone(m.phone),
        role: m.orgRole as Role,
        org_id: String(m.orgId),
        expires_at: tsToIso(m.expiresAt),
        drill_score: m.drillScore,
      }));

    const messages: Message[] = [...db.message.iter()]
      .filter((m) => m.incidentId === incId)
      .sort((a, b) => (a.sentAt.microsSinceUnixEpoch < b.sentAt.microsSinceUnixEpoch ? -1 : 1))
      .map((m) => ({
        id: String(m.id),
        sender_name: m.senderName,
        sender_role: m.senderRole as Role,
        content: m.text,
        timestamp: tsToIso(m.sentAt)!,
        channel: m.channel as ChatChannel,
      }));

    const auditLogs: AuditLogEntry[] = [...db.timelineEntry.iter()]
      .filter((e) => e.incidentId === incId)
      .sort((a, b) => (a.createdAt.microsSinceUnixEpoch > b.createdAt.microsSinceUnixEpoch ? -1 : 1))
      .map((e) => ({ id: String(e.id), actor: e.authorName, action: e.action, timestamp: tsToIso(e.createdAt)!, details: e.details }));

    const tasks: Task[] = [...db.task.iter()]
      .filter((t) => t.incidentId === incId)
      .sort((a, b) => (a.createdAt.microsSinceUnixEpoch > b.createdAt.microsSinceUnixEpoch ? -1 : 1))
      .map((t) => ({
        id: String(t.id),
        title: t.title,
        description: t.description,
        role: t.role as Role,
        assignee: t.assignee,
        done: t.done,
        created_at: tsToIso(t.createdAt)!,
      }));

    const scopeItems: ScopeItem[] = [...db.scopeItem.iter()]
      .filter((s) => s.incidentId === incId)
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map((s) => ({
        id: String(s.id),
        category: s.category,
        status: s.status as ScopeStatus,
        affected_states: [...s.states],
        notes: s.notes,
        updated_at: tsToIso(s.updatedAt)!,
      }));

    const reportTemplates: ReportTemplate[] = [...db.docTemplate.iter()]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((d) => ({ id: d.id, name: d.name, target: d.target as ReportTemplate['target'], content: d.body }));

    const reportDrafts: ReportDraft[] = [...db.incidentDocument.iter()]
      .filter((d) => d.incidentId === incId)
      .map((d) => ({ id: String(d.id), template_id: d.templateId, title: d.title, content: d.body, updated_at: tsToIso(d.updatedAt)! }));

    // Drill Night: the org's newest drill session and everything in it
    const ses = [...db.drillSession.iter()].filter((d) => d.orgId === orgId).sort((a, b) => (a.id < b.id ? 1 : -1))[0];
    const sesId = ses?.id ?? -1n;
    const drill: DrillState = {
      scenarios: [...db.drillScenario.iter()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((d) => ({ id: d.id, name: d.name, kind: d.kind as 'cyber' | 'catastrophe', description: d.description, window_seconds: d.windowSeconds, inject_count: d.injectCount })),
      session: ses
        ? {
            id: String(ses.id),
            join_code: ses.joinCode,
            scenario_id: ses.scenarioId,
            scenario_name: ses.scenarioName,
            host_id: String(ses.hostId),
            host_name: ses.hostName,
            status: ses.status as DrillStatus,
            round_index: ses.roundIndex,
            created_at: tsToIso(ses.createdAt)!,
            started_at: tsToIso(ses.startedAt),
            ended_at: tsToIso(ses.endedAt),
          }
        : null,
      players: [...db.drillPlayer.iter()]
        .filter((p) => p.sessionId === sesId)
        .map((p) => ({ id: String(p.id), member_id: String(p.memberId), name: p.name, role: p.role as Role, score: p.score, correct_count: p.correctCount, joined_at: tsToIso(p.joinedAt)! })),
      rounds: [...db.drillRound.iter()]
        .filter((r) => r.sessionId === sesId)
        .sort((a, b) => a.position - b.position)
        .map((r) => ({
          id: String(r.id),
          position: r.position,
          title: r.title,
          body: r.body,
          question: r.question,
          options: [...r.options],
          points: r.points,
          role: r.role as Role,
          opened_at: tsToIso(r.openedAt)!,
          closes_at: tsToIso(r.closesAt)!,
          closed: r.closed,
          correct_index: r.correctIndex,
          explanation: r.explanation,
        })),
      answers: [...db.drillAnswer.iter()]
        .filter((a) => a.sessionId === sesId)
        .map((a) => ({ id: String(a.id), round_id: String(a.roundId), player_id: String(a.playerId), choice: a.choice, correct: a.correct, points: a.points, answered_at: tsToIso(a.answeredAt)!, revealed: a.revealed })),
    };

    this.slices = {
      drill,
      org: { id: String(orgId ?? ''), name: orgRow?.name ?? 'Organization' },
      members,
      incident: {
        id: inc?.code ?? 'INC-0000',
        status: !inc || inc.status === 'standby' ? 'inactive' : (inc.status as 'active' | 'closed'),
        phase: (inc?.phase ?? 'detection') as IncidentPhase,
        started_at: tsToIso(inc?.startedAt),
        closed_at: tsToIso(inc?.closedAt),
        notes: inc?.notes ?? '',
      },
      messages,
      tasks,
      auditLogs,
      scopeItems,
      reportTemplates,
      reportDrafts,
      activeBroadcast:
        inc && inc.broadcastText
          ? { id: `bcast-${inc.id}`, message: inc.broadcastText, author: inc.broadcastAuthor, timestamp: tsToIso(inc.broadcastAt) ?? new Date().toISOString() }
          : null,
      slowModeSeconds: inc?.slowModeSeconds ?? 0,
    };
    this.emit();
  }

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
    return {
      organization: Number(db.organization.count()),
      member: Number(db.member.count()),
      incident: Number(db.incident.count()),
      message: Number(db.message.count()),
      timeline_entry: Number(db.timelineEntry.count()),
      scope_item: Number(db.scopeItem.count()),
      task: Number(db.task.count()),
      doc_template: Number(db.docTemplate.count()),
      incident_document: Number(db.incidentDocument.count()),
      drill_scenario: Number(db.drillScenario.count()),
      drill_session: Number(db.drillSession.count()),
      drill_player: Number(db.drillPlayer.count()),
      drill_round: Number(db.drillRound.count()),
      drill_answer: Number(db.drillAnswer.count()),
    };
  }
}

export const live = new LiveBridge();

/**
 * Maps the store's local action names to server reducers.
 * Returning null means "keep this action local".
 */
export function toLiveCall(name: string, a: Record<string, unknown>): { reducer: string; args: Record<string, unknown> } | null {
  const days = (iso: unknown) => (typeof iso === 'string' ? Math.max(1, Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000)) : 0);
  switch (name) {
    case 'record_audit_log':
      return { reducer: 'logAction', args: { action: a.action, details: a.details } };
    case 'add_member':
      return { reducer: 'addMember', args: { fullName: a.name, phone: a.phone, orgRole: a.role, guestDays: days(a.expires_at) } };
    case 'update_member_role':
      return { reducer: 'setMemberRole', args: { memberId: BigInt(String(a.memberId)), orgRole: a.newRole } };
    case 'remove_member':
      return { reducer: 'removeMember', args: { memberId: BigInt(String(a.memberId)) } };
    case 'set_incident_status':
      return a.status === 'active'
        ? { reducer: 'activateIncident', args: { name: 'Ransomware incident', severity: 'critical' } }
        : { reducer: 'closeIncident', args: {} };
    case 'set_incident_phase':
      return { reducer: 'setPhase', args: { phase: a.phase } };
    case 'send_message':
      return { reducer: 'sendMessage', args: { channel: a.channel ?? 'warroom', text: a.content } };
    case 'set_broadcast':
      return { reducer: 'setBroadcast', args: { text: a.message } };
    case 'clear_broadcast':
      return { reducer: 'setBroadcast', args: { text: '' } };
    case 'set_slow_mode':
      return { reducer: 'setSlowMode', args: { seconds: a.seconds } };
    case 'create_task':
      return { reducer: 'createTask', args: { title: a.title, description: a.description, role: a.role, assignee: a.assignee } };
    case 'toggle_task':
      return { reducer: 'toggleTask', args: { taskId: BigInt(String(a.taskId)) } };
    case 'add_scope_item':
      return { reducer: 'addScopeItem', args: { category: a.category, status: a.status, states: a.affected_states, notes: a.notes } };
    case 'update_scope_item':
      return { reducer: 'updateScopeStatus', args: { itemId: BigInt(String(a.itemId)), status: a.status, notes: a.notes } };
    case 'save_draft':
      return { reducer: 'saveDocument', args: { templateId: a.templateId, title: a.title, body: a.content } };
    case 'create_drill':
      return { reducer: 'createDrill', args: { scenarioId: a.scenarioId } };
    case 'join_drill':
      return { reducer: 'joinDrill', args: { code: a.code } };
    case 'leave_drill':
      return { reducer: 'leaveDrill', args: { sessionId: BigInt(String(a.sessionId)) } };
    case 'start_drill':
      return { reducer: 'startDrill', args: { sessionId: BigInt(String(a.sessionId)) } };
    case 'answer_round':
      return { reducer: 'answerRound', args: { roundId: BigInt(String(a.roundId)), choice: a.choice } };
    case 'advance_drill':
      return { reducer: 'advanceDrill', args: { sessionId: BigInt(String(a.sessionId)) } };
    case 'end_drill':
      return { reducer: 'endDrill', args: { sessionId: BigInt(String(a.sessionId)) } };
    default:
      return null;
  }
}
