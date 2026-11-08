import React, { useState } from 'react';
import { store } from '../lib/store';
import { Download, FileCheck, CheckCircle2 } from 'lucide-react';

export const ExportPage: React.FC = () => {
  const [includeTimeline, setIncludeTimeline] = useState(true);
  const [includeScope, setIncludeScope] = useState(true);
  const [includeAuditLogs, setIncludeAuditLogs] = useState(true);
  const [includeDrafts, setIncludeDrafts] = useState(true);
  const [includeRoster, setIncludeRoster] = useState(true);
  const [exportNotice, setExportNotice] = useState('');

  const handleExportPDF = () => {
    const state = store.getState();
    const packet = {
      title: 'Drill Night Crisis Command Center - Formal Incident Package',
      generated_at: new Date().toISOString(),
      organization: state.org.name,
      incident: state.incident,
      contents: {
        ...(includeRoster ? { roster: state.members } : {}),
        ...(includeTimeline ? { warroom_messages: state.messages } : {}),
        ...(includeScope ? { scope_records: state.scopeItems } : {}),
        ...(includeAuditLogs ? { immutable_audit_logs: state.auditLogs } : {}),
        ...(includeDrafts ? { report_drafts: state.reportDrafts } : {}),
      },
    };

    const blob = new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-dossier-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setExportNotice('Generated and downloaded court/insurer-ready incident dossier bundle!');
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h2 className="text-xl font-black text-white flex items-center gap-2 m-0">
          <Download className="w-5 h-5 text-hazard-yellow" />
          <span>Incident Dossier &amp; Regulatory PDF Export</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1 mb-0">
          Package chronological evidence logs, scope assessments, and counsel memos into a certified audit bundle.
        </p>
      </div>

      {exportNotice && (
        <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Package Contents Checklist */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xl max-w-2xl space-y-4">
        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-hazard-yellow" />
          <span>Certified Package Contents Checklist</span>
        </h3>

        <div className="space-y-3 bg-[#0B0D11] p-4 rounded-xl border border-[#1E2431]">
          <label className="flex items-center gap-3 text-xs text-slate-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeRoster}
              onChange={(e) => setIncludeRoster(e.target.checked)}
              className="h-4 w-4 rounded bg-[#161B24] border-[#2D3648] text-hazard-yellow"
            />
            <span>Emergency Incident Command Roster &amp; Authorized Responders</span>
          </label>

          <label className="flex items-center gap-3 text-xs text-slate-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeTimeline}
              onChange={(e) => setIncludeTimeline(e.target.checked)}
              className="h-4 w-4 rounded bg-[#161B24] border-[#2D3648] text-hazard-yellow"
            />
            <span>Chronological Crisis War Room Log &amp; Decision Dispatches</span>
          </label>

          <label className="flex items-center gap-3 text-xs text-slate-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeScope}
              onChange={(e) => setIncludeScope(e.target.checked)}
              className="h-4 w-4 rounded bg-[#161B24] border-[#2D3648] text-hazard-yellow"
            />
            <span>Data Scope Assessment &amp; Compromise Classification</span>
          </label>

          <label className="flex items-center gap-3 text-xs text-slate-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeAuditLogs}
              onChange={(e) => setIncludeAuditLogs(e.target.checked)}
              className="h-4 w-4 rounded bg-[#161B24] border-[#2D3648] text-hazard-yellow"
            />
            <span>Immutable Append-Only Audit Trail (with actor identity hashes)</span>
          </label>

          <label className="flex items-center gap-3 text-xs text-slate-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeDrafts}
              onChange={(e) => setIncludeDrafts(e.target.checked)}
              className="h-4 w-4 rounded bg-[#161B24] border-[#2D3648] text-hazard-yellow"
            />
            <span>Privileged Memos &amp; First Notice of Loss Drafts</span>
          </label>
        </div>

        <button
          onClick={handleExportPDF}
          className="w-full min-h-[48px] bg-hazard-yellow hover:bg-hazard-bright text-black font-extrabold text-sm uppercase tracking-wider rounded-lg shadow-lg shadow-hazard-yellow/20 flex items-center justify-center gap-2 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Generate Certified Incident Dossier</span>
        </button>
      </div>
    </div>
  );
};
