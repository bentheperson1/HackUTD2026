import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { store } from '../lib/store';
import { useAppState } from '../lib/useAppState';
import { Alert, Button, Card, PageHeader } from '../components/ui';

export const ExportPage: React.FC = () => {
  const state = useAppState((s) => s);
  const [includeTimeline, setIncludeTimeline] = useState(true);
  const [includeScope, setIncludeScope] = useState(true);
  const [includeAuditLogs, setIncludeAuditLogs] = useState(true);
  const [includeDrafts, setIncludeDrafts] = useState(true);
  const [includeRoster, setIncludeRoster] = useState(true);
  const [exportNotice, setExportNotice] = useState('');

  const handleExport = () => {
    const s = store.getState();
    const packet = {
      title: 'Drill Night Crisis Command Center - Formal Incident Package',
      generated_at: new Date().toISOString(),
      organization: s.org.name,
      incident: s.incident,
      contents: {
        ...(includeRoster ? { roster: s.members } : {}),
        ...(includeTimeline ? { warroom_messages: s.messages } : {}),
        ...(includeScope ? { scope_records: s.scopeItems } : {}),
        ...(includeAuditLogs ? { immutable_audit_logs: s.auditLogs } : {}),
        ...(includeDrafts ? { report_drafts: s.reportDrafts } : {}),
      },
    };
    const blob = new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-dossier-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNotice('Incident package downloaded.');
  };

  const options = [
    { label: 'Team roster', detail: `${state.members.length} people with roles and phones`, checked: includeRoster, set: setIncludeRoster },
    { label: 'War room messages', detail: `${state.messages.length} messages across all channels`, checked: includeTimeline, set: setIncludeTimeline },
    { label: 'Scope of affected data', detail: `${state.scopeItems.length} data types with status and states`, checked: includeScope, set: setIncludeScope },
    { label: 'Audit log', detail: `${state.auditLogs.length} permanent entries`, checked: includeAuditLogs, set: setIncludeAuditLogs },
    { label: 'Report drafts', detail: `${state.reportDrafts.length} insurer, counsel and regulator drafts`, checked: includeDrafts, set: setIncludeDrafts },
  ];
  const selectedCount = options.filter((o) => o.checked).length;

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Record" title="Export" description="Package the incident record for the insurer and outside counsel." />

      {exportNotice && (
        <Alert tone="success" onDismiss={() => setExportNotice('')}>
          {exportNotice}
        </Alert>
      )}

      <Card kind="list" title="What to include" className="max-w-2xl" padded={false}>
        <ul className="divide-y divide-line">
          {options.map((o) => (
            <li key={o.label}>
              <label className="flex cursor-pointer items-start gap-3 px-5 py-3.5 hover:bg-surface-2/50">
                <input type="checkbox" checked={o.checked} onChange={(e) => o.set(e.target.checked)} className="mt-0.5" />
                <div>
                  <div className="text-sm text-fg">{o.label}</div>
                  <div className="text-xs text-fg-subtle">{o.detail}</div>
                </div>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
          <span className="text-xs text-fg-subtle">
            {selectedCount} of {options.length} sections · JSON file (PDF coming next)
          </span>
          <Button variant="primary" onClick={handleExport} disabled={selectedCount === 0}>
            <Download className="h-4 w-4" />
            Download package
          </Button>
        </div>
      </Card>
    </div>
  );
};
