<<<<<<< Updated upstream
import React, { useState } from 'react';
import type { Identity } from 'spacetimedb';
import { useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react';
import { reducers, tables } from '../module_bindings';
import type { DrillPlayer } from '../module_bindings/types';
import { useAuth } from '../lib/authContext';
import { errorMessage, toUiRole } from '../lib/live';
import { DataTable, Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Card, SectionTitle } from '../components/Card';
import { Chip } from '../components/Chip';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';
import { RoleBadge } from '../components/RoleBadge';
import { Check, Flag, Play, SkipForward, X } from 'lucide-react';

// DrillSession.status values (Drill.cs)
const STATUS_LABEL: Record<string, string> = { lobby: 'Waiting to start', running: 'Running', finished: 'Finished' };

export const DrillPage: React.FC = () => {
  const { identity } = useSpacetimeDB();
  const { isRegistered, activeOrg, orgMembership, me } = useAuth();
  const [scenarios] = useTable(tables.drillScenario);
  const [sessions] = useTable(tables.drillSession);
  const [players] = useTable(tables.drillPlayer);
  const [questions] = useTable(tables.drillQuestion);
  const [answers] = useTable(tables.drillAnswer);
  const createDrill = useReducer(reducers.createDrill);
  const joinDrill = useReducer(reducers.joinDrill);
  const startDrill = useReducer(reducers.startDrill);
  const nextInjectNow = useReducer(reducers.nextInjectNow);
  const endDrill = useReducer(reducers.endDrill);
  const answerInject = useReducer(reducers.answerInject);

  const [scenarioId, setScenarioId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [nickname, setNickname] = useState(me?.displayName ?? '');
  const [pickedSessionId, setPickedSessionId] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMe = (who: Identity) => !!identity && who.isEqual(identity);
  const isOwner = orgMembership?.role === 'Owner';

  // Drills I can see: my company's, plus any I've joined by code
  const joinedIds = new Set(players.filter((p) => isMe(p.person)).map((p) => p.sessionId));
  const mySessions = sessions
    .filter((s) => s.orgId === activeOrg?.id || joinedIds.has(s.id))
    .sort((a, b) => Number(b.id - a.id));
  const session =
    mySessions.find((s) => s.id === pickedSessionId) ?? mySessions.find((s) => s.status !== 'finished') ?? mySessions[0];

  const sessionPlayers = session
    ? players.filter((p) => p.sessionId === session.id).sort((a, b) => Number(b.score - a.score))
    : [];
  const myPlayer = sessionPlayers.find((p) => isMe(p.person));
  const sessionQuestions = session
    ? questions.filter((q) => q.sessionId === session.id).sort((a, b) => Number(a.id - b.id))
    : [];
  const currentQuestion =
    session?.currentInject !== undefined ? sessionQuestions.find((q) => q.injectId === session.currentInject) : undefined;
  const myAnswerTo = (injectId: bigint) =>
    session ? answers.find((a) => a.sessionId === session.id && a.injectId === injectId && isMe(a.person)) : undefined;
  const canRunSession = !!session && isOwner && session.orgId === activeOrg?.id;

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    const id = scenarioId || scenarios[0]?.id;
    if (id) await run(() => createDrill({ orgId: activeOrg.id, scenarioId: id }));
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    const ok = await run(() => joinDrill({ joinCode: code, nickname }));
    if (ok) {
      const joined = sessions.find((s) => s.joinCode === code);
      if (joined) setPickedSessionId(joined.id);
      setJoinCode('');
    }
  };

  const scoreColumns: Column<DrillPlayer>[] = [
    { header: '#', render: (p) => sessionPlayers.indexOf(p) + 1 },
    {
      header: 'Player',
      render: (p) => (
        <span className={isMe(p.person) ? 'type-label-large' : ''}>
          {p.nickname}
          {isMe(p.person) ? ' (you)' : ''}
        </span>
      ),
    },
    { header: 'Role', render: (p) => <RoleBadge role={toUiRole(p.role)} /> },
    { header: 'Score', align: 'right', render: (p) => <span className="font-mono">{p.score.toString()}</span> },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Drill"
        description="Multiplayer tabletop drill. Questions arrive on a timer and faster correct answers score more."
      />

      {error && <Notice tone="error">{error}</Notice>}
      {!isRegistered && <Notice tone="error">Sign in with your phone number first.</Notice>}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="p-5">
          <SectionTitle>Join with a code</SectionTitle>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Code">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABCD"
                  maxLength={4}
                  className="w-full font-mono tracking-[0.3em]"
                />
              </Field>
              <Field label="Nickname">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={24}
                  className="w-full"
                />
              </Field>
            </div>
            <Button
              type="submit"
              variant="tonal"
              disabled={!isRegistered || joinCode.trim().length !== 4 || !nickname.trim()}
            >
              Join drill
            </Button>
          </form>
        </Card>

        {isOwner && activeOrg && (
          <Card className="p-5">
            <SectionTitle trailing={activeOrg.name}>Open a new drill</SectionTitle>
            <form onSubmit={handleCreate} className="space-y-4">
              <Field label="Scenario">
                <select
                  value={scenarioId || scenarios[0]?.id}
                  onChange={(e) => setScenarioId(e.target.value)}
                  className="w-full"
                >
                  {scenarios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.minutes.toString()} min)
                    </option>
                  ))}
                </select>
              </Field>
              <Button type="submit" disabled={scenarios.length === 0}>
                Open lobby
              </Button>
            </form>
          </Card>
        )}
      </div>

      {mySessions.length > 1 && (
        <Field label="Drill session">
          <select
            value={session?.id.toString()}
            onChange={(e) => setPickedSessionId(BigInt(e.target.value))}
            className="w-full md:max-w-md"
          >
            {mySessions.map((s) => (
              <option key={s.id.toString()} value={s.id.toString()}>
                {s.joinCode} · {scenarios.find((sc) => sc.id === s.scenarioId)?.name ?? s.scenarioId} ·{' '}
                {STATUS_LABEL[s.status] ?? s.status}
              </option>
            ))}
          </select>
        </Field>
      )}

      {session && (
        <>
          <section className="flex flex-col gap-4 rounded-2xl bg-primary-container p-5 text-on-primary-container md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <div className="type-label-large opacity-80">
                {scenarios.find((sc) => sc.id === session.scenarioId)?.name ?? session.scenarioId}
              </div>
              <div className="mt-1 flex items-center gap-3">
                <span className="font-mono type-headline-medium tracking-[0.3em]">{session.joinCode}</span>
                <Chip>{STATUS_LABEL[session.status] ?? session.status}</Chip>
              </div>
              <div className="mt-1 type-body-medium opacity-80">
                {sessionPlayers.length} {sessionPlayers.length === 1 ? 'player' : 'players'} · chat happens in the war
                room for <span className="font-mono">{session.incidentId}</span>
              </div>
            </div>
            {canRunSession && (
              <div className="flex flex-wrap gap-2">
                {session.status === 'lobby' && (
                  <Button icon={<Play />} onClick={() => run(() => startDrill({ sessionId: session.id }))}>
                    Start
                  </Button>
                )}
                {session.status === 'running' && (
                  <Button
                    variant="tonal"
                    icon={<SkipForward />}
                    onClick={() => run(() => nextInjectNow({ sessionId: session.id }))}
                  >
                    Next question
                  </Button>
                )}
                {session.status !== 'finished' && (
                  <Button
                    variant="outlined"
                    icon={<Flag />}
                    onClick={() => confirm('End this drill for everyone?') && run(() => endDrill({ sessionId: session.id }))}
                  >
                    End
                  </Button>
                )}
              </div>
            )}
          </section>

          {!myPlayer && session.status !== 'finished' && (
            <Notice>You're watching. Join with code {session.joinCode} above to answer questions.</Notice>
          )}

          {session.status === 'running' && (
            <Card className="p-5">
              {!currentQuestion ? (
                <p className="m-0 type-body-large text-on-surface-variant">First question incoming…</p>
              ) : (
                (() => {
                  const mine = myAnswerTo(currentQuestion.injectId);
                  const notForMe = currentQuestion.forRole !== '' && myPlayer?.role !== currentQuestion.forRole;
                  return (
                    <>
                      <div className="mb-2 flex items-center gap-2">
                        <SectionTitle>Question {sessionQuestions.indexOf(currentQuestion) + 1}</SectionTitle>
                        {currentQuestion.forRole && <RoleBadge role={toUiRole(currentQuestion.forRole)} />}
                      </div>
                      <p className="mb-4 mt-0 type-title-medium">{currentQuestion.text}</p>
                      {notForMe && myPlayer && (
                        <p className="mb-3 mt-0 type-body-medium text-on-surface-variant">
                          This one is for the {currentQuestion.forRole} player. Watch how they handle it.
                        </p>
                      )}
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {currentQuestion.choices.map((choice, idx) => {
                          const picked = !!mine && Number(mine.choice) === idx;
                          return (
                            <Button
                              key={idx}
                              variant={picked ? 'filled' : 'outlined'}
                              disabled={!myPlayer || !!mine || notForMe}
                              onClick={() =>
                                run(() =>
                                  answerInject({
                                    sessionId: session.id,
                                    injectId: currentQuestion.injectId,
                                    choice: BigInt(idx),
                                  })
                                )
                              }
                              className="!h-auto min-h-10 justify-start whitespace-normal py-2 text-left"
                            >
                              {choice}
                            </Button>
                          );
                        })}
                      </div>
                      {mine && (
                        <p className="mb-0 mt-3 type-body-medium text-on-surface-variant">
                          Answer locked in. Results are revealed when the drill ends.
                        </p>
                      )}
                    </>
                  );
                })()
              )}
            </Card>
          )}

          <section>
            <SectionTitle trailing={`${sessionPlayers.length} players`}>Scoreboard</SectionTitle>
            <DataTable columns={scoreColumns} data={sessionPlayers} emptyMessage="Nobody has joined yet." />
          </section>

          {session.status === 'finished' && sessionQuestions.length > 0 && (
            <section>
              <SectionTitle>Debrief</SectionTitle>
              <ol className="m-0 list-none space-y-3 p-0">
                {sessionQuestions.map((q, i) => {
                  const mine = myAnswerTo(q.injectId);
                  return (
                    <li key={q.id.toString()}>
                      <Card variant="outlined" className="p-4">
                        <div className="type-label-medium text-on-surface-variant">Question {i + 1}</div>
                        <p className="mb-2 mt-1 type-body-large">{q.text}</p>
                        {q.correctChoice !== undefined && (
                          <div className="flex items-start gap-2 type-body-medium">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-tertiary" />
                            {q.choices[Number(q.correctChoice)]}
                          </div>
                        )}
                        {mine && !mine.correct && (
                          <div className="mt-1 flex items-start gap-2 type-body-medium text-error">
                            <X className="mt-0.5 h-4 w-4 shrink-0" />
                            You picked: {q.choices[Number(mine.choice)]}
                          </div>
                        )}
                        {q.explanation && (
                          <p className="mb-0 mt-2 type-body-small text-on-surface-variant">{q.explanation}</p>
                        )}
                      </Card>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </>
      )}
    </div>
  );
};
=======
import React from 'react';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';

// TODO: needs drill_session / drill_player / drill_event tables and reducers in the backend
export const DrillPage: React.FC = () => (
  <div className="space-y-8">
    <PageHeader title="Drill" description="Multiplayer crisis drill with live scoring." />
    <Notice>Drills are coming soon. They need backend tables before they can run.</Notice>
  </div>
);
>>>>>>> Stashed changes
