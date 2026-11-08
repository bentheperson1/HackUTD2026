/**
 * Drill Night (Breach Room) - SpacetimeDB module
 * Phase 1: core live war room.
 * Phase 2: multiplayer Drill Night (join code, timed injects, sealed answers, scoring).
 *
 * Rules every reducer follows:
 *   1. Find the caller from ctx.sender (never trust an identity passed as an argument).
 *   2. Check they are on the roster, not expired, and have the right role.
 *   3. Only then change data, and write an audit (timeline) entry for anything important.
 *
 * Nothing can edit or delete a timeline entry. That is the append-only promise.
 */
import { schema, table, t, SenderError, type InferSchema, type ReducerCtx } from 'spacetimedb/server';
import { ScheduleAt, Timestamp } from 'spacetimedb';
import { DRILL_SCENARIOS } from './drillContent';

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

const organization = table(
  { name: 'organization', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    name: t.string(),
    industry: t.string(),
    createdAt: t.timestamp(),
  }
);

/**
 * One row per person on a company's crisis roster.
 * (Named `member` instead of `user` because USER is a reserved word in SQL.)
 * Admins add people by phone before they ever sign in; signing in with that
 * phone links their SpacetimeDB identity to the row.
 */
const member = table(
  { name: 'member', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    identity: t.option(t.identity()),
    phone: t.string().unique(),
    fullName: t.string(),
    orgId: t.u64(),
    orgRole: t.string(), // owner | it_lead | legal | comms | insurer | outside_counsel
    isAdmin: t.bool(),
    drillScore: t.u32(),
    expiresAt: t.option(t.timestamp()), // set for guests (insurer, outside counsel)
    online: t.bool(),
    createdAt: t.timestamp(),
  }
);

/** One row per emergency. The newest row for an org is "the current incident". */
const incident = table(
  { name: 'incident', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    orgId: t.u64(),
    code: t.string(), // INC-0001
    name: t.string(),
    status: t.string(), // standby | active | closed
    phase: t.string(), // detection | containment | eradication | recovery
    severity: t.string(), // critical | high | medium | low
    notes: t.string(),
    startedAt: t.option(t.timestamp()),
    closedAt: t.option(t.timestamp()),
    slowModeSeconds: t.u32(),
    broadcastText: t.string(),
    broadcastAuthor: t.string(),
    broadcastAt: t.option(t.timestamp()),
  }
);

/** War room chat. channel: warroom | admin | general */
const message = table(
  { name: 'message', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    incidentId: t.u64().index('btree'),
    channel: t.string(),
    senderId: t.u64(),
    senderName: t.string(),
    senderRole: t.string(),
    text: t.string(),
    sentAt: t.timestamp(),
    isSystem: t.bool(),
  }
);

/** The permanent record. Append-only: there is no reducer that edits or deletes rows here. */
const timelineEntry = table(
  { name: 'timeline_entry', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    incidentId: t.u64().index('btree'),
    authorId: t.u64(),
    authorName: t.string(),
    action: t.string(),
    details: t.string(),
    createdAt: t.timestamp(),
  }
);

/** One row per type of data that was hit. status: unknown | locked | exfiltrated | restored */
const scopeItem = table(
  { name: 'scope_item', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    incidentId: t.u64().index('btree'),
    category: t.string(),
    status: t.string(),
    states: t.array(t.string()),
    notes: t.string(),
    updatedById: t.u64(),
    updatedAt: t.timestamp(),
  }
);

