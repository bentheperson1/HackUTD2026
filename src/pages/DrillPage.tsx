import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { SCENARIOS } from '../lib/constants';
import { ScenarioType, DrillSession, DrillPlayer, DrillEvent } from '../lib/types';
import { DataTable, Column } from '../components/DataTable';
import { Play, Award, Clock, Flame } from 'lucide-react';

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
      header: 'Rank',
      render: (_, idx) => <span className="font-black text-sm text-hazard-bright font-mono">#{idx + 1}</span>,
    },
    {
      header: 'Responder Name',
      render: (p) => <strong className="text-white text-xs">{p.name}</strong>,
    },
    {
      header: 'Role',
      render: (p) => (
        <span className="text-[11px] font-bold uppercase text-hazard-yellow bg-hazard-yellow/10 px-2 py-0.5 rounded border border-hazard-yellow/20">
          {p.role}
        </span>
      ),
    },
    {
      header: 'Points',
      render: (p) => <span className="font-mono font-bold text-emerald-400 text-sm">{p.score} pts</span>,
    },
    {
      header: 'Action',
      render: (p) => (
        <button
          onClick={() => handleAwardPoints(p.id, 25)}
          className="text-[11px] px-2.5 py-1 rounded bg-[#1C222E] hover:bg-[#273042] border border-[#2D3646] text-slate-200 transition-all"
        >
          +25 pts
        </button>
      ),
    },
  ];

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const eventColumns: Column<DrillEvent>[] = [
    {
      header: 'Timestamp',
      render: (e) => <span className="font-mono text-hazard-yellow text-xs font-bold">[{e.timestamp}]</span>,
    },
    {
      header: 'Scenario Injection Event',
      render: (e) => <span className="text-xs text-slate-200">{e.description}</span>,
    },
    {
      header: 'Required Triage Action',
      render: (e) => <span className="text-xs text-white font-semibold">{e.action_required}</span>,
    },
    {
      header: 'Bounty',
      render: (e) => <span className="font-mono text-emerald-400 text-xs font-bold">+{e.points} pts</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h2 className="text-xl font-black text-white flex items-center gap-2 m-0">
          <Flame className="w-5 h-5 text-hazard-yellow" />
          <span>Monthly 15-Minute Crisis Simulation</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1 mb-0">
          Teams that practice tabletop exercises make 80% fewer catastrophic containment errors.
          Scheduled injects drop in real time; teammates earn points using the exact same screens as a live incident.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
          Error: {error}
        </div>
      )}

      {/* Drill Control Banner */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Simulation Status</div>
            <div className="text-lg font-black text-white uppercase flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${drillSession.status === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
              <span>{drillSession.status}</span>
            </div>
          </div>

          <div className="h-10 w-px bg-border hidden sm:block"></div>

          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Timer Remaining</div>
            <div className="font-mono text-xl font-bold text-hazard-bright">
              {Math.floor(drillSession.time_remaining_seconds / 60)}:
              {('0' + (drillSession.time_remaining_seconds % 60)).slice(-2)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value as ScenarioType)}
            disabled={drillSession.status === 'running'}
            className="text-xs font-bold"
          >
            {SCENARIOS.map((s) => (
              <option key={s.type} value={s.type}>
                {s.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleStartDrill}
            className="min-h-[44px] px-6 bg-hazard-yellow hover:bg-hazard-bright text-black font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-hazard-yellow/20 flex items-center gap-2 transition-all"
          >
            <Play className="w-4 h-4" />
            <span>Launch Simulation</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-200 m-0 flex items-center gap-2">
            <Award className="w-4 h-4 text-hazard-yellow" />
            <span>Multiplayer Leaderboard</span>
          </h3>
          <DataTable columns={playerColumns} data={sortedPlayers} />
        </div>

        <div className="lg:col-span-7 space-y-3">
          <h3 className="text-sm font-bold text-slate-200 m-0 flex items-center gap-2">
            <Clock className="w-4 h-4 text-hazard-yellow" />
            <span>Timed Event Feed</span>
          </h3>
          <DataTable columns={eventColumns} data={events} />
        </div>
      </div>
    </div>
  );
};
