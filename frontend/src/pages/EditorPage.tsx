import React, { useState, useEffect } from 'react';
import { useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import { useAuth } from '../lib/authContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';
import { Check, Save } from 'lucide-react';

export const EditorPage: React.FC = () => {
  const { activeIncident } = useAuth();
  const [templates] = useTable(tables.docTemplate);
  const [documents] = useTable(tables.incidentDocument);
  const [pickedTemplateId, setSelectedTemplateId] = useState<string>('');
  const selectedTemplateId = pickedTemplateId || templates[0]?.id || '';
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const currentTpl = templates.find((t) => t.id === selectedTemplateId);
    const existingDraft = documents.find(
      (d) => d.incidentId === activeIncident?.id && d.templateId === selectedTemplateId
    );

    if (currentTpl) setDraftTitle(`${currentTpl.name} - Draft`);
    if (existingDraft) {
      setDraftContent(existingDraft.body);
    } else if (currentTpl) {
      setDraftContent(currentTpl.body);
    }
  }, [selectedTemplateId, templates, documents, activeIncident?.id]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: needs a SaveDocument reducer in the backend (incident_document table exists, no way to write it yet)
    setStatusMessage("Saving isn't wired up yet. The backend has no reducer for incident documents.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insurance & legal drafts"
        description="Start from a template for your insurer, outside counsel or a state regulator, then edit and save."
      />

      {statusMessage && <Notice>{statusMessage}</Notice>}
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
          <Field label="Title">
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="w-full type-title-medium"
            />
          </Field>

          <Field label="Body">
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              rows={18}
              className="w-full font-mono leading-relaxed"
            />
          </Field>

          <Button type="submit" icon={<Save />}>
            Save draft
          </Button>
        </form>
      </Card>
    </div>
  );
};