/** Role-based tasks in the war room. */
const task = table(
  { name: 'task', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    incidentId: t.u64().index('btree'),
    title: t.string(),
    description: t.string(),
    role: t.string(),
    assignee: t.string(),
    done: t.bool(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  }
);

/** Reusable document formats (insurer notice, counsel memo, regulator report). */
const docTemplate = table(
  { name: 'doc_template', public: true },
  {
    id: t.string().primaryKey(),
    name: t.string(),
    target: t.string(), // insurer | lawyer | regulator
    body: t.string(),
  }
);

/** One template written up for one incident. One row per incident + template. */
const incidentDocument = table(
  { name: 'incident_document', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    incidentId: t.u64().index('btree'),
    templateId: t.string(),
    title: t.string(),
    body: t.string(),
    updatedById: t.u64(),
    updatedAt: t.timestamp(),
  }
);

/* ---------------------------- Drill Night ---------------------------- */

/** Scenario library (names only, public). The questions live in drill_inject (private). */
const drillScenario = table(
  { name: 'drill_scenario', public: true },
  {
    id: t.string().primaryKey(),
    name: t.string(),
    kind: t.string(), // cyber | catastrophe
    description: t.string(),
    windowSeconds: t.u32(),
    injectCount: t.u32(),
  }
);

/**
 * PRIVATE: the full inject script including the answer key.
 * Clients never see this table. An inject is copied into drill_round
 * (public, without the answer) only at the moment it goes live.
 */
const drillInject = table(
  { name: 'drill_inject' },
  {
    id: t.u64().primaryKey().autoInc(),
    scenarioId: t.string().index('btree'),
    position: t.u32(),
    title: t.string(),
    body: t.string(),
    question: t.string(),
    options: t.array(t.string()),
    correctIndex: t.u32(),
    explanation: t.string(),
    points: t.u32(),
    role: t.string(),
  }
);

/** One drill game. status: lobby | running | finished | cancelled */
const drillSession = table(
  { name: 'drill_session', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    orgId: t.u64().index('btree'),
    joinCode: t.string().unique(),
    scenarioId: t.string(),
    scenarioName: t.string(),
    hostId: t.u64(),
    hostName: t.string(),
    status: t.string(),
    roundIndex: t.i32(), // -1 in the lobby, then 0, 1, 2...
    createdAt: t.timestamp(),
    startedAt: t.option(t.timestamp()),
    endedAt: t.option(t.timestamp()),
  }
);

/** One row per person in a drill. */
const drillPlayer = table(
  { name: 'drill_player', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    sessionId: t.u64().index('btree'),
    memberId: t.u64(),
    name: t.string(),
    role: t.string(),
    score: t.u32(),
    correctCount: t.u32(),
    joinedAt: t.timestamp(),
  }
);

/** An inject that has gone live. correctIndex is -1 and explanation empty until it closes. */
const drillRound = table(
  { name: 'drill_round', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    sessionId: t.u64().index('btree'),
    position: t.u32(),
    title: t.string(),
    body: t.string(),
    question: t.string(),
    options: t.array(t.string()),
    points: t.u32(),
    role: t.string(),
    openedAt: t.timestamp(),
    closesAt: t.timestamp(),
    closed: t.bool(),
    correctIndex: t.i32(),
    explanation: t.string(),
  }
);

/**
 * Public record that a player locked in an answer. choice stays -1 (sealed)
 * until the round closes, so nobody can copy a teammate.
 */
const drillAnswer = table(
  { name: 'drill_answer', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    sessionId: t.u64().index('btree'),
    roundId: t.u64().index('btree'),
    playerId: t.u64(),
    choice: t.i32(),
    correct: t.bool(),
    points: t.u32(),
    answeredAt: t.timestamp(),
    revealed: t.bool(),
  }
);

/** PRIVATE: the actual sealed choice behind each drill_answer row. Deleted once scored. */
const drillSealed = table(
  { name: 'drill_sealed' },
  {
    answerId: t.u64().primaryKey(),
    choice: t.u32(),
  }
);

/** PRIVATE scheduler: one row per open round, fires drillTick when the round's time is up. */
const drillTickTimer = table(
  { name: 'drill_tick_timer' },
  {
    scheduledId: t.u64().primaryKey().autoInc(),
    scheduledAt: t.scheduleAt(),
    sessionId: t.u64(),
    position: t.u32(),
  }
);

const spacetimedb = schema({
  organization,
  member,
  incident,
  message,
  timelineEntry,
  scopeItem,
  task,
  docTemplate,
  incidentDocument,
  drillScenario,
  drillInject,
  drillSession,
  drillPlayer,
  drillRound,
  drillAnswer,
  drillSealed,
  drillTickTimer,
});
export default spacetimedb;

type Ctx = ReducerCtx<InferSchema<typeof spacetimedb>>;
type MemberRow = ReturnType<Ctx['db']['member']['id']['find']>;

/* ------------------------------------------------------------------ */
/* Constants and helpers (not exported: only reducers are exported)    */
/* ------------------------------------------------------------------ */

const ROLES = ['owner', 'it_lead', 'legal', 'comms', 'insurer', 'outside_counsel'];
const PHASES = ['detection', 'containment', 'eradication', 'recovery'];
const SCOPE_STATUSES = ['unknown', 'locked', 'exfiltrated', 'restored'];
const CHANNELS = ['warroom', 'admin', 'general'];
const GUEST_ROLES = ['insurer', 'outside_counsel'];
const DAY_MICROS = 86_400_000_000n;

const normalizePhone = (phone: string) => phone.replace(/\D/g, '').slice(-10);

/** Who is calling? Throws if they are not on the roster or their guest access has expired. */
function caller(ctx: Ctx): NonNullable<MemberRow> {
  for (const m of ctx.db.member.iter()) {
    if (m.identity && m.identity.equals(ctx.sender)) {
      if (m.expiresAt && m.expiresAt.microsSinceUnixEpoch < ctx.timestamp.microsSinceUnixEpoch) {
        throw new SenderError('Your guest access has expired.');
      }
      return m;
    }
  }
  throw new SenderError('Sign in with a phone number on the crisis roster first.');
}

function requireRole(m: NonNullable<MemberRow>, roles: string[], what: string) {
  if (m.isAdmin || roles.includes(m.orgRole)) return;
  throw new SenderError(`Your role (${m.orgRole}) can't ${what}.`);
}

function requireAdmin(m: NonNullable<MemberRow>, what: string) {
  if (!m.isAdmin) throw new SenderError(`Only an admin can ${what}.`);
}

/** The newest incident for the caller's org. Every war-room action targets this one. */
function currentIncident(ctx: Ctx, orgId: bigint) {
  let latest: ReturnType<Ctx['db']['incident']['id']['find']> = null;
  for (const inc of ctx.db.incident.iter()) {
    if (inc.orgId === orgId && (!latest || inc.id > latest.id)) latest = inc;
  }
  if (!latest) throw new SenderError('No incident exists for this organization.');
  return latest;
}

function log(ctx: Ctx, incidentId: bigint, who: { id: bigint; fullName: string }, action: string, details: string) {
  ctx.db.timelineEntry.insert({
    id: 0n,
    incidentId,
    authorId: who.id,
    authorName: who.fullName,
    action,
    details,
    createdAt: ctx.timestamp,
  });
}

function systemMessage(ctx: Ctx, incidentId: bigint, text: string) {
  ctx.db.message.insert({
    id: 0n,
    incidentId,
    channel: 'warroom',
    senderId: 0n,
    senderName: 'System',
    senderRole: 'it_lead',
    text,
    sentAt: ctx.timestamp,
    isSystem: true,
  });
}

function newStandbyIncident(ctx: Ctx, orgId: bigint) {
  let count = 0;
  for (const inc of ctx.db.incident.iter()) if (inc.orgId === orgId) count++;
  return ctx.db.incident.insert({
    id: 0n,
    orgId,
    code: `INC-${String(count + 1).padStart(4, '0')}`,
    name: 'Standby',
    status: 'standby',
    phase: 'detection',
    severity: 'critical',
    notes: 'No active incident. Ready for activation or drill.',
    startedAt: undefined,
    closedAt: undefined,
    slowModeSeconds: 0,
    broadcastText: '',
    broadcastAuthor: '',
    broadcastAt: undefined,
  });
}

/* ------------------------------------------------------------------ */
/* Lifecycle                                                           */
/* ------------------------------------------------------------------ */

/** Runs once on first publish: seeds a demo company so the app is usable immediately. */
export const init = spacetimedb.init((ctx) => {
  const org = ctx.db.organization.insert({ id: 0n, name: 'Acme Logistics Corp', industry: 'Logistics', createdAt: ctx.timestamp });

  const people: [string, string, string, boolean, number, bigint | null][] = [
    ['Alex Rivera', '5553028841', 'owner', true, 150, null],
    ['Taylor Brooks', '5557714920', 'it_lead', false, 200, null],
    ['Morgan Lee', '5556041290', 'legal', false, 180, null],
    ['Jordan Kim', '5552210087', 'comms', false, 120, null],
    ['Sam Ortiz', '5559194402', 'insurer', false, 0, 7n],
  ];
  for (const [fullName, phone, orgRole, isAdmin, drillScore, guestDays] of people) {
    ctx.db.member.insert({
      id: 0n,
      identity: undefined,
      phone,
      fullName,
      orgId: org.id,
      orgRole,
      isAdmin,
      drillScore,
      expiresAt: guestDays ? new Timestamp(ctx.timestamp.microsSinceUnixEpoch + guestDays * DAY_MICROS) : undefined,
      online: false,
      createdAt: ctx.timestamp,
    });
  }

  const templates: [string, string, string, string][] = [
    [
      'tpl-insurer',
      'Cyber Insurance First Notice of Loss (FNOL)',
      'insurer',
      'TO: Cyber Risk Underwriters\nRE: Incident Notice - Policy #[POLICY_NUMBER]\n\n1. Policyholder Name: Acme Logistics Corp\n2. Date/Time Discovered: [DISCOVERY_TIME]\n3. Incident Type: Ransomware / Data Exfiltration\n4. Preliminary Impact: [IMPACT]\n5. Retained IR Vendor: [VENDOR]\n\nSubmitted by authorized representative.',
    ],
    [
      'tpl-counsel',
      'Outside Counsel Privileged Assessment Memo',
      'lawyer',
      'CONFIDENTIAL ATTORNEY-CLIENT PRIVILEGED / WORK PRODUCT\n\nMEMORANDUM\nTO: Outside Counsel\nFROM: Incident Response Team\nDATE: [CURRENT_DATE]\nSUBJECT: Incident Initial Briefing\n\n- Affected Systems & Scope: [SCOPE_SUMMARY]\n- Forensic Findings: Pending containment.\n- Notification Analysis: Pending counsel review.',
    ],
    [
      'tpl-regulator',
      'State AG Regulatory Notification Report',
      'regulator',
      'FORMAL NOTIFICATION OF SECURITY INCIDENT\nTo: State Attorney General Data Privacy Division\n\nAcme Logistics Corp hereby provides notice of a potential unauthorized disclosure of personal information.\n\nTotal Affected Residents: [COUNT]\nRemediation Steps Taken: [STEPS]\nContact Person: [NAME], Incident Commander.',
    ],
  ];
  for (const [id, name, target, body] of templates) ctx.db.docTemplate.insert({ id, name, target, body });

  const inc = newStandbyIncident(ctx, org.id);
  const system = { id: 0n, fullName: 'System' };
  log(ctx, inc.id, system, 'SYSTEM_INIT', 'Command center environment initialized.');
  systemMessage(ctx, inc.id, 'Out-of-band crisis channel initialized.');

  ctx.db.scopeItem.insert({
    id: 0n,
    incidentId: inc.id,
    category: 'Customer PII (SSN, DOB, Billing)',
    status: 'unknown',
    states: ['TX', 'CA'],
    notes: 'Customer database snapshot suspected touched during lateral movement.',
    updatedById: 0n,
    updatedAt: ctx.timestamp,
  });
  ctx.db.task.insert({
    id: 0n,
    incidentId: inc.id,
    title: 'Confirm offline backups are reachable',
    description: 'Check the backup drive is disconnected from the network and readable.',
    role: 'it_lead',
    assignee: 'Taylor Brooks',
    done: false,
    createdAt: ctx.timestamp,
    updatedAt: ctx.timestamp,
  });

  seedDrillLibrary(ctx);
});

export const onConnect = spacetimedb.clientConnected((ctx) => {
  for (const m of ctx.db.member.iter()) {
    if (m.identity && m.identity.equals(ctx.sender)) ctx.db.member.id.update({ ...m, online: true });
  }
});

export const onDisconnect = spacetimedb.clientDisconnected((ctx) => {
  for (const m of ctx.db.member.iter()) {
    if (m.identity && m.identity.equals(ctx.sender)) ctx.db.member.id.update({ ...m, online: false });
  }
});

/* ------------------------------------------------------------------ */
/* Sign-in                                                             */
/* ------------------------------------------------------------------ */

/**
 * Links the caller's identity to the roster row with this phone number.
 * DEMO NOTE: there is no SMS check yet, so anyone can claim any roster phone.
 * The real version verifies the code with an SMS provider before calling this.
 */
export const registerPhone = spacetimedb.reducer({ phone: t.string() }, (ctx, { phone }) => {
  const wanted = normalizePhone(phone);
  if (wanted.length !== 10) throw new SenderError('Enter a 10-digit phone number.');
  const row = ctx.db.member.phone.find(wanted);
  if (!row) throw new SenderError('That phone number is not on the crisis roster.');
  if (row.expiresAt && row.expiresAt.microsSinceUnixEpoch < ctx.timestamp.microsSinceUnixEpoch) {
    throw new SenderError('Guest access for this number has expired.');
  }
  // One identity = one roster row
  for (const m of ctx.db.member.iter()) {
    if (m.id !== row.id && m.identity && m.identity.equals(ctx.sender)) {
      ctx.db.member.id.update({ ...m, identity: undefined, online: false });
    }
  }
  ctx.db.member.id.update({ ...row, identity: ctx.sender, online: true });
  const inc = currentIncident(ctx, row.orgId);
  log(ctx, inc.id, row, 'SIGN_IN', `${row.fullName} signed in with their personal phone.`);
});

/* ------------------------------------------------------------------ */
/* Roster                                                              */
/* ------------------------------------------------------------------ */

export const addMember = spacetimedb.reducer(
  { fullName: t.string(), phone: t.string(), orgRole: t.string(), guestDays: t.u32() },
  (ctx, { fullName, phone, orgRole, guestDays }) => {
    const me = caller(ctx);
    requireAdmin(me, 'add people');
    if (!fullName.trim()) throw new SenderError('Name is required.');
    if (!ROLES.includes(orgRole)) throw new SenderError('Unknown role.');
    const p = normalizePhone(phone);
    if (p.length !== 10) throw new SenderError('Enter a 10-digit phone number.');
    if (ctx.db.member.phone.find(p)) throw new SenderError('That phone is already on the roster.');
    const isGuest = GUEST_ROLES.includes(orgRole);
    const days = BigInt(isGuest ? Math.max(1, guestDays || 7) : 0);
    ctx.db.member.insert({
      id: 0n,
      identity: undefined,
      phone: p,
      fullName: fullName.trim(),
      orgId: me.orgId,
      orgRole,
      isAdmin: false,
      drillScore: 0,
      expiresAt: isGuest ? new Timestamp(ctx.timestamp.microsSinceUnixEpoch + days * DAY_MICROS) : undefined,
      online: false,
      createdAt: ctx.timestamp,
    });
    log(ctx, currentIncident(ctx, me.orgId).id, me, 'MEMBER_ADDED', `Added ${fullName.trim()} as ${orgRole}${isGuest ? ` (guest, ${days} days)` : ''}.`);
  }
);

export const setMemberRole = spacetimedb.reducer({ memberId: t.u64(), orgRole: t.string() }, (ctx, { memberId, orgRole }) => {
  const me = caller(ctx);
  requireAdmin(me, 'change roles');
  if (!ROLES.includes(orgRole)) throw new SenderError('Unknown role.');
  const m = ctx.db.member.id.find(memberId);
  if (!m || m.orgId !== me.orgId) throw new SenderError('Person not found.');
  ctx.db.member.id.update({ ...m, orgRole });
  log(ctx, currentIncident(ctx, me.orgId).id, me, 'ROLE_CHANGED', `Changed ${m.fullName} from ${m.orgRole} to ${orgRole}.`);
});

export const removeMember = spacetimedb.reducer({ memberId: t.u64() }, (ctx, { memberId }) => {
  const me = caller(ctx);
  requireAdmin(me, 'remove people');
  const m = ctx.db.member.id.find(memberId);
  if (!m || m.orgId !== me.orgId) throw new SenderError('Person not found.');
  if (m.id === me.id) throw new SenderError("You can't remove yourself.");
  ctx.db.member.id.delete(memberId);
  log(ctx, currentIncident(ctx, me.orgId).id, me, 'MEMBER_REMOVED', `Removed ${m.fullName} from the roster.`);
});

/* ------------------------------------------------------------------ */
/* Incident                                                            */
/* ------------------------------------------------------------------ */

export const activateIncident = spacetimedb.reducer({ name: t.string(), severity: t.string() }, (ctx, { name, severity }) => {
  const me = caller(ctx);
  requireRole(me, ['owner', 'it_lead'], 'activate an incident');
  const inc = currentIncident(ctx, me.orgId);
  if (inc.status === 'active') throw new SenderError('An incident is already active.');
  // A closed incident stays as history; start a fresh one
  const target = inc.status === 'closed' ? newStandbyIncident(ctx, me.orgId) : inc;
  ctx.db.incident.id.update({
    ...target,
    name: name.trim() || 'Ransomware incident',
    severity: ['critical', 'high', 'medium', 'low'].includes(severity) ? severity : 'critical',
    status: 'active',
    phase: 'detection',
    startedAt: ctx.timestamp,
    closedAt: undefined,
    notes: '',
  });
  log(ctx, target.id, me, 'INCIDENT_ACTIVATED', `${me.fullName} activated the incident. Roster alerted.`);
  systemMessage(ctx, target.id, `${me.fullName} activated the incident. Move all crisis communication here.`);
});

export const closeIncident = spacetimedb.reducer((ctx) => {
  const me = caller(ctx);
  requireRole(me, ['owner', 'it_lead'], 'close the incident');
  const inc = currentIncident(ctx, me.orgId);
  if (inc.status !== 'active') throw new SenderError('There is no active incident to close.');
  ctx.db.incident.id.update({ ...inc, status: 'closed', closedAt: ctx.timestamp, broadcastText: '', broadcastAuthor: '', broadcastAt: undefined });
  log(ctx, inc.id, me, 'INCIDENT_CLOSED', `${me.fullName} closed the incident.`);
});

export const setPhase = spacetimedb.reducer({ phase: t.string() }, (ctx, { phase }) => {
  const me = caller(ctx);
  requireRole(me, ['owner', 'it_lead'], 'change the phase');
  if (!PHASES.includes(phase)) throw new SenderError('Unknown phase.');
  const inc = currentIncident(ctx, me.orgId);
  if (inc.status !== 'active') throw new SenderError('Activate the incident before changing phase.');
  if (inc.phase === phase) return;
  ctx.db.incident.id.update({ ...inc, phase });
  log(ctx, inc.id, me, 'PHASE_CHANGE', `Phase moved from ${inc.phase} to ${phase}.`);
  systemMessage(ctx, inc.id, `${me.fullName} moved the phase to ${phase}.`);
});

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

export const sendMessage = spacetimedb.reducer({ channel: t.string(), text: t.string() }, (ctx, { channel, text }) => {
  const me = caller(ctx);
  const body = text.trim();
  if (!body) throw new SenderError('Message cannot be empty.');
  if (body.length > 2000) throw new SenderError('Message is too long.');
  if (!CHANNELS.includes(channel)) throw new SenderError('Unknown channel.');
  if (channel === 'admin' && !(me.isAdmin || me.orgRole === 'owner')) throw new SenderError('Only admins can post in the executive room.');
  const inc = currentIncident(ctx, me.orgId);

  // Slow mode, enforced on the server so it can't be skipped
  if (inc.slowModeSeconds > 0 && !me.isAdmin) {
    let last = 0n;
    for (const m of ctx.db.message.incidentId.filter(inc.id)) {
      if (m.senderId === me.id && m.sentAt.microsSinceUnixEpoch > last) last = m.sentAt.microsSinceUnixEpoch;
    }
    const waitUntil = last + BigInt(inc.slowModeSeconds) * 1_000_000n;
    if (waitUntil > ctx.timestamp.microsSinceUnixEpoch) {
      const secs = Number((waitUntil - ctx.timestamp.microsSinceUnixEpoch) / 1_000_000n) + 1;
      throw new SenderError(`Slow mode is on. Wait ${secs}s before sending another message.`);
    }
  }

  ctx.db.message.insert({
    id: 0n,
    incidentId: inc.id,
    channel,
    senderId: me.id,
    senderName: me.fullName,
    senderRole: me.orgRole,
    text: body,
    sentAt: ctx.timestamp,
    isSystem: false,
  });
});

export const setBroadcast = spacetimedb.reducer({ text: t.string() }, (ctx, { text }) => {
  const me = caller(ctx);
  requireRole(me, ['owner'], 'send an all-hands broadcast');
  const inc = currentIncident(ctx, me.orgId);
  const body = text.trim();
  ctx.db.incident.id.update({
    ...inc,
    broadcastText: body,
    broadcastAuthor: body ? me.fullName : '',
    broadcastAt: body ? ctx.timestamp : undefined,
  });
  log(ctx, inc.id, me, body ? 'BROADCAST_SENT' : 'BROADCAST_CLEARED', body || 'Cleared the all-hands broadcast.');
});

export const setSlowMode = spacetimedb.reducer({ seconds: t.u32() }, (ctx, { seconds }) => {
  const me = caller(ctx);
  requireRole(me, ['owner'], 'change slow mode');
  const inc = currentIncident(ctx, me.orgId);
  ctx.db.incident.id.update({ ...inc, slowModeSeconds: Math.min(seconds, 300) });
  log(ctx, inc.id, me, 'SLOW_MODE', seconds ? `Slow mode set to ${seconds}s.` : 'Slow mode turned off.');
});

/* ------------------------------------------------------------------ */
/* Tasks                                                               */
/* ------------------------------------------------------------------ */

export const createTask = spacetimedb.reducer(
  { title: t.string(), description: t.string(), role: t.string(), assignee: t.string() },
  (ctx, { title, description, role, assignee }) => {
    const me = caller(ctx);
    if (!title.trim()) throw new SenderError('Task title is required.');
    if (!ROLES.includes(role)) throw new SenderError('Unknown role.');
    const inc = currentIncident(ctx, me.orgId);
    ctx.db.task.insert({
      id: 0n,
      incidentId: inc.id,
      title: title.trim(),
      description: description.trim(),
      role,
      assignee: assignee.trim(),
      done: false,
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
    });
    log(ctx, inc.id, me, 'TASK_CREATED', `Task created: ${title.trim()} (${assignee.trim() || role}).`);
  }
);

export const toggleTask = spacetimedb.reducer({ taskId: t.u64() }, (ctx, { taskId }) => {
  const me = caller(ctx);
  const tk = ctx.db.task.id.find(taskId);
  if (!tk) throw new SenderError('Task not found.');
  if (!(me.isAdmin || me.orgRole === 'owner' || me.orgRole === tk.role)) {
    throw new SenderError(`Only the ${tk.role} or an admin can update this task.`);
  }
  ctx.db.task.id.update({ ...tk, done: !tk.done, updatedAt: ctx.timestamp });
  log(ctx, tk.incidentId, me, tk.done ? 'TASK_REOPENED' : 'TASK_COMPLETED', `${tk.done ? 'Reopened' : 'Completed'}: ${tk.title}`);
});

/* ------------------------------------------------------------------ */
/* Scope                                                               */
/* ------------------------------------------------------------------ */

const SCOPE_EDITORS = ['owner', 'it_lead', 'legal'];

export const addScopeItem = spacetimedb.reducer(
  { category: t.string(), status: t.string(), states: t.array(t.string()), notes: t.string() },
  (ctx, { category, status, states, notes }) => {
    const me = caller(ctx);
    requireRole(me, SCOPE_EDITORS, 'edit scope');
    if (!category.trim()) throw new SenderError('Describe the data that was affected.');
    if (!SCOPE_STATUSES.includes(status)) throw new SenderError('Unknown status.');
    const cleanStates = [...new Set(states.map((s) => s.trim().toUpperCase()).filter((s) => /^[A-Z]{2}$/.test(s)))];
    const inc = currentIncident(ctx, me.orgId);
    ctx.db.scopeItem.insert({
      id: 0n,
      incidentId: inc.id,
      category: category.trim(),
      status,
      states: cleanStates,
      notes: notes.trim(),
      updatedById: me.id,
      updatedAt: ctx.timestamp,
    });
    log(ctx, inc.id, me, 'SCOPE_ADDED', `Added ${category.trim()} (${status}) for ${cleanStates.join(', ') || 'no states'}.`);
  }
);

export const updateScopeStatus = spacetimedb.reducer(
  { itemId: t.u64(), status: t.string(), notes: t.string() },
  (ctx, { itemId, status, notes }) => {
    const me = caller(ctx);
    requireRole(me, SCOPE_EDITORS, 'edit scope');
    if (!SCOPE_STATUSES.includes(status)) throw new SenderError('Unknown status.');
    const item = ctx.db.scopeItem.id.find(itemId);
    if (!item) throw new SenderError('Scope item not found.');
    const changed = item.status !== status;
    ctx.db.scopeItem.id.update({ ...item, status, notes: notes.trim(), updatedById: me.id, updatedAt: ctx.timestamp });
    if (changed) {
      log(ctx, item.incidentId, me, 'SCOPE_STATUS', `${item.category}: ${item.status} → ${status}.`);
      systemMessage(ctx, item.incidentId, `${me.fullName} changed ${item.category} to ${status}.`);
    }
  }
);

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

export const saveDocument = spacetimedb.reducer(
  { templateId: t.string(), title: t.string(), body: t.string() },
  (ctx, { templateId, title, body }) => {
    const me = caller(ctx);
    requireRole(me, ['owner', 'it_lead', 'legal', 'comms', 'outside_counsel'], 'edit documents');
    if (!ctx.db.docTemplate.id.find(templateId)) throw new SenderError('Template not found.');
    const inc = currentIncident(ctx, me.orgId);
    for (const d of ctx.db.incidentDocument.incidentId.filter(inc.id)) {
      if (d.templateId === templateId) {
        ctx.db.incidentDocument.id.update({ ...d, title, body, updatedById: me.id, updatedAt: ctx.timestamp });
        return;
      }
    }
    ctx.db.incidentDocument.insert({ id: 0n, incidentId: inc.id, templateId, title, body, updatedById: me.id, updatedAt: ctx.timestamp });
    log(ctx, inc.id, me, 'DOCUMENT_STARTED', `Started draft: ${title}`);
  }
);

/* ------------------------------------------------------------------ */
/* Audit log                                                           */
/* ------------------------------------------------------------------ */

/** Adds a timeline entry. Action tags are uppercase words, e.g. PHASE_DOC_CONTAINMENT. */
export const logAction = spacetimedb.reducer({ action: t.string(), details: t.string() }, (ctx, { action, details }) => {
  const me = caller(ctx);
  const tag = action.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 48);
  if (!tag) throw new SenderError('Action is required.');
  if (!details.trim()) throw new SenderError('Details are required.');
  log(ctx, currentIncident(ctx, me.orgId).id, me, tag, details.trim().slice(0, 4000));
});

