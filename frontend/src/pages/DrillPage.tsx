import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, LogIn, Play, SkipForward, Square, Users, X } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { store, markDemoHuman } from '../lib/store';
import { useAppState, useNow } from '../lib/useAppState';
import type { DrillAnswer, DrillPlayer, DrillRound, DrillScenario, DrillSession, Member } from '../lib/types';
import { RoleBadge } from '../components/RoleBadge';
import { DrillCalendar } from '../components/DrillCalendar';
import { Badge, Button, Card, EmptyState, Label, PageHeader, Stat, StatRow, StatusDot, formatClock, cx } from '../components/ui';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const canHost = (m: Member) => m.role === 'owner' || m.role === 'it_lead';

/**
 * Drill Night: a short multiplayer practice run.
 *   Home    -> pick a scenario and open a lobby, or join with a code
 *   Lobby   -> the join code is on screen, people appear as they join
 *   Running -> one inject at a time on a timer; answers stay sealed until it closes
 *   Results -> leaderboard + debrief; points go to everyone's lifetime drill score
 */
export const DrillPage: React.FC = () => {
  const { currentUser, mode } = useAuth();
  const drill = useAppState((s) => s.drill);
  const members = useAppState((s) => s.members);
  const session = drill.session;
  const me = drill.players.find((p) => p.member_id === currentUser.id) ?? null;

  // Demo mode simulates teammates; never auto-answer for the person at this keyboard
  useEffect(() => {
    markDemoHuman(currentUser.id);
  }, [currentUser.id]);

  const open = session && (session.status === 'lobby' || session.status === 'running');

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Prepare"
        title="Drill Night"
        description="A 5-minute practice run on the same screens you'd use in a real incident. Injects drop in on a timer, everyone answers on their own phone, and answers stay sealed until time is up."
        actions={
          <span className="text-xs text-fg-subtle">
            {mode === 'live' ? 'Multiplayer · SpacetimeDB' : 'Demo mode · teammates are simulated'}
          </span>
        }
      />

      {open && session.status === 'lobby' && <Lobby session={session} players={drill.players} me={me} currentUser={currentUser} />}
      {open && session.status === 'running' && (
        <Running session={session} players={drill.players} rounds={drill.rounds} answers={drill.answers} me={me} currentUser={currentUser} />
      )}

      {!open && (
        <>
          {session?.status === 'finished' && <Results session={session} players={drill.players} rounds={drill.rounds} answers={drill.answers} me={me} />}
          <Home scenarios={drill.scenarios} currentUser={currentUser} />
          <AllTime members={members} />
          <DrillCalendar />
        </>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Home: host or join                                                  */
/* ------------------------------------------------------------------ */

const Home: React.FC<{ scenarios: DrillScenario[]; currentUser: Member }> = ({ scenarios, currentUser }) => {
  const [code, setCode] = useState('');
  const [picked, setPicked] = useState<string>(scenarios[0]?.id ?? '');
  const [localError, setLocalError] = useState('');
  const host = canHost(currentUser);

  const run = (fn: () => { success: boolean; error?: string }) => {
    setLocalError('');
    const res = fn();
    if (!res.success) setLocalError(res.error ?? 'Something went wrong.');
  };

  return (
    <Card kind="drill" kindTone="drill" title="Start a drill">
      {localError && <p className="mb-4 border-l-2 border-breach pl-3 text-sm text-breach-text">{localError}</p>}
      <div className="grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-12">
        {/* Join */}
        <form
          className="space-y-3 lg:col-span-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim().length === 6) run(() => store.drillJoin(currentUser, code));
          }}
        >
          <Label>Join with a code</Label>
          <input
            aria-label="Join code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="ABC234"
            className="h-14 text-center font-mono text-2xl tracking-[0.4em] uppercase"
            autoComplete="off"
            spellCheck={false}
          />
          <Button type="submit" variant="drill" size="lg" block disabled={code.length !== 6}>
            <LogIn className="h-4 w-4" />
            Join drill
          </Button>
          <p className="text-xs text-fg-subtle">The host reads the code out or shares their screen.</p>
        </form>

        {/* Host */}
        <div className="space-y-3 lg:col-span-8">
          <div className="flex items-baseline justify-between">
            <Label>Host a drill</Label>
            {!host && <span className="text-xs text-fg-subtle">Owners and IT leads can host</span>}
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
                    <Badge tone={sc.kind === 'cyber' ? 'accent' : 'drill'}>{sc.kind === 'cyber' ? 'Cyber' : 'Catastrophe'}</Badge>
                  </span>
                  <span className="mt-0.5 block text-sm text-fg-muted">{sc.description}</span>
                </span>
                <span className="shrink-0 pt-0.5 text-right font-mono text-xs text-fg-subtle">
                  {sc.inject_count} injects
                  <br />
                  {sc.window_seconds}s each
                </span>
              </button>
            ))}
            {scenarios.length === 0 && <EmptyState title="No scenarios loaded" description="Republish the module so the scenario library is seeded." />}
          </div>
          {host && (
            <Button variant="drill" size="lg" onClick={() => run(() => store.drillCreate(currentUser, picked))} disabled={!picked}>
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
  const isHost = session.host_id === currentUser.id || currentUser.role === 'owner';
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
    <Card kind="drill" kindTone="drill" title={`Lobby: ${session.scenario_name}`} description={`Hosted by ${session.host_name}`}>
      <div className="grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Label>Join code</Label>
          <div className="mt-2 flex items-center gap-3">
            <span className="font-mono text-[56px] leading-none font-medium tracking-[0.12em] text-drill" aria-live="polite">
              {session.join_code}
            </span>
            <button type="button" onClick={copy} className="text-fg-subtle hover:text-fg" aria-label="Copy join code">
              {copied ? <Check className="h-5 w-5 text-accent" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
          <p className="mt-3 max-w-sm text-sm text-fg-muted">Everyone opens Drill Night on their own phone and enters this code. People can still join after it starts.</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {isHost ? (
              <>
                <Button variant="drill" size="lg" onClick={() => store.drillStart(currentUser)} disabled={players.length === 0}>
                  <Play className="h-4 w-4" />
                  Start drill
                </Button>
                <Button variant="ghost" size="lg" onClick={() => store.drillEnd(currentUser)}>
                  Cancel
                </Button>
              </>
            ) : me ? (
              <>
                <span className="flex h-11 items-center gap-2 text-sm text-fg-muted">
                  <StatusDot tone="drill" pulse /> Waiting for {session.host_name} to start
                </span>
                <Button variant="ghost" size="lg" onClick={() => store.drillLeave(currentUser)}>
                  Leave
                </Button>
              </>
            ) : (
              <Button variant="drill" size="lg" onClick={() => store.drillJoin(currentUser, session.join_code)}>
                <LogIn className="h-4 w-4" />
                Join this drill
              </Button>
            )}
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
                  {p.member_id === currentUser.id && <span className="text-fg-subtle"> (you)</span>}
                  {p.member_id === session.host_id && <span className="text-fg-subtle"> · host</span>}
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

const Running: React.FC<{
  session: DrillSession;
  players: DrillPlayer[];
  rounds: DrillRound[];
  answers: DrillAnswer[];
  me: DrillPlayer | null;
  currentUser: Member;
}> = ({ session, players, rounds, answers, me, currentUser }) => {
  const now = useNow(250);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const isHost = session.host_id === currentUser.id || currentUser.role === 'owner';
  const round = rounds.find((r) => r.position === session.round_index);
  const past = rounds.filter((r) => r.closed).sort((a, b) => b.position - a.position);
  const total = useAppState((s) => s.drill.scenarios.find((x) => x.id === session.scenario_id)?.inject_count ?? rounds.length);

  if (!round) return null;

  const left = Math.max(0, Math.ceil((Date.parse(round.closes_at) - now) / 1000));
  const roundAnswers = answers.filter((a) => a.round_id === round.id);
  const myAnswer = me ? roundAnswers.find((a) => a.player_id === me.id) : undefined;
  const myPick = picks[round.id] ?? (myAnswer && myAnswer.choice >= 0 ? myAnswer.choice : undefined);
  const lockedIn = !!myAnswer;

  const answer = (choice: number) => {
    if (!me || lockedIn || left === 0) return;
    setPicks((p) => ({ ...p, [round.id]: choice }));
    store.drillAnswer(currentUser, round.id, choice);
  };

  return (
    <>
      <StatRow>
        <Stat label="Inject" value={`${round.position + 1}/${total}`} tone="drill" />
        <Stat label="Time left" value={formatClock(left)} tone={left <= 10 ? 'breach' : 'neutral'} mono />
        <Stat label="Locked in" value={`${roundAnswers.length}/${players.length}`} hint="answers stay sealed until time is up" />
        <Stat label="Your score" value={me?.score ?? '—'} tone="drill" hint={me ? `${me.correct_count} correct` : 'not playing'} />
      </StatRow>

      <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12">
        <Card
          kind="drill"
          kindTone="drill"
          title={round.title}
          description={`Lead: ${round.role.replace('_', ' ')} · ${round.points} pts + speed bonus`}
          className="lg:col-span-8"
          actions={
            isHost && (
              <div className="flex gap-1">
                <Button size="sm" variant="secondary" onClick={() => store.drillAdvance(currentUser)} title="Close this inject now and reveal the answer">
                  <SkipForward className="h-3.5 w-3.5" />
                  Close now
                </Button>
                <Button size="sm" variant="ghost" onClick={() => store.drillEnd(currentUser)}>
                  <Square className="h-3.5 w-3.5" />
                  End
                </Button>
              </div>
            )
          }
        >
          {/* Timer bar */}
          <div className="mb-5 h-1 bg-surface-3" aria-hidden="true">
            <div
              className={cx('h-full transition-[width] duration-200', left <= 10 ? 'bg-breach' : 'bg-drill')}
              style={{ width: `${Math.min(100, (left / Math.max(1, (Date.parse(round.closes_at) - Date.parse(round.opened_at)) / 1000)) * 100)}%` }}
            />
          </div>
          <p className="text-[15px] leading-relaxed text-fg">{round.body}</p>
          <h3 className="mt-5 font-display text-[22px] leading-tight font-bold text-fg uppercase">{round.question}</h3>

          <div className="mt-4 grid grid-cols-1 gap-2" role="group" aria-label="Answers">
            {round.options.map((opt, i) => {
              const chosen = myPick === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => answer(i)}
                  disabled={!me || lockedIn || left === 0}
                  aria-pressed={chosen}
                  className={cx(
                    'flex items-start gap-3 border px-4 py-3 text-left text-[15px] transition-colors',
                    chosen ? 'border-drill bg-drill-soft text-fg' : 'border-line-strong text-fg',
                    !lockedIn && me && left > 0 ? 'hover:border-drill hover:bg-surface' : 'cursor-default',
                    lockedIn && !chosen && 'opacity-50'
                  )}
                >
                  <span className={cx('w-5 shrink-0 font-mono text-sm', chosen ? 'text-drill' : 'text-fg-subtle')}>{LETTERS[i]}</span>
                  <span className="flex-1">{opt}</span>
                </button>
              );
            })}
          </div>

          <p className="mt-4 min-h-5 text-sm text-fg-muted" aria-live="polite">
            {!me ? (
              <button type="button" className="font-semibold text-drill hover:underline" onClick={() => store.drillJoin(currentUser, session.join_code)}>
                Join this drill to answer →
              </button>
            ) : lockedIn ? (
              <>
                Locked in{myPick !== undefined ? `: ${LETTERS[myPick]}` : ''}. The answer shows when the timer ends or everyone has answered.
              </>
            ) : left === 0 ? (
              "Time's up. Revealing…"
            ) : (
              'Pick one. Faster correct answers earn up to 50% more.'
            )}
          </p>
        </Card>

        <Card kind="chart" kindTone="drill" title="Leaderboard" className="lg:col-span-4" padded={false}>
          <Leaderboard players={players} meId={me?.id} answeredIds={new Set(roundAnswers.map((a) => a.player_id))} />
        </Card>
      </div>

      {past.length > 0 && (
        <Card kind="timeline" kindTone="drill" title="Revealed" description={`${past.length} closed`}>
          <Debrief rounds={past} answers={answers} players={players} me={me} />
        </Card>
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

const Results: React.FC<{ session: DrillSession; players: DrillPlayer[]; rounds: DrillRound[]; answers: DrillAnswer[]; me: DrillPlayer | null }> = ({
  session,
  players,
  rounds,
  answers,
  me,
}) => {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const team = players.reduce((n, p) => n + p.score, 0);
  const revealed = answers.filter((a) => a.revealed);
  const accuracy = revealed.length ? Math.round((revealed.filter((a) => a.correct).length / revealed.length) * 100) : 0;
  const mins = session.started_at && session.ended_at ? Math.max(1, Math.round((Date.parse(session.ended_at) - Date.parse(session.started_at)) / 60000)) : null;
  const closed = rounds.filter((r) => r.closed).sort((a, b) => a.position - b.position);

  return (
    <>
      <Card kind="metric" kindTone="drill" title={`Results: ${session.scenario_name}`} description={session.ended_at ? new Date(session.ended_at).toLocaleString() : undefined}>
        <StatRow>
          <Stat label="Top player" value={ranked[0]?.name.split(' ')[0] ?? '—'} tone="drill" hint={ranked[0] ? `${ranked[0].score} pts` : undefined} />
          <Stat label="Team score" value={team} />
          <Stat label="Accuracy" value={`${accuracy}%`} hint={`${revealed.length} answers`} />
          <Stat label="Your score" value={me?.score ?? '—'} tone="drill" hint={mins ? `${mins} min drill` : undefined} />
        </StatRow>
        <p className="mt-4 text-sm text-fg-muted">Points were added to everyone's all-time drill score. The run is recorded in the audit log.</p>
      </Card>

      <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12">
        <Card kind="chart" kindTone="drill" title="Final standings" className="lg:col-span-4" padded={false}>
          <Leaderboard players={players} meId={me?.id} />
        </Card>
        <Card kind="timeline" kindTone="drill" title="Debrief" description="What the right call was, and why" className="lg:col-span-8">
          <Debrief rounds={closed} answers={answers} players={players} me={me} />
        </Card>
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

const Leaderboard: React.FC<{ players: DrillPlayer[]; meId?: string; answeredIds?: Set<string> }> = ({ players, meId, answeredIds }) => {
  const ranked = [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const top = Math.max(1, ranked[0]?.score ?? 1);
  return (
    <ol className="divide-y divide-line border-b border-line">
      {ranked.map((p, i) => (
        <li key={p.id} className={cx('flex items-center gap-3 py-2.5', p.id === meId && 'shadow-[inset_3px_0_0_var(--color-drill)] pl-2')}>
          <span className={cx('w-5 font-mono text-sm', i === 0 && p.score > 0 ? 'font-semibold text-drill' : 'text-fg-subtle')}>{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm text-fg">{p.name}</span>
              {answeredIds?.has(p.id) && <Check className="h-3.5 w-3.5 text-drill" aria-label="locked in" />}
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

const Debrief: React.FC<{ rounds: DrillRound[]; answers: DrillAnswer[]; players: DrillPlayer[]; me: DrillPlayer | null }> = ({ rounds, answers, players, me }) => (
  <ol className="divide-y divide-line">
    {rounds.map((r) => {
      const ra = answers.filter((a) => a.round_id === r.id && a.revealed);
      const right = ra.filter((a) => a.correct).length;
      const mine = me ? ra.find((a) => a.player_id === me.id) : undefined;
      return (
        <li key={r.id} className="py-4 first:pt-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-xs text-drill">#{r.position + 1}</span>
            <span className="text-[15px] font-semibold text-fg">{r.title}</span>
            <span className="ml-auto font-mono text-xs text-fg-subtle">
              {right}/{players.length} right
            </span>
          </div>
          <p className="mt-1.5 text-sm text-fg">
            <span className="font-mono text-accent">{LETTERS[r.correct_index]}</span> {r.options[r.correct_index]}
          </p>
          <p className="mt-1 text-sm text-fg-muted">{r.explanation}</p>
          {me && (
            <p className={cx('mt-2 flex items-center gap-1.5 text-xs', mine?.correct ? 'text-accent' : 'text-fg-subtle')}>
              {mine ? (
                mine.correct ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> You picked {LETTERS[mine.choice]} · +{mine.points}
                  </>
                ) : (
                  <>
                    <X className="h-3.5 w-3.5 text-breach-text" /> You picked {LETTERS[mine.choice] ?? '?'}
                  </>
                )
              ) : (
                'You did not answer'
              )}
            </p>
          )}
        </li>
      );
    })}
  </ol>
);

const AllTime: React.FC<{ members: Member[] }> = ({ members }) => {
  const ranked = useMemo(() => [...members].sort((a, b) => (b.drill_score ?? 0) - (a.drill_score ?? 0)), [members]);
  const top = Math.max(1, ranked[0]?.drill_score ?? 1);
  return (
    <Card kind="people" kindTone="drill" title="All-time standings" description="Lifetime Drill Night points">
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
