import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { SCENARIOS } from '../lib/constants';
import { ScenarioType, DrillSession, DrillPlayer, DrillEvent } from '../lib/types';
import { DataTable, Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Card, SectionTitle } from '../components/Card';
import { Chip } from '../components/Chip';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';
import { RoleBadge } from '../components/RoleBadge';
import { Play } from 'lucide-react';

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

  useEffect(() => {
    if (drillSession.status !== 'running') return;
    const interval = setInterval(() => {
      setDrillSession((prev) => {
        if (prev.time_remaining_seconds <= 1) {
          return { ...prev, status: 'completed', time_remaining_seconds: 0 };
        }
        return { ...prev, time_remaining_seconds: prev.time_remaining_seconds - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [drillSession.status]);

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
      header: '#',
      render: (_, idx) => <span className="font-mono text-on-surface-variant">{idx + 1}</span>,
    },
    {
      header: 'Name',
      render: (p) => (
        <div className="flex flex-col items-start gap-1">
          <span>{p.name}</span>
          <RoleBadge role={p.role} />
        </div>
      ),
    },
    {
      header: 'Points',
      align: 'right',
      render: (p) => <span className="font-mono tabular-nums">{p.score}</span>,
    },
    {
      header: '',
      align: 'right',
      render: (p) => (
        <Button variant="text" onClick={() => handleAwardPoints(p.id, 25)}>
          +25
        </Button>
      ),
    },
  ];

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const eventColumns: Column<DrillEvent>[] = [
    {
      header: 'Time',
      render: (e) => <span className="whitespace-nowrap font-mono text-on-surface-variant">{e.timestamp}</span>,
    },
    {
      header: 'Event',
      render: (e) => e.description,
    },
    {
      header: 'Expected response',
      render: (e) => <span className="text-on-surface-variant">{e.action_required}</span>,
    },
    {
      header: 'Points',
      align: 'right',
      render: (e) => <span className="font-mono tabular-nums">{e.points}</span>,
    },
  ];

  const isRunning = drillSession.status === 'running';

  return (
    <div className="space-y-8">
      <PageHeader
        title="Drills"
        description="A 15-minute tabletop run on the same screens you'd use in a real incident. Events arrive on a timer and each response scores points."
      />

      {error && <Notice tone="error">{error}</Notice>}

      <Card className="flex flex-col gap-5 p-5 md:flex-row md:items-center">
        <div className="flex items-center gap-8">
          <div>
            <div className="type-label-medium text-on-surface-variant">Status</div>
            <div className="mt-1">
              <Chip tone={isRunning ? 'success' : 'neutral'} className="capitalize">
                {drillSession.status}
              </Chip>
            </div>
          </div>
          <div>
            <div className="type-label-medium text-on-surface-variant">Time left</div>
            <div className="font-mono type-headline-small tabular-nums">
              {Math.floor(drillSession.time_remaining_seconds / 60)}:
              {('0' + (drillSession.time_remaining_seconds % 60)).slice(-2)}
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center md:justify-end">
          <select
            aria-label="Scenario"
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value as ScenarioType)}
            disabled={isRunning}
            className="h-10 py-0"
          >
            {SCENARIOS.map((s) => (
              <option key={s.type} value={s.type}>
                {s.label}
              </option>
            ))}
          </select>
          <Button icon={<Play />} onClick={handleStartDrill}>
            Start drill
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 [&>*]:min-w-0">
        <section className="lg:col-span-5">
          <SectionTitle>Leaderboard</SectionTitle>
          <DataTable columns={playerColumns} data={sortedPlayers} />
        </section>

        <section className="lg:col-span-7">
          <SectionTitle>Event schedule</SectionTitle>
          <DataTable columns={eventColumns} data={events} />
        </section>
      </div>
    </div>
  );
};