/* ------------------------------------------------------------------ */
/* Drill Night (Phase 2)                                               */
/*                                                                     */
/* Flow: host opens a lobby -> people join with a 6-letter code ->     */
/* host starts -> each inject is live for N seconds -> a scheduled     */
/* reducer closes it, scores the sealed answers, and opens the next -> */
/* after the last inject, scores are added to each member's drillScore */
/* ------------------------------------------------------------------ */

const DRILL_HOSTS = ['owner', 'it_lead'];
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I mix-ups
const SECOND = 1_000_000n;

type SessionRow = NonNullable<ReturnType<Ctx['db']['drillSession']['id']['find']>>;

/** Loads the scenario library. Runs from init and can be re-run by an admin (idempotent). */
function seedDrillLibrary(ctx: Ctx) {
  for (const sc of DRILL_SCENARIOS) {
    const row = { id: sc.id, name: sc.name, kind: sc.kind, description: sc.description, windowSeconds: sc.windowSeconds, injectCount: sc.injects.length };
    if (ctx.db.drillScenario.id.find(sc.id)) ctx.db.drillScenario.id.update(row);
    else ctx.db.drillScenario.insert(row);
    for (const old of [...ctx.db.drillInject.scenarioId.filter(sc.id)]) ctx.db.drillInject.id.delete(old.id);
    sc.injects.forEach((inj, position) => {
      ctx.db.drillInject.insert({
        id: 0n,
        scenarioId: sc.id,
        position,
        title: inj.title,
        body: inj.body,
        question: inj.question,
        options: inj.options,
        correctIndex: inj.correct,
        explanation: inj.explanation,
        points: inj.points,
        role: inj.role,
      });
    });
  }
}

