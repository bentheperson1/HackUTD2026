import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { useSpacetimeDB } from 'spacetimedb/react';
import { ShieldAlert, Radio, Clock, User, AlertTriangle } from 'lucide-react';
import { store } from '../lib/store';

export const TopBar: React.FC = () => {
  const { currentUser, spacetimedbIdentity } = useAuth();
  const [incident] = React.useState(store.getState().incident);

  let isDbConnected = false;
  let liveIdentity = spacetimedbIdentity;
  try {
    const conn = useSpacetimeDB();
    if (conn) {
      isDbConnected = conn.isActive;
      if (conn.identity) {
        liveIdentity = conn.identity.toHexString();
      }
    }
  } catch {
    // Fallback if not inside provider
  }

  const shortId = liveIdentity ? `${liveIdentity.slice(0, 8)}...${liveIdentity.slice(-4)}` : 'offline';

  const navLinks = [
    { to: '/admin', label: 'Admin Command' },
    { to: '/warroom', label: 'War Room' },
    { to: '/drill', label: 'Drill Simulation' },
    { to: '/scope', label: 'Scope & Data' },
    { to: '/notify', label: 'Breach Deadlines' },
    { to: '/docs', label: 'Docs & Audit' },
    { to: '/editor', label: 'Insurance & Legal' },
    { to: '/export', label: 'Export Dossier' },
    { to: '/members', label: 'Roster' },
    { to: '/debug', label: 'Diagnostics' },
  ];

  return (
    <header className="bg-[#10141D] border-b border-[#232936] text-slate-100 shadow-xl">
      {/* Top Status Strip */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-[#1A202C]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isDbConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isDbConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="font-mono text-slate-300">
              SpacetimeDB: {isDbConnected ? <span className="text-emerald-400 font-bold">Connected (Maincloud)</span> : <span className="text-amber-400 font-semibold">Local Sync Active</span>}
            </span>
          </div>

          <span className="text-slate-700">•</span>

          <div className="flex items-center gap-1.5 text-slate-400">
            <Radio className="w-3.5 h-3.5 text-hazard-yellow" />
            <span>Channel: <strong className="text-slate-200">Out-of-Band (Untrusted LAN)</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-slate-400">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-200 font-semibold">{currentUser.name}</span>
            <span className="bg-hazard-yellow/15 text-hazard-bright border border-hazard-yellow/40 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
              {currentUser.role}
            </span>
          </div>

          <span className="text-slate-700">•</span>

          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400" title={`Full Identity: ${liveIdentity}`}>
            ID: <span className="text-slate-300 font-medium">{shortId}</span>
          </div>
        </div>
      </div>

      {/* Main Branding Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-hazard-yellow to-hazard-dark flex items-center justify-center shadow-lg shadow-hazard-yellow/25 shrink-0">
            <ShieldAlert className="w-6 h-6 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black tracking-tight text-white m-0">DRILL NIGHT</h1>
              <span className="bg-[#1C222E] text-slate-300 border border-[#2D3646] px-2 py-0.5 rounded text-xs font-semibold">
                Crisis Command Center
              </span>
            </div>
            <p className="text-xs text-slate-400 m-0">
              Ransomware Tabletop Simulation &amp; Out-of-Band Operations
            </p>
          </div>
        </div>

        {/* Phase & Severity Badges */}
        <div className="flex items-center gap-2 bg-[#0B0D11] border border-[#232936] p-1.5 rounded-xl shadow-inner">
          <div className="px-3.5 py-1.5 bg-[#151922] rounded-lg text-xs flex items-center gap-2 border border-[#262C38]">
            <span className="text-slate-400">Phase:</span>
            <span className="font-extrabold text-hazard-bright uppercase tracking-wider">
              {incident.phase}
            </span>
          </div>

          <div className="px-3.5 py-1.5 bg-[#151922] rounded-lg text-xs flex items-center gap-1.5 border border-[#262C38]">
            <span className="text-slate-400">Severity:</span>
            <span className="font-extrabold text-rose-400 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Critical
            </span>
          </div>

          <div className="px-3.5 py-1.5 bg-[#151922] rounded-lg text-xs flex items-center gap-2 border border-[#262C38]">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-300 font-mono font-medium">Elapsed: 00:14:22</span>
          </div>
        </div>
      </div>

      {/* Larger, Prominent Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 pb-3">
        <nav className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `px-4 py-2.5 rounded-lg text-sm font-bold tracking-tight whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-hazard-yellow text-black shadow-lg shadow-hazard-yellow/20 font-black'
                    : 'bg-[#151922] text-slate-300 hover:text-white hover:bg-[#1E2431] border border-[#262C38]'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <div className="ml-auto pl-2">
            <NavLink
              to="/login"
              className="text-xs font-semibold text-slate-300 hover:text-hazard-yellow flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-[#151922] hover:bg-[#1E2431] border border-[#262C38] transition-all"
            >
              <User className="w-3.5 h-3.5" /> Switch Persona
            </NavLink>
          </div>
        </nav>
      </div>
    </header>
  );
};
