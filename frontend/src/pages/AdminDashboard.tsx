import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { DEMO_SCENARIOS, ROLE_GUIDANCE_CARDS, SimulationInject } from '../lib/demoData';
import {
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Shield,
  FileText,
  Award,
  ChevronRight,
  Flame,
  ServerCrash,
  Scale,
  Megaphone,
  ShieldAlert,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeScenarioId, setActiveScenarioId] = useState(DEMO_SCENARIOS[0].id);
  const scenario = DEMO_SCENARIOS.find((s) => s.id === activeScenarioId) || DEMO_SCENARIOS[0];

  // Simulation state
  const [isDrillRunning, setIsDrillRunning] = useState(false);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(900); // 15 mins
  const [drillScore, setDrillScore] = useState(150);
  const [completedInjects, setCompletedInjects] = useState<string[]>([]);
  const [completedChecklist, setCompletedChecklist] = useState<Record<string, boolean>>({
    'c-1': true,
    'c-2': false,
  });

  // Countdown timer for active drill
  useEffect(() => {
    if (!isDrillRunning) return;
    const timer = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsDrillRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isDrillRunning]);

  const toggleDrill = () => {
    if (!isDrillRunning) {
      setIsDrillRunning(true);
      store.recordAuditLog(
        currentUser.name,
        'SIMULATION_START',
        `Started 15-minute crisis drill: ${scenario.title}`
      );
    } else {
      setIsDrillRunning(false);
    }
  };

  const resetDrill = () => {
    setIsDrillRunning(false);
    setTimeRemainingSeconds(900);
    setDrillScore(0);
    setCompletedInjects([]);
  };

  const handleResolveInject = (inject: SimulationInject) => {
    if (completedInjects.includes(inject.minute)) return;
    setCompletedInjects([...completedInjects, inject.minute]);
    setDrillScore((prev) => prev + inject.points);
    store.recordAuditLog(
      currentUser.name,
      'INJECT_RESOLVED',
      `[+${inject.points} pts] Resolved inject: ${inject.title} (${inject.recommendedAction})`
    );
  };

  const toggleTask = (key: string, title: string) => {
    const nextVal = !completedChecklist[key];
    setCompletedChecklist({ ...completedChecklist, [key]: nextVal });
    if (nextVal) {
      setDrillScore((prev) => prev + 25);
      store.recordAuditLog(
        currentUser.name,
        'TASK_COMPLETED',
        `Completed action checklist item: ${title}`
      );
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. The One Obvious Next Step (Primary Banner - Panic Friendly) */}
      <section className="bg-gradient-to-r from-amber-500/20 via-card to-card border-2 border-hazard-yellow rounded-xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-hazard-yellow text-black rounded-lg font-black shrink-0 flex items-center justify-center shadow-lg shadow-hazard-yellow/30">
              <Flame className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-hazard-bright bg-hazard-yellow/10 px-2 py-0.5 rounded border border-hazard-yellow/20">
                  ⚡ Immediate Recommended Action
                </span>
                <span className="text-xs text-slate-400">Step 1 of 4 in Containment Phase</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white mt-1 mb-1">
                Sever Central Server Rack Ethernet Trunks (Keep Power ON)
              </h2>
              <p className="text-sm text-slate-300 max-w-2xl m-0">
                Disconnect physical network cables from core switches to stop malware lateral spread.
                <strong className="text-rose-400 ml-1">DO NOT shut down power</strong> — power cycling destroys volatile RAM memory evidence required for insurance reimbursement.
              </p>
            </div>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <button
              onClick={() => toggleTask('primary-step', 'Sever Central Server Rack Ethernet Trunks')}
              className={`w-full md:w-auto min-h-[48px] px-6 py-3 rounded-lg font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg ${
                completedChecklist['primary-step']
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-hazard-yellow hover:bg-hazard-bright text-black shadow-hazard-yellow/20 hover:scale-[1.02]'
              }`}
            >
              {completedChecklist['primary-step'] ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Verified &amp; Recorded in Audit Log</span>
                </>
              ) : (
                <>
                  <span>Confirm Containment Disconnect</span>
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* 2. Simulation Control Bar (Drill Launcher) */}
      <section className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Active Scenario:
          </div>
          <select
            value={activeScenarioId}
            onChange={(e) => setActiveScenarioId(e.target.value)}
            disabled={isDrillRunning}
            className="bg-[#0B0D11] border border-border rounded-lg px-3 py-2 text-sm text-slate-100 font-semibold focus:outline-none focus:border-hazard-yellow"
          >
            {DEMO_SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.durationMinutes}m)
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-6">
          {/* Timer Display */}
          <div className="flex items-center gap-2 bg-[#0B0D11] border border-border px-3.5 py-1.5 rounded-lg">
            <Clock className="w-4 h-4 text-hazard-yellow" />
            <div className="text-xs text-slate-400">Time Left:</div>
            <div className="font-mono text-base font-bold text-white">
              {formatTimer(timeRemainingSeconds)}
            </div>
          </div>

          {/* Points Display */}
          <div className="flex items-center gap-2 bg-[#0B0D11] border border-border px-3.5 py-1.5 rounded-lg">
            <Award className="w-4 h-4 text-emerald-400" />
            <div className="text-xs text-slate-400">Drill Score:</div>
            <div className="font-mono text-base font-bold text-emerald-400">
              {drillScore} pts
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDrill}
              className={`min-h-[42px] px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
                isDrillRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
              }`}
            >
              <Play className="w-4 h-4" />
              {isDrillRunning ? 'Pause Simulation' : 'Launch 15-Min Drill'}
            </button>

            <button
              onClick={resetDrill}
              title="Reset Drill State"
              className="min-h-[42px] px-3 py-2 rounded-lg bg-[#0B0D11] hover:bg-[#1C222E] border border-border text-slate-400 hover:text-white transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. Main Split View: Guided Response Matrix vs Live Injects & Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Guided Response Checklist for Non-Security Staff */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-hazard-yellow" />
              <span>Role-Specific Incident Playbooks</span>
            </h3>
            <span className="text-xs text-slate-400">Plain-language guidance for non-cyber staff</span>
          </div>

          <div className="space-y-4">
            {ROLE_GUIDANCE_CARDS.map((card, idx) => (
              <div
                key={card.role}
                className="bg-card border border-border rounded-xl p-4 transition-all hover:border-slate-700"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded bg-[#1C222E] border border-[#2D3646] flex items-center justify-center text-hazard-yellow">
                      {idx === 0 && <ShieldAlert className="w-4 h-4" />}
                      {idx === 1 && <ServerCrash className="w-4 h-4" />}
                      {idx === 2 && <Scale className="w-4 h-4" />}
                      {idx === 3 && <Megaphone className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white m-0">{card.role}</h4>
                      <div className="text-xs text-hazard-bright font-medium">
                        Primary Duty: {card.primaryAction}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plain Steps Checklist */}
                <div className="space-y-2 mt-3 mb-3 bg-[#0B0D11] p-3 rounded-lg border border-[#1E232E]">
                  {card.plainSteps.map((step, sIdx) => {
                    const taskKey = `role-${idx}-step-${sIdx}`;
                    const isChecked = !!completedChecklist[taskKey];
                    return (
                      <label
                        key={sIdx}
                        className="flex items-start gap-2.5 text-xs text-slate-200 cursor-pointer select-none group"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTask(taskKey, step)}
                          className="mt-0.5 rounded bg-card border-border text-hazard-yellow focus:ring-hazard-yellow h-4 w-4 shrink-0"
                        />
                        <span className={isChecked ? 'line-through text-slate-500' : 'group-hover:text-white'}>
                          {step}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Common Trap / Do Not Do This Box */}
                <div className="bg-rose-950/30 border border-rose-900/50 rounded-lg p-2.5 flex items-start gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-rose-200">
                    <strong className="text-rose-400 mr-1">Trap to Avoid:</strong>
                    {card.doNotDoThis}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (5 cols): Live Injects & Threat Feed */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-hazard-yellow" />
              <span>Simulated Injects &amp; Events</span>
            </h3>
            <span className="text-xs text-hazard-bright font-mono">{scenario.injects.length} Events Scheduled</span>
          </div>

          <div className="space-y-3">
            {scenario.injects.map((inject, idx) => {
              const isResolved = completedInjects.includes(inject.minute);
              return (
                <div
                  key={idx}
                  className={`border rounded-xl p-4 transition-all ${
                    isResolved
                      ? 'bg-[#0E1218] border-[#1C2330] opacity-80'
                      : 'bg-card border-border hover:border-hazard-yellow/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-hazard-yellow bg-hazard-yellow/10 px-2 py-0.5 rounded border border-hazard-yellow/30">
                      [{inject.minute}]
                    </span>
                    <span className="text-xs text-slate-400 truncate">{inject.source}</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      +{inject.points} pts
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white mb-1">{inject.title}</h4>
                  <p className="text-xs text-slate-300 mb-3">{inject.narrative}</p>

                  <div className="bg-[#0B0D11] border border-border p-2.5 rounded-lg mb-3 text-xs">
                    <div className="text-slate-400 font-semibold mb-0.5">Required Action:</div>
                    <div className="text-white font-medium">{inject.recommendedAction}</div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#1F2531]">
                    <span className="text-[11px] text-slate-400">
                      Assigned: <strong className="text-slate-200">{inject.targetRole}</strong>
                    </span>

                    <button
                      onClick={() => handleResolveInject(inject)}
                      disabled={isResolved}
                      className={`min-h-[36px] px-3.5 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isResolved
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/50 cursor-default'
                          : 'bg-hazard-yellow hover:bg-hazard-bright text-black font-semibold'
                      }`}
                    >
                      {isResolved ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Resolved</span>
                        </>
                      ) : (
                        <span>Take Action &amp; Log</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Legal & Insurance Shortcut Card */}
          <div className="bg-[#12161F] border border-border rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-hazard-yellow" />
              <span>One-Click Legal &amp; Underwriter Outputs</span>
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <a
                href="/notify"
                className="p-2.5 rounded bg-[#0B0D11] border border-border hover:border-hazard-yellow text-slate-300 hover:text-white transition-all block"
              >
                <div className="font-bold text-white mb-0.5">State Deadlines ⏳</div>
                <div className="text-[11px] text-slate-400">TX (60d) · CA (15d)</div>
              </a>

              <a
                href="/editor"
                className="p-2.5 rounded bg-[#0B0D11] border border-border hover:border-hazard-yellow text-slate-300 hover:text-white transition-all block"
              >
                <div className="font-bold text-white mb-0.5">Insurance FNOL 📋</div>
                <div className="text-[11px] text-slate-400">24-hour claims notice</div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