function openSessionFor(ctx: Ctx, orgId: bigint) {
  for (const s of ctx.db.drillSession.orgId.filter(orgId)) {
    if (s.status === 'lobby' || s.status === 'running') return s;
  }
  return null;
}

function requireSession(ctx: Ctx, sessionId: bigint, orgId: bigint): SessionRow {
  const s = ctx.db.drillSession.id.find(sessionId);
  if (!s || s.orgId !== orgId) throw new SenderError('Drill not found.');
  return s;
}

function requireHost(me: NonNullable<MemberRow>, s: SessionRow) {
  if (!(me.isAdmin || me.id === s.hostId)) throw new SenderError('Only the drill host can do that.');
}

function playerFor(ctx: Ctx, sessionId: bigint, memberId: bigint) {
  for (const p of ctx.db.drillPlayer.sessionId.filter(sessionId)) if (p.memberId === memberId) return p;
  return null;
}

function addPlayer(ctx: Ctx, sessionId: bigint, me: NonNullable<MemberRow>) {
  return (
    playerFor(ctx, sessionId, me.id) ??
    ctx.db.drillPlayer.insert({ id: 0n, sessionId, memberId: me.id, name: me.fullName, role: me.orgRole, score: 0, correctCount: 0, joinedAt: ctx.timestamp })
  );
}

