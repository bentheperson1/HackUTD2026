import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, LogIn, Play, SkipForward, Square, Users, X } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { store, markDemoHuman } from '../lib/store';
import { drillPoints } from '../lib/live';
import { useAppState, useNow } from '../lib/useAppState';
import type { DrillAnswer, DrillPlayer, DrillQuestion, DrillScenario, DrillSession, Member, Role } from '../lib/types';
import { RoleBadge, ROLE_SHORT } from '../components/RoleBadge';
import { DrillCalendar } from '../components/DrillCalendar';
import { Badge, Button, Card, EmptyState, Label, PageHeader, Stat, StatRow, StatusDot, formatClock, cx } from '../components/ui';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const firstName = (n: string) => n.split(' ')[0] || n;

/**
 * Drill Night, wired to backend/spacetimedb/Drill.cs:
 *   Home    -> the owner opens a lobby; everyone joins with a 4-letter code and a nickname
 *   Lobby   -> players appear as they join; the owner starts
 *   Running -> questions fire on the server's schedule (or "Next question");
 *              some are for one role only; answers score instantly, faster = more points
 *   Results -> the server reveals every right answer + explanation at the end
 */
export const DrillPage: React.FC = () => {
  const { currentUser, mode } = useAuth();
  const drill = useAppState((s) => s.drill);
  const members = useAppState((s) => s.members);
  const session = drill.session;
  const me = drill.players.find((p) => p.person === currentUser.identity) ?? null;

  // Demo mode simulates teammates; never auto-answer for the person at this keyboard
  useEffect(() => {
    markDemoHuman(currentUser.identity);
  }, [currentUser.identity]);

  const open = session && (session.status === 'lobby' || session.status === 'running');

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Prepare"
        title="Drill Night"
        description="A short practice run on the same screens you'd use in a real incident. Questions drop in on a timer, everyone answers on their own phone, and faster right answers score more."
        actions={<span className="text-xs text-fg-subtle">{mode === 'live' ? 'Multiplayer · SpacetimeDB' : 'Demo mode · teammates are simulated'}</span>}
      />

      {open && session.status === 'lobby' && <Lobby session={session} players={drill.players} me={me} currentUser={currentUser} />}
      {open && session.status === 'running' && (
        <Running session={session} players={drill.players} questions={drill.questions} answers={drill.answers} me={me} currentUser={currentUser} />
      )}

      {!open && (
        <>
          {session?.status === 'finished' && <Results session={session} players={drill.players} questions={drill.questions} answers={drill.answers} me={me} />}
          <Home scenarios={drill.scenarios} currentUser={currentUser} />
          <AllTime members={members} />
          <DrillCalendar />
        </>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Join form (used on Home and in the Lobby)                           */
/* ------------------------------------------------------------------ */

const JoinForm: React.FC<{ currentUser: Member; presetCode?: string; compact?: boolean }> = ({ currentUser, presetCode, compact }) => {
  const [code, setCode] = useState(presetCode ?? '');
  const [nick, setNick] = useState(firstName(currentUser.name));
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === 4 && nick.trim()) store.drillJoin(currentUser, code, nick);
      }}
    >
      {!presetCode && (
        <input
          aria-label="Join code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
          placeholder="AB23"
          className="h-14 w-full text-center font-mono text-2xl tracking-[0.5em] uppercase"
          autoComplete="off"
          spellCheck={false}
        />
      )}
      <label className="block">
        <span className="text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase">Nickname on the leaderboard</span>
        <input className="mt-1.5 w-full" value={nick} maxLength={24} onChange={(e) => setNick(e.target.value)} placeholder="Nickname" />
      </label>
      <Button type="submit" variant="drill" size={compact ? 'md' : 'lg'} block={!compact} disabled={code.length !== 4 || !nick.trim()}>
        <LogIn className="h-4 w-4" />
        Join drill
      </Button>
    </form>
  );
};

/* ------------------------------------------------------------------ */
/* Home: host or join                                                  */
/* ------------------------------------------------------------------ */

