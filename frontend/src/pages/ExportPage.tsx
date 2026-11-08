import React, { useState } from 'react';
import { useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import { useAuth } from '../lib/authContext';
import { jsonReplacer } from '../lib/live';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';
import { Download } from 'lucide-react';

export const ExportPage: React.FC = () => {
  const [includeTimeline, setIncludeTimeline] = useState(true);
  const [includeScope, setIncludeScope] = useState(true);
  const [includeAuditLogs, setIncludeAuditLogs] = useState(true);
  const [includeDrafts, setIncludeDrafts] = useState(true);
  const [includeRoster, setIncludeRoster] = useState(true);
  const [exportNotice, setExportNotice] = useState('');
  const { activeIncident } = useAuth();
  const [users] = useTable(tables.user);
  const [members] = useTable(tables.incidentMember);
  // message is private; these views only return what the signed-in user may see
  const [adminMessages] = useTable(tables.adminMessages);
  const [incidentMessages] = useTable(tables.incidentMessages);
  const [generalMessages] = useTable(tables.generalMessages);
  const [scopeItems] = useTable(tables.scopeItem);
  const [timeline] = useTable(tables.timelineEntry);
  const [documents] = useTable(tables.incidentDocument);

  const handleExport = () => {
    if (!activeIncident) return;
    const id = activeIncident.id;
    const roster = members
      .filter((m) => m.incidentId === id)
      .map((m) => ({ ...m, user: users.find((u) => u.id.isEqual(m.person)) }));
    const packet = {
      title: 'Drill Night Crisis Command Center - Formal Incident Package',
      generated_at: new Date().toISOString(),
      incident: activeIncident,
      contents: {
        ...(includeRoster ? { roster } : {}),
        ...(includeTimeline ? {
              warroom_messages: [...adminMessages, ...incidentMessages, ...generalMessages]
                .filter((m) => m.incidentId === id)
                .sort((a, b) => Number(a.sentAt.microsSinceUnixEpoch - b.sentAt.microsSinceUnixEpoch)),
            } : {}),
        ...(includeScope ? { scope_records: scopeItems.filter((s) => s.incidentId === id) } : {}),
        ...(includeAuditLogs ? { timeline: timeline.filter((t) => t.incidentId === id) } : {}),
        ...(includeDrafts ? { documents: documents.filter((d) => d.incidentId === id) } : {}),
      },
    };

    const blob = new Blob([JSON.stringify(packet, jsonReplacer, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-dossier-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setExportNotice(`Downloaded ${a.download}`);
  };

  const sections = [
    { label: 'Team roster', detail: 'Everyone with access and their roles', checked: includeRoster, set: setIncludeRoster },
    { label: 'War room messages', detail: 'All messages, in order', checked: includeTimeline, set: setIncludeTimeline },
    { label: 'Affected data', detail: 'Inventory and status of each item', checked: includeScope, set: setIncludeScope },
    { label: 'Timeline', detail: 'Every recorded action with actor and time', checked: includeAuditLogs, set: setIncludeAuditLogs },
    { label: 'Incident documents', detail: 'Insurance and legal drafts', checked: includeDrafts, set: setIncludeDrafts },
  ];
  const nothingSelected = sections.every((s) => !s.checked);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Export package"
        description="Bundle the incident record into a single JSON file to hand to counsel or your insurer."
      />

      {exportNotice && <Notice tone="success">{exportNotice}</Notice>}

      <Card variant="outlined" className="overflow-hidden">
        <div className="px-4 pb-1 pt-4 type-title-small text-on-surface-variant">Include</div>
        <ul className="m-0 list-none p-0">
          {sections.map((s) => (
            <li key={s.label}>
              <label className="state-layer flex cursor-pointer items-center gap-4 px-4 py-3">
                <input type="checkbox" checked={s.checked} onChange={(e) => s.set(e.target.checked)} />
                <div>
                  <div className="type-body-large">{s.label}</div>
                  <div className="type-body-small text-on-surface-variant">{s.detail}</div>
                </div>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex justify-end border-t border-outline-variant p-4">
          <Button icon={<Download />} onClick={handleExport} disabled={nothingSelected || !activeIncident}>
            Download JSON
          </Button>
        </div>
      </Card>
    </div>
  );
};