function scenarioInjects(ctx: Ctx, scenarioId: string) {
  return [...ctx.db.drillInject.scenarioId.filter(scenarioId)].sort((a, b) => a.position - b.position);
}

function roundAt(ctx: Ctx, sessionId: bigint, position: number) {
  for (const r of ctx.db.drillRound.sessionId.filter(sessionId)) if (r.position === position) return r;
  return null;
}

/** Opens inject #position as a public round and schedules its close. */
function openRound(ctx: Ctx, s: SessionRow, position: number) {
  const inj = scenarioInjects(ctx, s.scenarioId)[position];
  const sc = ctx.db.drillScenario.id.find(s.scenarioId);
  const windowMicros = BigInt(sc?.windowSeconds ?? 45) * SECOND;
  const closesAt = new Timestamp(ctx.timestamp.microsSinceUnixEpoch + windowMicros);
  ctx.db.drillRound.insert({
    id: 0n,
    sessionId: s.id,
    position,
    title: inj.title,
    body: inj.body,
    question: inj.question,
    options: inj.options,
    points: inj.points,
    role: inj.role,
    openedAt: ctx.timestamp,
    closesAt,
    closed: false,
    correctIndex: -1,
    explanation: '',
  });
  ctx.db.drillTickTimer.insert({ scheduledId: 0n, scheduledAt: ScheduleAt.time(closesAt.microsSinceUnixEpoch), sessionId: s.id, position });
}