const Home: React.FC<{ scenarios: DrillScenario[]; currentUser: Member }> = ({ scenarios, currentUser }) => {
  const [picked, setPicked] = useState<string>(scenarios[0]?.id ?? '');
  const host = currentUser.role === 'owner';
  useEffect(() => {
    if (!picked && scenarios[0]) setPicked(scenarios[0].id);
  }, [scenarios, picked]);

  return (
    <Card kind="drill" kindTone="drill" title="Start a drill">
      <div className="grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-4">
          <Label>Join with a code</Label>
          <JoinForm currentUser={currentUser} />
          <p className="text-xs text-fg-subtle">The owner reads the code out or shares their screen.</p>
        </div>

        <div className="space-y-3 lg:col-span-8">
          <div className="flex items-baseline justify-between">
            <Label>Host a drill</Label>
            {!host && <span className="text-xs text-fg-subtle">Only the owner can host</span>}
          </div>
          <div role="radiogroup" aria-label="Scenario" className="divide-y divide-line border-y border-line">
            {scenarios.map((sc) => (
              <button
                key={sc.id}
                type="button"
                role="radio"
                aria-checked={picked === sc.id}
                disabled={!host}
                onClick={() => setPicked(sc.id)}
                className={cx(
                  'flex w-full items-start gap-4 px-1 py-3 text-left transition-colors disabled:cursor-default',
                  picked === sc.id && host ? 'shadow-[inset_3px_0_0_var(--color-drill)]' : host && 'hover:bg-surface'
                )}
              >
                <span className={cx('mt-1.5 h-2.5 w-2.5 shrink-0 border', picked === sc.id && host ? 'border-drill bg-drill' : 'border-line-strong')} aria-hidden="true" />
                <span className="min-w-0 flex-1 pl-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-semibold text-fg">{sc.name}</span>
                    <Badge tone="accent">{sc.kind.replace(/_/g, ' ')}</Badge>
                  </span>
                  {sc.description && <span className="mt-0.5 block text-sm text-fg-muted">{sc.description}</span>}
                </span>
                <span className="shrink-0 pt-0.5 text-right font-mono text-xs text-fg-subtle">
                  {sc.question_count ? `${sc.question_count} questions` : 'questions on a timer'}
                  <br />~{sc.minutes} min
                </span>
              </button>
            ))}
            {scenarios.length === 0 && <EmptyState title="No scenarios loaded" description="The backend seeds one when it's published." />}
          </div>
          {host && (
            <Button variant="drill" size="lg" onClick={() => store.drillCreate(currentUser, picked)} disabled={!picked}>
              <Users className="h-4 w-4" />
              Open lobby
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* Lobby                                                               */
/* ------------------------------------------------------------------ */

const Lobby: React.FC<{ session: DrillSession; players: DrillPlayer[]; me: DrillPlayer | null; currentUser: Member }> = ({ session, players, me, currentUser }) => {
  const isOwner = currentUser.role === 'owner';
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(session.join_code).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => undefined
    );
  };

  return (
    <Card kind="drill" kindTone="drill" title={`Lobby: ${session.scenario_name}`} description={session.incident_id}>
      <div className="grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Label>Join code</Label>
          <div className="mt-2 flex items-center gap-3">
            <span className="font-mono text-[64px] leading-none font-medium tracking-[0.18em] text-drill" aria-live="polite">
              {session.join_code}
            </span>
            <button type="button" onClick={copy} className="text-fg-subtle hover:text-fg" aria-label="Copy join code">
              {copied ? <Check className="h-5 w-5 text-accent" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
          <p className="mt-3 max-w-sm text-sm text-fg-muted">Everyone opens Fifth Edge on their own phone and enters this code. People can still join after it starts.</p>

          <div className="mt-6 space-y-4">
            {!me && (
              <div className="max-w-xs">
                <JoinForm currentUser={currentUser} presetCode={session.join_code} compact />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {isOwner ? (
                <>
                  <Button variant="drill" size="lg" onClick={() => store.drillStart(currentUser)} disabled={players.length === 0}>
                    <Play className="h-4 w-4" />
                    Start drill
                  </Button>
                  <Button variant="ghost" size="lg" onClick={() => store.drillEnd(currentUser)}>
                    Cancel
                  </Button>
                </>
              ) : (
                me && (
                  <span className="flex h-11 items-center gap-2 text-sm text-fg-muted">
                    <StatusDot tone="drill" pulse /> Waiting for the owner to start
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="flex items-baseline justify-between">
            <Label>In the room</Label>
            <span className="font-mono text-xs text-fg-subtle">{players.length} joined</span>
          </div>
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {players.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-1 py-2.5">
                <span className="h-2 w-2 bg-drill" aria-hidden="true" />
                <span className="flex-1 truncate text-sm text-fg">
                  {p.name}
                  {p.person === currentUser.identity && <span className="text-fg-subtle"> (you)</span>}
                </span>
                <RoleBadge role={p.role} />
              </li>
            ))}
            {players.length === 0 && <li className="px-1 py-3 text-sm text-fg-subtle">Nobody yet.</li>}
          </ul>
        </div>
      </div>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* Running                                                             */
/* ------------------------------------------------------------------ */

const roleLabel = (r: Role | null) => (r ? ROLE_SHORT[r] ?? r : 'Everyone');

const Running: React.FC<{
  session: DrillSession;
  players: DrillPlayer[];
  questions: DrillQuestion[];
  answers: DrillAnswer[];
  me: DrillPlayer | null;
  currentUser: Member;
}> = ({ session, players, questions, answers, me, currentUser }) => {
  const now = useNow(250);
  const isOwner = currentUser.role === 'owner';
  const q = questions.find((x) => x.id === session.current_question_id) ?? null;
  const total = useAppState((s) => s.drill.scenarios.find((x) => x.id === session.scenario_id)?.question_count ?? null);

  const ownerControls = isOwner && (
    <div className="flex gap-1">
      <Button size="sm" variant="secondary" onClick={() => store.drillNext(currentUser)} title="Fire the next question now">
        <SkipForward className="h-3.5 w-3.5" />
        Next question
      </Button>
      <Button size="sm" variant="ghost" onClick={() => store.drillEnd(currentUser)}>
        <Square className="h-3.5 w-3.5" />
        End
      </Button>
    </div>
  );

  if (!q) {
    return (
      <Card kind="drill" kindTone="drill" title="First question incoming" description={session.scenario_name} actions={ownerControls}>
        <p className="flex items-center gap-2 text-sm text-fg-muted">
          <StatusDot tone="drill" pulse /> The drill has started. The first question drops in a few seconds.
        </p>
        {!me && (
          <div className="mt-5 max-w-xs">
            <JoinForm currentUser={currentUser} presetCode={session.join_code} compact />
          </div>
        )}
      </Card>
    );
  }

  const open = Math.max(0, Math.floor((now - Date.parse(q.fired_at)) / 1000));
  const qAnswers = answers.filter((a) => a.question_id === q.id);
  const eligible = players.filter((p) => !q.for_role || p.role === q.for_role);
  const mine = me ? qAnswers.find((a) => a.person === me.person) : undefined;
  const canAnswer = !!me && !mine && (!q.for_role || q.for_role === me.role);
  const potential = drillPoints(100, now - Date.parse(q.fired_at));
  const myAnswers = me ? answers.filter((a) => a.person === me.person) : [];

  return (
    <>
      <StatRow>
        <Stat label="Question" value={total ? `${q.position + 1}/${total}` : q.position + 1} tone="drill" />
        <Stat label="Open for" value={formatClock(open)} mono hint={canAnswer ? `worth ${potential} if right` : undefined} />
        <Stat label="Answered" value={`${qAnswers.length}/${eligible.length}`} hint={q.for_role ? `${roleLabel(q.for_role)} only` : 'everyone'} />
        <Stat label="Your score" value={me?.score ?? '—'} tone="drill" hint={me ? `${myAnswers.filter((a) => a.correct).length} right so far` : 'not playing'} />
      </StatRow>

      <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12">
        <Card kind="drill" kindTone="drill" title={`For: ${roleLabel(q.for_role)}`} description="100 pts, full marks inside 5 s" className="lg:col-span-8" actions={ownerControls}>
          <h3 className="font-display text-[26px] leading-tight font-bold text-fg uppercase">{q.text}</h3>

          <div className="mt-5 grid grid-cols-1 gap-2" role="group" aria-label="Answers">
            {q.options.map((opt, i) => {
              const chosen = mine?.choice === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => canAnswer && store.drillAnswer(currentUser, q.id, i)}
                  disabled={!canAnswer}
                  aria-pressed={chosen}
                  className={cx(
                    'flex items-start gap-3 border px-4 py-3 text-left text-[15px] transition-colors',
                    chosen ? (mine?.correct ? 'border-accent bg-accent-soft' : 'border-breach bg-breach-soft') : 'border-line-strong',
                    canAnswer ? 'hover:border-drill hover:bg-surface' : 'cursor-default',
                    mine && !chosen && 'opacity-50'
                  )}
                >
                  <span className={cx('w-5 shrink-0 font-mono text-sm', chosen ? 'text-fg' : 'text-fg-subtle')}>{LETTERS[i]}</span>
                  <span className="flex-1 text-fg">{opt}</span>
                </button>
              );
            })}
          </div>

          <p className="mt-4 min-h-5 text-sm text-fg-muted" aria-live="polite">
            {!me ? (
              'Join the drill to answer.'
            ) : mine ? (
              mine.correct ? (
                <span className="text-accent">Right. +{drillPoints(100, mine.answered_ms)} points. Why it's right shows in the debrief.</span>
              ) : (
                <span className="text-breach-text">Not quite. The right answer and the reason show in the debrief at the end.</span>
              )
            ) : !canAnswer ? (
              `This one is for ${roleLabel(q.for_role)}. Watch how they call it.`
            ) : (
              'Pick one. Full points inside 5 seconds, then it slides to half by 30 seconds.'
            )}
          </p>
          {!me && (
            <div className="mt-4 max-w-xs">
              <JoinForm currentUser={currentUser} presetCode={session.join_code} compact />
            </div>
          )}
        </Card>

        <Card kind="chart" kindTone="drill" title="Leaderboard" className="lg:col-span-4" padded={false}>
          <Leaderboard players={players} meId={me?.id} answered={new Set(qAnswers.map((a) => a.person))} />
        </Card>
      </div>

      {questions.length > 1 && (
        <Card kind="timeline" kindTone="drill" title="Earlier questions" description="answers are revealed when the drill ends">
          <ol className="divide-y divide-line">
            {questions
              .filter((x) => x.id !== q.id)
              .reverse()
              .map((x) => {
                const a = me ? answers.find((y) => y.question_id === x.id && y.person === me.person) : undefined;
                return (
                  <li key={x.id} className="flex items-baseline gap-3 py-2.5 text-sm">
                    <span className="font-mono text-xs text-drill">#{x.position + 1}</span>
                    <span className="flex-1 text-fg">{x.text}</span>
                    <span className={cx('text-xs', a?.correct ? 'text-accent' : 'text-fg-subtle')}>{a ? (a.correct ? 'You got it' : 'Missed') : '—'}</span>
                  </li>
                );
              })}
          </ol>
        </Card>
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

const Results: React.FC<{ session: DrillSession; players: DrillPlayer[]; questions: DrillQuestion[]; answers: DrillAnswer[]; me: DrillPlayer | null }> = ({
  session,
  players,
  questions,
  answers,
  me,
}) => {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const team = players.reduce((n, p) => n + p.score, 0);
  const accuracy = answers.length ? Math.round((answers.filter((a) => a.correct).length / answers.length) * 100) : 0;

  return (
    <>
      <Card kind="metric" kindTone="drill" title={`Results: ${session.scenario_name}`} description={session.incident_id}>
        <StatRow>
          <Stat label="Top player" value={ranked[0]?.name ?? '—'} tone="drill" hint={ranked[0] ? `${ranked[0].score} pts` : undefined} />
          <Stat label="Team score" value={team} />
          <Stat label="Accuracy" value={`${accuracy}%`} hint={`${answers.length} answers`} />
          <Stat label="Your score" value={me?.score ?? '—'} tone="drill" />
        </StatRow>
        <p className="mt-4 text-sm text-fg-muted">The run is recorded in the drill's audit log, and points count toward the all-time standings.</p>
      </Card>

      <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12">
        <Card kind="chart" kindTone="drill" title="Final standings" className="lg:col-span-4" padded={false}>
          <Leaderboard players={players} meId={me?.id} />
        </Card>
        <Card kind="timeline" kindTone="drill" title="Debrief" description="What the right call was, and why" className="lg:col-span-8">
          <ol className="divide-y divide-line">
            {questions.map((q) => {
              const qa = answers.filter((a) => a.question_id === q.id);
              const mine = me ? qa.find((a) => a.person === me.person) : undefined;
              return (
                <li key={q.id} className="py-4 first:pt-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-mono text-xs text-drill">#{q.position + 1}</span>
                    <span className="text-[15px] font-semibold text-fg">{q.text}</span>
                    <span className="ml-auto font-mono text-xs text-fg-subtle">
                      {roleLabel(q.for_role)} · {qa.filter((a) => a.correct).length}/{qa.length} right
                    </span>
                  </div>
                  {q.correct_index !== null && (
                    <p className="mt-1.5 text-sm text-fg">
                      <span className="font-mono text-accent">{LETTERS[q.correct_index]}</span> {q.options[q.correct_index]}
                    </p>
                  )}
                  {q.explanation && <p className="mt-1 text-sm text-fg-muted">{q.explanation}</p>}
                  {me && (
                    <p className={cx('mt-2 flex items-center gap-1.5 text-xs', mine?.correct ? 'text-accent' : 'text-fg-subtle')}>
                      {mine ? (
                        mine.correct ? (
                          <>
                            <Check className="h-3.5 w-3.5" /> You picked {LETTERS[mine.choice]} · +{drillPoints(100, mine.answered_ms)}
                          </>
                        ) : (
                          <>
                            <X className="h-3.5 w-3.5 text-breach-text" /> You picked {LETTERS[mine.choice]}
                          </>
                        )
                      ) : q.for_role && q.for_role !== me.role ? (
                        `For ${roleLabel(q.for_role)}`
                      ) : (
                        'You did not answer'
                      )}
                    </p>
                  )}
                </li>
              );
            })}
            {questions.length === 0 && <li className="py-3 text-sm text-fg-subtle">The drill ended before any questions fired.</li>}
          </ol>
        </Card>
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

const Leaderboard: React.FC<{ players: DrillPlayer[]; meId?: string; answered?: Set<string> }> = ({ players, meId, answered }) => {
  const ranked = [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const top = Math.max(1, ranked[0]?.score ?? 1);
  return (
    <ol className="divide-y divide-line border-b border-line">
      {ranked.map((p, i) => (
        <li key={p.id} className={cx('flex items-center gap-3 py-2.5', p.id === meId && 'pl-2 shadow-[inset_3px_0_0_var(--color-drill)]')}>
          <span className={cx('w-5 font-mono text-sm', i === 0 && p.score > 0 ? 'font-semibold text-drill' : 'text-fg-subtle')}>{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm text-fg">{p.name}</span>
              <span className="text-xs text-fg-subtle">{ROLE_SHORT[p.role] ?? p.role}</span>
              {answered?.has(p.person) && <Check className="h-3.5 w-3.5 text-drill" aria-label="answered" />}
            </div>
            <div className="mt-1.5 h-1 bg-surface-3">
              <div className="h-full bg-drill transition-[width] duration-500" style={{ width: `${(p.score / top) * 100}%` }} />
            </div>
          </div>
          <span className="w-12 text-right font-mono text-sm font-semibold text-fg tabular-nums">{p.score}</span>
        </li>
      ))}
      {ranked.length === 0 && <li className="py-3 text-sm text-fg-subtle">No players.</li>}
    </ol>
  );
};

const AllTime: React.FC<{ members: Member[] }> = ({ members }) => {
  const ranked = useMemo(() => [...members].filter((m) => !m.grant_id).sort((a, b) => (b.drill_score ?? 0) - (a.drill_score ?? 0)), [members]);
  const top = Math.max(1, ranked[0]?.drill_score ?? 1);
  return (
    <Card kind="people" kindTone="drill" title="All-time standings" description="Points from every finished drill">
      <ol className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
        {ranked.map((m, i) => (
          <li key={m.id} className="flex items-center gap-3 border-b border-line py-2.5">
            <span className={cx('w-5 font-mono text-sm', i === 0 ? 'font-semibold text-drill' : 'text-fg-subtle')}>{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm text-fg">{m.name}</span>
                <RoleBadge role={m.role} />
              </span>
              <span className="mt-1.5 block h-1 bg-surface-3">
                <span className="block h-full bg-drill" style={{ width: `${((m.drill_score ?? 0) / top) * 100}%` }} />
              </span>
            </span>
            <span className="w-14 text-right font-mono text-sm font-semibold text-fg tabular-nums">{m.drill_score ?? 0}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
};
