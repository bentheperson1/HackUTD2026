import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { Incident, IncidentPhase } from '../lib/types';
import { PHASES } from '../lib/constants';
import { ShieldAlert, CheckCircle2, Flame } from 'lucide-react';

export const IncidentPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [incident, setIncident] = useState<Incident>(store.getState().incident);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return store.subscribe((state) => {
      setIncident(state.incident);
    });
  }, []);

  const handleActivate = () => {
    const res = store.setIncidentStatus(currentUser.name, 'active');
    if (!res.success) setError(res.error || 'Failed to activate incident');
  };

  const handleClose = () => {
    if (confirm('Are you sure you want to mark the incident as resolved and closed?')) {
      const res = store.setIncidentStatus(currentUser.name, 'closed');
      if (!res.success) setError(res.error || 'Failed to close incident');
    }
  };

  const handlePhaseChange = (phase: IncidentPhase) => {
    const res = store.setIncidentPhase(currentUser.name, phase);
    if (!res.success) setError(res.error || 'Failed to update phase');
  };

  const isActive = incident.status === 'active';

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h2 className="text-xl font-black text-white flex items-center gap-2 m-0">
          <ShieldAlert className="w-5 h-5 text-hazard-yellow" />
          <span>Incident Status &amp; Command Trigger</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1 mb-0">
          The central crisis trigger. Activating locks the append-only timeline, notifies emergency roles, and provisions the secure war room.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
          Error: {error}
        </div>
      )}

      {/* Main Trigger Card */}
      <div className={`p-6 rounded-2xl border-2 transition-all ${isActive ? 'bg-rose-950/20 border-rose-700/80 shadow-2xl shadow-rose-950/30' : 'bg-card border-border'}`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Incident State:</span>
              <span className={`px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider ${isActive ? 'bg-rose-500 text-black' : 'bg-slate-800 text-slate-300'}`}>
                {incident.status}
              </span>
            </div>

            <h3 className="text-2xl font-black text-white m-0">
              {isActive ? '🚨 Active Emergency Operations Engaged' : 'Standby / Ready for Activation'}
            </h3>

            <div className="mt-2 text-xs text-slate-300 space-y-1">
              <div>Current Phase: <strong className="text-hazard-bright uppercase">{incident.phase}</strong></div>
              <div>Started: <span className="font-mono text-slate-400">{incident.started_at ? new Date(incident.started_at).toLocaleString() : 'N/A'}</span></div>
            </div>
          </div>

          <div>
            {!isActive ? (
              <button
                onClick={handleActivate}
                className="min-h-[50px] px-8 bg-rose-600 hover:bg-rose-500 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all hover:scale-105"
              >
                <Flame className="w-5 h-5" />
                <span>Declare &amp; Activate Live Incident</span>
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="min-h-[50px] px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Mark Incident Resolved / Close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Phase Transition Controls */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xl">
        <h4 className="text-sm font-bold text-white mb-2">Incident Response Lifecycle Progression</h4>
        <p className="text-xs text-slate-400 mb-4">
          Advance the incident across standardized stages (NIST SP 800-61 / CISA Framework).
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PHASES.map((p, idx) => {
            const isCurrent = incident.phase === p;
            return (
              <button
                key={p}
                onClick={() => handlePhaseChange(p)}
                disabled={!isActive}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isCurrent
                    ? 'bg-hazard-yellow text-black border-hazard-bright shadow-lg shadow-hazard-yellow/20 font-black'
                    : 'bg-[#0B0D11] border-border text-slate-300 hover:border-slate-600'
                } ${!isActive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="text-[10px] uppercase font-mono opacity-80 mb-1">Stage 0{idx + 1}</div>
                <div className="text-sm font-bold uppercase tracking-wide">{p}</div>
                {isCurrent && <div className="text-[11px] mt-1 font-semibold">● Active Phase</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