/** Closes the live round: unseals every answer, scores it, and reveals the right answer. */
function closeRound(ctx: Ctx, s: SessionRow) {
  if (s.roundIndex < 0) return;
  const round = roundAt(ctx, s.id, s.roundIndex);
  if (!round || round.closed) return;
  const inj = scenarioInjects(ctx, s.scenarioId)[round.position];
  const windowMicros = round.closesAt.microsSinceUnixEpoch - round.openedAt.microsSinceUnixEpoch;

  for (const a of [...ctx.db.drillAnswer.roundId.filter(round.id)]) {
    const sealed = ctx.db.drillSealed.answerId.find(a.id);
    if (!sealed) continue;
    const correct = sealed.choice === inj.correctIndex;
    // Correct answers earn the base points plus up to 50% more for answering fast
    let points = 0;
    if (correct) {
      const left = round.closesAt.microsSinceUnixEpoch - a.answeredAt.microsSinceUnixEpoch;
      const ratio = windowMicros > 0n ? Number(left < 0n ? 0n : left) / Number(windowMicros) : 0;
      points = round.points + Math.floor((round.points / 2) * Math.min(1, ratio));
    }
    ctx.db.drillAnswer.id.update({ ...a, choice: sealed.choice, correct, points, revealed: true });
    ctx.db.drillSealed.answerId.delete(a.id);
    const p = ctx.db.drillPlayer.id.find(a.playerId);
    if (p) ctx.db.drillPlayer.id.update({ ...p, score: p.score + points, correctCount: p.correctCount + (correct ? 1 : 0) });
  }
  ctx.db.drillRound.id.update({ ...round, closed: true, correctIndex: inj.correctIndex, explanation: inj.explanation });
}

