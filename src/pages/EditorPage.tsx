import React, { useState, useEffect } from 'react';
import { store } from '../lib/store';
import { ReportTemplate, ReportDraft } from '../lib/types';
import { Field } from '../components/Field';

export const EditorPage: React.FC = () => {
  const [templates] = useState<ReportTemplate[]>(store.getState().reportTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const currentTpl = templates.find((t) => t.id === selectedTemplateId);
    const existingDraft = store.getState().reportDrafts.find((d) => d.template_id === selectedTemplateId);

    if (existingDraft) {
      setDraftTitle(existingDraft.title);
      setDraftContent(existingDraft.content);
    } else if (currentTpl) {
      setDraftTitle(`${currentTpl.name} - Draft`);
      setDraftContent(currentTpl.content);
    }
  }, [selectedTemplateId, templates]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const res = store.saveDraft(selectedTemplateId, draftTitle, draftContent);
    if (res.success) {
      setStatusMessage('Report draft saved successfully at ' + new Date().toLocaleTimeString());
    }
  };

  return (
    <div>
      <h3>Formal Documentation &amp; Report Draft Editor</h3>
      <p>
        Standardized communication templates for cyber underwriters, outside legal counsel, and state regulators.
      </p>

      {statusMessage && <div style={{ color: 'green', fontWeight: 'bold', marginBottom: '10px' }}>{statusMessage}</div>}

      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => setSelectedTemplateId(tpl.id)}
            style={{
              padding: '8px 12px',
              backgroundColor: selectedTemplateId === tpl.id ? '#000' : '#eee',
              color: selectedTemplateId === tpl.id ? '#fff' : '#000',
              fontWeight: selectedTemplateId === tpl.id ? 'bold' : 'normal',
              border: '1px solid black',
              cursor: 'pointer',
            }}
          >
            {tpl.name}
          </button>
        ))}
      </div>

      <fieldset style={{ padding: '16px' }}>
        <legend><strong>Draft Workspace</strong></legend>
        <form onSubmit={handleSave}>
          <Field label="Document Title">
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              style={{ width: '100%', padding: '6px', fontSize: '1em' }}
            />
          </Field>

          <Field label="Draft Body Content">
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              rows={16}
              style={{
                width: '100%',
                padding: '10px',
                fontFamily: 'monospace',
                fontSize: '0.95em',
                lineHeight: '1.4',
              }}
            />
          </Field>

          <button type="submit" style={{ padding: '10px 20px', fontWeight: 'bold' }}>
            Save Draft to Store
          </button>
        </form>
      </fieldset>
    </div>
  );
};
