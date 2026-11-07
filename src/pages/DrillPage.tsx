import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { SCENARIOS } from '../lib/constants';
import { ScenarioType, DrillSession, DrillPlayer, DrillEvent } from '../lib/types';
import { RoleBadge } from '../components/RoleBadge';
import { DataTable, Column } from '../components/DataTable';

export const DrillPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [drillSession, setDrillSession] = useState<DrillSession>(store.getState().drillSession);
  const [players, setPlayers] = useState<DrillPlayer[]>(store.getState().drillPlayers);
  const [events, setEvents] = useState<DrillEvent[]>(store.getState().drillEvents);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('ransomware');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return store.subscribe((state) => {
      setDrillSession(state.drillSession);
      setPlayers(state.drillPlayers);
      setEvents(state.drillEvents);
    });
  }, []);

  const handleStartDrill = () => {
    setError(null);
    const res = store.startDrill(currentUser.name, selectedScenario);
    if (!res.success) {
      setError(res.error || 'Failed to start drill');
    }
  };

  const handleAwardPoints = (playerId: string, points: number) => {
    store.awardPoints(playerId, points);
  };

  const playerColumns: Column<DrillPlayer>[] = [
    {
      header: 'Rank',
      render: (_, idx) => <strong>#{idx + 1}</strong>,
    },
    {
      header: 'Responder Name',
      render: (p) => p.name,
    },
    {
      header: 'Role',
      render: (p) => <RoleBadge role={p.role} />,
    },
    {
      header: 'Drill Points',
      render: (p) => <strong style={{ color: '#2e7d32', fontSize: '1.1em' }}>{p.score} pts</strong>,
    },
    {
      header: 'Award Action Points',
      render: (p) => (
        <button onClick={() => handleAwardPoints(p.id, 25)} style={{ padding: '4px 8px' }}>
          +25 pts (Action Completed)
        </button>
      ),
    },
  ];

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const eventColumns: Column<DrillEvent>[] = [
    {
      header: 'Timestamp',
      render: (e) => <code>{e.timestamp}</code>,
    },
    {
      header: 'Scenario Injection Event',
      render: (e) => e.description,
    },
    {
      header: 'Required Triage Action',
      render: (e) => <strong>{e.action_required}</strong>,
    },
    {
      header: 'Bounty Points',
      render: (e) => `+${e.points} pts`,
    },
  ];

  return (
    <div>
      <h3>Drill Night: Monthly 15-Minute Crisis Simulation</h3>
      <p>
        Teams that practice crisis response make 80% fewer catastrophic containment errors.
        Scheduled reducers inject real-time scenario events on a countdown timer. Teammates collaborate and earn points
        using the <em>exact same screens</em> they use during a live incident.
      </p>

      {error && <div style={{ color: 'red', fontWeight: 'bold' }}>Error: {error}</div>}

      <div
        style={{
          border: '2px solid black',
          padding: '16px',
          backgroundColor: drillSession.status === 'running' ? '#e8f5e9' : '#fafafa',
          marginBottom: '20px',
        }}
      >
        <h4>
          Session Status:{' '}
          <span style={{ textTransform: 'uppercase', color: drillSession.status === 'running' ? 'green' : 'black' }}>
            {drillSession.status}
          </span>
        </h4>
        <div><strong>Scenario:</strong> {drillSession.scenario.toUpperCase()}</div>
        <div>
          <strong>Timer Remaining:</strong>{' '}
          <span style={{ fontSize: '1.2em', fontFamily: 'monospace' }}>
            {Math.floor(drillSession.time_remaining_seconds / 60)}:
            {('0' + (drillSession.time_remaining_seconds % 60)).slice(-2)}
          </span>
        </div>

        <div style={{ marginTop: '14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label><strong>Pick Scenario:</strong></label>
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value as ScenarioType)}
            disabled={drillSession.status === 'running'}
            style={{ padding: '6px' }}
          >
            {SCENARIOS.map((s) => (
              <option key={s.type} value={s.type}>
                {s.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleStartDrill}
            style={{
              padding: '8px 18px',
              backgroundColor: '#1b5e20',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            ▶ Launch 15-Min Multiplayer Drill
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h4>Live Responder Leaderboard</h4>
          <DataTable columns={playerColumns} data={sortedPlayers} />
        </div>

        <div>
          <h4>Timed Scenario Event Injector Feed</h4>
          <DataTable columns={eventColumns} data={events} />
        </div>
      </div>
    </div>
  );
};
