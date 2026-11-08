import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { useAppState } from '../lib/useAppState';
import { Alert, Button, Card, PageHeader } from '../components/ui';

export const ExportPage: React.FC = () => {
  const state = useAppState((s) => s);
  const [includeTimeline, setIncludeTimeline] = useState(true);
  const { currentUser } = useAuth();
  const [includeScope, setIncludeScope] = useState(true);
  const [includeAuditLogs, setIncludeAuditLogs] = useState(true);
  const [includeDrafts, setIncludeDrafts] = useState(true);
  const [includeRoster, setIncludeRoster] = useState(true);
  const [exportNotice, setExportNotice] = useState('');

  const handleExport = () => {
    const s = store.getState();
    const packet = {
      title: 'Outpost incident package',
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
    // Record the export in the permanent timeline (log_export on the server)
    store.logExport(currentUser.name, options.filter((o) => o.checked).map((o) => o.label));
    setExportNotice('The incident record was downloaded as a JSON file.');
  };

  const options = [
    { label: 'Team', detail: `${state.members.length} people`, checked: includeRoster, set: setIncludeRoster },
    { label: 'Messages', detail: `${state.messages.length} messages`, checked: includeTimeline, set: setIncludeTimeline },
    { label: 'Affected data', detail: `${state.scopeItems.length} data types`, checked: includeScope, set: setIncludeScope },
    { label: 'Audit log', detail: `${state.auditLogs.length} entries`, checked: includeAuditLogs, set: setIncludeAuditLogs },
    { label: 'Reports', detail: `${state.reportDrafts.length} drafts`, checked: includeDrafts, set: setIncludeDrafts },
  ];
  const selectedCount = options.filter((o) => o.checked).length;

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Record" title="Export" description="Download the incident record as one file to send to your insurer or lawyer. Choose which sections to include." />

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
            {selectedCount} of {options.length} selected
          </span>
          <Button variant="primary" onClick={handleExport} disabled={selectedCount === 0}>
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </Card>
    </div>
  );
};
