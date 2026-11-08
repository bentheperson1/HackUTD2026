import React, { useState, useEffect } from 'react';
import { Plus, Save } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { useAppState } from '../lib/useAppState';
import { ReportTemplate } from '../lib/types';
import { Field } from '../components/Field';
import { Alert, Badge, Button, Card, PageHeader, cx } from '../components/ui';

const TARGET_LABEL: Record<ReportTemplate['target'], string> = {
  insurer: 'Insurer',
  lawyer: 'Outside counsel',
  regulator: 'Regulator',
  staff: 'Staff',
};

/** Standard formats an owner can add to the shared template library (save_template on the server). */
const STANDARD_TEMPLATES = [
  {
    id: 'insurer-fnol',
    name: 'Cyber insurance first notice of loss',
    description: 'First notice to the cyber insurer',
    body: 'TO: Cyber claims desk\nRE: First notice of loss - Policy #[POLICY_NUMBER]\n\n1. Policyholder: [COMPANY]\n2. Discovered: [DISCOVERY_TIME]\n3. Incident type: Ransomware / possible data theft\n4. What is affected so far: [IMPACT]\n5. Steps taken: affected machines isolated from the network\n6. Response vendor: [VENDOR or "requesting panel vendor"]\n\nContact: [NAME], [PERSONAL PHONE]',
  },
  {
    id: 'counsel-engagement',
    name: 'Outside counsel engagement',
    description: 'Bring in breach counsel and keep the investigation privileged',
    body: 'TO: [LAW FIRM]\nRE: Request for breach counsel - privileged and confidential\n\nWe are responding to a suspected cyber incident discovered at [DISCOVERY_TIME].\nWe ask you to direct the forensic investigation so findings remain privileged.\n\nKnown so far:\n- Systems affected: [SYSTEMS]\n- Data possibly taken: [DATA TYPES]\n- States where affected people live: [STATES]\n\nContact: [NAME], [PERSONAL PHONE]',
  },
  {
    id: 'regulator-notice',
    name: 'State regulator notice',
    description: 'Notice to a state attorney general (confirm with counsel first)',
    body: 'TO: Office of the Attorney General, [STATE]\nRE: Notice of a data security incident\n\n[COMPANY] discovered unauthorized access on [DISCOVERY_TIME].\nPersonal information involved: [DATA TYPES]\nNumber of [STATE] residents affected: [COUNT]\nSteps taken to protect people: [STEPS]\n\nContact: [NAME], [PHONE]\n\nDraft only. Counsel must review before sending.',
  },
];

export const EditorPage: React.FC = () => {
  const { currentUser, mode } = useAuth();
  const isLive = mode === 'live';
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
    if (res.success) setStatusMessage('Saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Record" title="Reports" description="Letter templates for notifying your insurer, your lawyer and state regulators. Pick one, fill in the blanks and save your draft." />

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
          {currentUser.role === 'owner' && STANDARD_TEMPLATES.some((t) => !templates.find((x) => x.id === t.id)) && (
            <div className="pt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => STANDARD_TEMPLATES.filter((t) => !templates.find((x) => x.id === t.id)).forEach((t) => store.saveTemplate(t.id, t.name, t.description, t.body))}
              >
                <Plus className="h-3.5 w-3.5" />
                Add standard letters
              </Button>
            </div>
          )}
        </div>

        <Card kind="text" title={draftTitle || 'Draft'} className="lg:col-span-8">
          <form onSubmit={handleSave} className="space-y-4">
            {!isLive && (
              <Field label="Title" htmlFor="draft-title">
                <input id="draft-title" type="text" value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} className="font-medium" />
              </Field>
            )}
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

      <Alert tone="info">Replace everything in [BRACKETS] with your own details before you send a letter.</Alert>
    </div>
  );
};
