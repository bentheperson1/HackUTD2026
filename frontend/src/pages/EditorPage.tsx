import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { store } from '../lib/store';
import { useAppState } from '../lib/useAppState';
import { ReportTemplate } from '../lib/types';
import { Field } from '../components/Field';
import { Alert, Badge, Button, Card, PageHeader, cx } from '../components/ui';

const TARGET_LABEL: Record<ReportTemplate['target'], string> = {
  insurer: 'Insurer',
  lawyer: 'Outside counsel',
  regulator: 'Regulator',
};

export const EditorPage: React.FC = () => {
  // Live: templates can arrive a moment after the page opens, so read them reactively
  const templates = useAppState((s) => s.reportTemplates);
  const templatesKey = templates.map((t) => t.id).join('|');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');
  useEffect(() => {
    if (!selectedTemplateId && templates[0]) setSelectedTemplateId(templates[0].id);
  }, [templatesKey]); // eslint-disable-line react-hooks/exhaustive-deps
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
    setStatusMessage('');
    // Only reload the text when you pick a different template (not on every live update)
  }, [selectedTemplateId, templatesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const res = store.saveDraft(selectedTemplateId, draftTitle, draftContent);
    if (res.success) setStatusMessage('Draft saved at ' + new Date().toLocaleTimeString());
  };

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Record" title="Reports" description="Ready-made formats for the insurer, outside counsel and state regulators." />

      <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12">
        <div className="space-y-2 lg:col-span-4">
          <div className="text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase">Templates</div>
          <ul className="border-t border-line-strong">
            {templates.map((tpl) => {
              const active = selectedTemplateId === tpl.id;
              return (
                <li key={tpl.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    aria-pressed={active}
                    className={cx(
                      'w-full border-b border-line py-3.5 text-left transition-colors',
                      active ? 'shadow-[inset_3px_0_0_var(--color-accent)] pl-4' : 'pl-4 hover:bg-surface'
                    )}
                  >
                    <Badge tone={active ? 'accent' : 'neutral'}>{TARGET_LABEL[tpl.target]}</Badge>
                    <div className={cx('mt-1.5 text-[14px]', active ? 'font-semibold text-fg' : 'text-fg-muted')}>{tpl.name}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <Card kind="text" title={draftTitle || 'Draft'} className="lg:col-span-8">
          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Title" htmlFor="draft-title">
              <input id="draft-title" type="text" value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} className="font-medium" />
            </Field>
            <Field label="Body" htmlFor="draft-body">
              <textarea id="draft-body" value={draftContent} onChange={(e) => setDraftContent(e.target.value)} rows={18} className="font-mono text-[13px] leading-relaxed" />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="primary">
                <Save className="h-4 w-4" />
                Save draft
              </Button>
              {statusMessage && <span className="text-xs text-fg-subtle">{statusMessage}</span>}
            </div>
          </form>
        </Card>
      </div>

      <Alert tone="info">Placeholders in brackets, like [DISCOVERY_TIME], still need to be filled in before sending.</Alert>
    </div>
  );
};
