import React, { useState, useEffect } from 'react';
import { useReducer, useTable } from 'spacetimedb/react';
import { reducers, tables } from '../module_bindings';
import { useAuth } from '../lib/authContext';
import { errorMessage, isIncidentOpen, toDate } from '../lib/live';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';
import { Check, Save } from 'lucide-react';

// Matches CanEditDocs in Helpers.cs
const CAN_EDIT_DOCS = ['Owner', 'ItLead', 'Legal', 'Comms', 'Counsel'];

export const EditorPage: React.FC = () => {
  const { activeIncident, incidentRole } = useAuth();
  const [templates] = useTable(tables.docTemplate);
  const [documents] = useTable(tables.incidentDocument);
  const saveDocument = useReducer(reducers.saveDocument);
  const [pickedTemplateId, setSelectedTemplateId] = useState<string>('');
  const selectedTemplateId = pickedTemplateId || templates[0]?.id || '';
  const [draftContent, setDraftContent] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const currentTpl = templates.find((t) => t.id === selectedTemplateId);
  const savedDoc = documents.find((d) => d.incidentId === activeIncident?.id && d.templateId === selectedTemplateId);
  const canEdit =
    !!activeIncident && isIncidentOpen(activeIncident.status) && !!incidentRole && CAN_EDIT_DOCS.includes(incidentRole);

  // Load the saved document for this incident, or the template text if nothing is saved yet.
  // Only reruns when switching template/incident, so a teammate's save doesn't wipe what you're typing.
  useEffect(() => {
    setDraftContent(savedDoc?.body ?? currentTpl?.body ?? '');
    setStatusMessage('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId, activeIncident?.id, !!currentTpl]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIncident) return;
    setError(null);
    try {
      await saveDocument({ incidentId: activeIncident.id, templateId: selectedTemplateId, body: draftContent });
      setStatusMessage('Draft saved at ' + new Date().toLocaleTimeString());
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insurance & legal drafts"
        description="Start from a template for your insurer, outside counsel or a state regulator, then edit and save."
      />

      {statusMessage && <Notice tone="success">{statusMessage}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {!activeIncident && <Notice>Drafts are saved per incident. You're not part of any incident yet.</Notice>}
      {templates.length === 0 && <Notice>No document templates in the database yet.</Notice>}

      {/* Filter chips for template choice */}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Template">
        {templates.map((tpl) => {
          const selected = selectedTemplateId === tpl.id;
          return (
            <button
              key={tpl.id}
              role="radio"
              aria-checked={selected}
              onClick={() => setSelectedTemplateId(tpl.id)}
              className={`state-layer inline-flex h-8 items-center gap-2 rounded-lg px-3 type-label-large ${
                selected
                  ? 'bg-secondary-container pl-2 text-on-secondary-container'
                  : 'border border-outline-variant text-on-surface-variant'
              }`}
            >
              {selected && <Check className="h-[18px] w-[18px]" />}
              {tpl.name}
            </button>
          );
        })}
      </div>

      <Card className="p-5">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <div className="type-title-medium">{currentTpl?.name}</div>
            {currentTpl?.description && (
              <div className="type-body-small text-on-surface-variant">{currentTpl.description}</div>
            )}
            <div className="mt-1 type-body-small text-on-surface-variant">
              {savedDoc ? `Last saved ${toDate(savedDoc.updatedAt).toLocaleString()}` : 'Not saved yet, showing the template'}
            </div>
          </div>

          <Field label="Body">
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              rows={18}
              className="w-full font-mono leading-relaxed"
              disabled={!canEdit}
            />
          </Field>

          {canEdit && (
            <Button type="submit" icon={<Save />} disabled={!currentTpl}>
              Save draft
            </Button>
          )}
        </form>
      </Card>
    </div>
  );
};