/** Closes the current round, then opens the next one or finishes the drill. */
function advance(ctx: Ctx, s: SessionRow) {
  closeRound(ctx, s);
  const next = s.roundIndex + 1;
  const total = scenarioInjects(ctx, s.scenarioId).length;
  if (next < total) {
    const updated = { ...s, roundIndex: next };
    ctx.db.drillSession.id.update(updated);
    openRound(ctx, updated, next);
  } else {
    finish(ctx, { ...s, roundIndex: s.roundIndex });
  }
}

/** Ends the drill and adds everyone's points to their lifetime drill score. */
function finish(ctx: Ctx, s: SessionRow) {
  ctx.db.drillSession.id.update({ ...s, status: 'finished', endedAt: ctx.timestamp });
  const players = [...ctx.db.drillPlayer.sessionId.filter(s.id)].sort((a, b) => b.score - a.score);
  for (const p of players) {
    const m = ctx.db.member.id.find(p.memberId);
    if (m && p.score > 0) ctx.db.member.id.update({ ...m, drillScore: m.drillScore + p.score });
  }
  const top = players[0];
  const team = players.reduce((n, p) => n + p.score, 0);
  log(
    ctx,
    currentIncident(ctx, s.orgId).id,
    { id: s.hostId, fullName: s.hostName },
    'DRILL_FINISHED',
    `${s.scenarioName} drill finished. ${players.length} players, team score ${team}${top ? `, top: ${top.name} (${top.score})` : ''}.`
  );
}

/** Host opens a lobby for a scenario. The host joins automatically. */
export const createDrill = spacetimedb.reducer({ scenarioId: t.string() }, (ctx, { scenarioId }) => {
  const me = caller(ctx);
  requireRole(me, DRILL_HOSTS, 'host a drill');
  const sc = ctx.db.drillScenario.id.find(scenarioId);
  if (!sc) throw new SenderError('Unknown scenario.');
  if (currentIncident(ctx, me.orgId).status === 'active') throw new SenderError("A real incident is active. Drills are paused until it's closed.");
  const open = openSessionFor(ctx, me.orgId);
  if (open) throw new SenderError(`A drill is already open. Join it with code ${open.joinCode}.`);

  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) code += CODE_CHARS[ctx.random.integerInRange(0, CODE_CHARS.length - 1)];
  } while (ctx.db.drillSession.joinCode.find(code));

  const s = ctx.db.drillSession.insert({
    id: 0n,
    orgId: me.orgId,
    joinCode: code,
    scenarioId: sc.id,
    scenarioName: sc.name,
    hostId: me.id,
    hostName: me.fullName,
    status: 'lobby',
    roundIndex: -1,
    createdAt: ctx.timestamp,
    startedAt: undefined,
    endedAt: undefined,
  });
  addPlayer(ctx, s.id, me);
});

