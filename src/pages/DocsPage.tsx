import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { AuditLogEntry, IncidentPhase } from '../lib/types';
import { PHASES } from '../lib/constants';
import { DataTable, Column } from '../components/DataTable';
import { FileText, Lock, PlusCircle, CheckCircle2 } from 'lucide-react';

export const DocsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(store.getState().auditLogs);
  const [phaseNotes, setPhaseNotes] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<IncidentPhase>('detection');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    return store.subscribe((state) => {
      setAuditLogs(state.auditLogs);
    });
  }, []);

  const handleAddPhaseDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phaseNotes.trim()) return;
    const res = store.recordAuditLog(
      currentUser.name,
      `PHASE_DOC_${selectedPhase.toUpperCase()}`,
      `[${selectedPhase.toUpperCase()}] ${phaseNotes}`
    );
    if (res.success) {
      setPhaseNotes('');
      setStatusMessage('Documentation timestamped and appended to immutable audit log.');
    }
  };

  const auditColumns: Column<AuditLogEntry>[] = [
    {
      header: 'Timestamp (Local / UTC)',
      render: (log) => <span className="font-mono text-slate-300 text-xs">{new Date(log.timestamp).toLocaleString()}</span>,
    },
    {
      header: 'Author / Actor',
      render: (log) => <strong className="text-white text-xs">{log.actor}</strong>,
    },
    {
      header: 'Action Tag',
      render: (log) => (
        <code className="bg-[#1C222E] text-hazard-bright border border-[#2D3646] px-2 py-0.5 rounded text-[11px] font-bold">
          {log.action}
        </code>
      ),
    },
    {
      header: 'Documentation & Forensic Notes',
      render: (log) => <span className="text-xs text-slate-200">{log.details}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2 m-0">
            <FileText className="w-5 h-5 text-hazard-yellow" />
            <span>Incident Documentation &amp; Immutable Audit Log</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 mb-0">
            Court-admissible and insurer-ready records. Append-only architecture: no delete or edit reducers exist.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 px-3 py-1.5 rounded-lg">
          <Lock className="w-3.5 h-3.5" />
          <span>Cryptographically Sealed</span>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Record Phase Documentation Form */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xl">
        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <PlusCircle className="w-4 h-4 text-hazard-yellow" />
          <span>Record Formal Incident Observation</span>
        </h4>

        <form onSubmit={handleAddPhaseDoc} className="space-y-4">
          <div className="w-full md:w-1/3">
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Incident Response Phase
            </label>
            <select
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value as IncidentPhase)}
              className="w-full text-xs font-bold uppercase"
            >
              {PHASES.map((p) => (
                <option key={p} value={p}>
                  {p.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Forensic Triage Details (What was found, who was contacted, evidence secured)
            </label>
            <textarea
              value={phaseNotes}
              onChange={(e) => setPhaseNotes(e.target.value)}
              placeholder="e.g. 14:22 UTC: Ransom note demands communication via Tox ID. Memory dump captured on DC-01. Firewall outbound rules severed."
              rows={3}
              className="w-full text-xs font-mono"
            />
          </div>

          <button
            type="submit"
            className="min-h-[44px] px-6 bg-hazard-yellow hover:bg-hazard-bright text-black font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-hazard-yellow/20 transition-all flex items-center gap-2"
          >
            <span>Append to Permanent Audit Trail</span>
          </button>
        </form>
      </div>

      {/* Read-Only Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 m-0">Permanent Audit Trail (Read-Only)</h3>
        <DataTable columns={auditColumns} data={auditLogs} emptyMessage="No audit logs recorded." />
      </div>
    </div>
  );
};