/** Join with the 6-letter code. Works in the lobby and mid-drill (late joiners). */
export const joinDrill = spacetimedb.reducer({ code: t.string() }, (ctx, { code }) => {
  const me = caller(ctx);
  const s = ctx.db.drillSession.joinCode.find(code.trim().toUpperCase());
  if (!s || s.orgId !== me.orgId) throw new SenderError('No drill with that code.');
  if (s.status !== 'lobby' && s.status !== 'running') throw new SenderError('That drill has already ended.');
  addPlayer(ctx, s.id, me);
});

export const leaveDrill = spacetimedb.reducer({ sessionId: t.u64() }, (ctx, { sessionId }) => {
  const me = caller(ctx);
  const s = requireSession(ctx, sessionId, me.orgId);
  if (s.status !== 'lobby') throw new SenderError('You can only leave before the drill starts.');
  if (s.hostId === me.id) throw new SenderError('The host can cancel the drill instead.');
  const p = playerFor(ctx, s.id, me.id);
  if (p) ctx.db.drillPlayer.id.delete(p.id);
});

export const startDrill = spacetimedb.reducer({ sessionId: t.u64() }, (ctx, { sessionId }) => {
  const me = caller(ctx);
  const s = requireSession(ctx, sessionId, me.orgId);
  requireHost(me, s);
  if (s.status !== 'lobby') throw new SenderError('This drill has already started.');
  const running = { ...s, status: 'running', roundIndex: 0, startedAt: ctx.timestamp };
  ctx.db.drillSession.id.update(running);
  openRound(ctx, running, 0);
  log(ctx, currentIncident(ctx, s.orgId).id, me, 'DRILL_STARTED', `${s.scenarioName} drill started with ${[...ctx.db.drillPlayer.sessionId.filter(s.id)].length} players.`);
});

/** Lock in an answer. It stays sealed (hidden from everyone) until the round closes. */
export const answerRound = spacetimedb.reducer({ roundId: t.u64(), choice: t.u32() }, (ctx, { roundId, choice }) => {
  const me = caller(ctx);
  const round = ctx.db.drillRound.id.find(roundId);
  if (!round) throw new SenderError('Inject not found.');
  const s = requireSession(ctx, round.sessionId, me.orgId);
  if (s.status !== 'running' || round.closed || round.position !== s.roundIndex) throw new SenderError('This inject is closed.');
  if (ctx.timestamp.microsSinceUnixEpoch > round.closesAt.microsSinceUnixEpoch) throw new SenderError("Time's up for this inject.");
  if (choice >= round.options.length) throw new SenderError('Pick one of the options.');
  const p = playerFor(ctx, s.id, me.id);
  if (!p) throw new SenderError('Join the drill first.');
  for (const a of ctx.db.drillAnswer.roundId.filter(round.id)) {
    if (a.playerId === p.id) throw new SenderError('You already locked in an answer.');
  }
  const a = ctx.db.drillAnswer.insert({
    id: 0n,
    sessionId: s.id,
    roundId: round.id,
    playerId: p.id,
    choice: -1,
    correct: false,
    points: 0,
    answeredAt: ctx.timestamp,
    revealed: false,
  });
  ctx.db.drillSealed.insert({ answerId: a.id, choice });

  // Everyone answered? Don't make the room wait for the timer.
  const players = [...ctx.db.drillPlayer.sessionId.filter(s.id)].length;
  const answers = [...ctx.db.drillAnswer.roundId.filter(round.id)].length;
  if (answers >= players) advance(ctx, s);
});

/** Host skips ahead: closes the current inject now. */
export const advanceDrill = spacetimedb.reducer({ sessionId: t.u64() }, (ctx, { sessionId }) => {
  const me = caller(ctx);
  const s = requireSession(ctx, sessionId, me.orgId);
  requireHost(me, s);
  if (s.status !== 'running') throw new SenderError('The drill is not running.');
  advance(ctx, s);
});

/** Host ends early. A lobby is cancelled; a running drill is scored up to the current inject. */
export const endDrill = spacetimedb.reducer({ sessionId: t.u64() }, (ctx, { sessionId }) => {
  const me = caller(ctx);
  const s = requireSession(ctx, sessionId, me.orgId);
  requireHost(me, s);
  if (s.status === 'lobby') {
    ctx.db.drillSession.id.update({ ...s, status: 'cancelled', endedAt: ctx.timestamp });
    return;
  }
  if (s.status !== 'running') throw new SenderError('This drill has already ended.');
  closeRound(ctx, s);
  finish(ctx, s);
});

/** Admin: reload the scenario library after editing drillContent.ts (no data wipe needed). */
export const reloadDrillLibrary = spacetimedb.reducer((ctx) => {
  const me = caller(ctx);
  requireAdmin(me, 'reload the drill library');
  seedDrillLibrary(ctx);
});

/**
 * Scheduled: fires when a round's timer runs out. Only the database itself may call it.
 * If the host already skipped ahead, the timer is stale and does nothing.
 */
export const drillTick = spacetimedb.reducer({ onSchedule: drillTickTimer }, { timer: drillTickTimer.rowType }, (ctx, { timer }) => {
  if (!ctx.sender.equals(ctx.databaseIdentity)) throw new SenderError('This runs on a timer only.');
  const s = ctx.db.drillSession.id.find(timer.sessionId);
  if (!s || s.status !== 'running' || s.roundIndex !== timer.position) return;
  advance(ctx, s);
});
