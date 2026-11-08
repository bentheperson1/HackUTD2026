import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FilePlus2, FileText, Plus, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { useAppState } from '../lib/useAppState';
import { ReportDraft, ReportTemplate } from '../lib/types';
import { Field } from '../components/Field';
import { Alert, Badge, Button, Card, EmptyState, Modal, PageHeader, cx } from '../components/ui';

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

const timeLabel = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

type Confirm = { title: string; description: string; confirmLabel: string; onConfirm: () => void } | null;

export const EditorPage: React.FC = () => {
  const { currentUser } = useAuth();
  const templates = useAppState((s) => s.reportTemplates);
  const docs = useAppState((s) => s.reportDrafts);
  const isOwner = currentUser.role === 'owner';

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTemplateId, setNewTemplateId] = useState('');

  // Live mode: a created document arrives through the subscription a moment later, so remember
  // which ids existed and select the first new one that shows up.
  const awaitingNew = useRef<Set<string> | null>(null);

  const selected = useMemo(() => docs.find((d) => d.id === selectedId) ?? null, [docs, selectedId]);
  const dirty = !!selected && (title !== selected.title || body !== selected.content);
  const templateName = (id: string) => templates.find((t) => t.id === id)?.name;

  // Pick something to show, follow newly created docs, and drop a selection that was deleted
  useEffect(() => {
    if (awaitingNew.current) {
      const fresh = docs.find((d) => !awaitingNew.current!.has(d.id));
      if (fresh) {
        awaitingNew.current = null;
        setSelectedId(fresh.id);
        return;
      }
    }
    if (selectedId && !docs.some((d) => d.id === selectedId)) setSelectedId(docs[0]?.id ?? null);
    else if (!selectedId && docs[0]) setSelectedId(docs[0].id);
  }, [docs, selectedId]);

  // Load the selected document into the editor. Refresh it when someone else saves, unless you have unsaved edits.
  const loadedId = useRef<string | null>(null);
  useEffect(() => {
    if (!selected) {
      loadedId.current = null;
      setTitle('');
      setBody('');
      return;
    }
    if (loadedId.current !== selected.id || !dirty) {
      loadedId.current = selected.id;
      setTitle(selected.title);
      setBody(selected.content);
    }
  }, [selected?.id, selected?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardUnsaved = (action: () => void) => {
    if (!dirty) return action();
    setConfirm({
      title: 'Discard unsaved changes?',
      description: `Your edits to "${selected?.title}" haven't been saved.`,
      confirmLabel: 'Discard changes',
      onConfirm: action,
    });
  };

  const selectDoc = (id: string) => {
    if (id === selectedId) return;
    guardUnsaved(() => {
      setSelectedId(id);
      setSavedAt(null);
      setError(null);
    });
  };

  const createDoc = (templateId: string, docTitle: string) => {
    setError(null);
    const tpl = templates.find((t) => t.id === templateId);
    awaitingNew.current = new Set(docs.map((d) => d.id));
    const res = store.createDraft(templateId, docTitle, tpl?.content ?? '');
    if (!res.success) {
      awaitingNew.current = null;
      setError(res.error || 'Could not create the document.');
      return false;
    }
    if (typeof res.result === 'string') {
      awaitingNew.current = null;
      setSelectedId(res.result);
    }
    setSavedAt(null);
    return true;
  };

  const openNewModal = (templateId = '') => {
    guardUnsaved(() => {
      const tpl = templates.find((t) => t.id === templateId);
      setNewTemplateId(templateId);
      setNewTitle(tpl ? tpl.name : '');
      setIsNewOpen(true);
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    if (createDoc(newTemplateId, newTitle.trim())) setIsNewOpen(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    if (!title.trim()) {
      setError('Give the document a title before saving.');
      return;
    }
    const res = store.updateDraft(selected.id, title, body);
    if (res.success) setSavedAt(new Date().toISOString());
    else setError(res.error || 'Could not save the document.');
  };

  const handleDelete = () => {
    if (!selected) return;
    const doc = selected;
    setConfirm({
      title: 'Delete this document?',
      description: `"${doc.title}" will be removed for everyone. This can't be undone.`,
      confirmLabel: 'Delete document',
      onConfirm: () => {
        const res = store.deleteDraft(doc.id);
        if (!res.success) setError(res.error || 'Could not delete the document.');
        else setSavedAt(null);
      },
    });
  };

  const missingStandard = STANDARD_TEMPLATES.filter((t) => !templates.find((x) => x.id === t.id));

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Record"
        title="Reports"
        description="Letters and reports for your insurer, your lawyer, regulators and staff. Start one from a template or from scratch, then edit, save or delete it."
        actions={
          <Button variant="primary" onClick={() => openNewModal()}>
            <FilePlus2 className="h-4 w-4" />
            New document
          </Button>
        }
      />

      {error && (
        <Alert tone="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12">
        {/* Left: documents + templates */}
        <div className="space-y-8 lg:col-span-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase">Documents · {docs.length}</div>
            </div>
            {docs.length === 0 ? (
              <div className="border-t border-line-strong">
                <EmptyState
                  title="No documents yet"
                  description="Create one from scratch or pick a template below."
                  action={
                    <Button size="sm" onClick={() => openNewModal()}>
                      <Plus className="h-3.5 w-3.5" />
                      New document
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="max-h-[420px] overflow-y-auto border-t border-line-strong">
                {docs.map((d: ReportDraft) => {
                  const active = d.id === selectedId;
                  const from = d.template_id ? templateName(d.template_id) : null;
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => selectDoc(d.id)}
                        aria-pressed={active}
                        className={cx(
                          'w-full border-b border-line py-3 pr-3 pl-4 text-left transition-colors',
                          active ? 'bg-surface shadow-[inset_3px_0_0_var(--color-accent)]' : 'hover:bg-surface'
                        )}
                      >
                        <div className={cx('truncate text-[14px]', active ? 'font-semibold text-fg' : 'text-fg-muted')}>
                          {active && dirty ? '• ' : ''}
                          {d.title}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-fg-subtle">
                          <span>{from ?? 'Blank'}</span>
                          <span aria-hidden="true">·</span>
                          <span>Edited {timeLabel(d.updated_at)}</span>
                          {d.author && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{d.author}</span>
                            </>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase">Start from a template</div>
            {templates.length === 0 ? (
              <p className="border-t border-line-strong pt-3 text-[13px] text-fg-subtle">No templates yet.</p>
            ) : (
              <ul className="border-t border-line-strong">
                {templates.map((tpl) => (
                  <li key={tpl.id} className="flex items-center gap-3 border-b border-line py-3 pl-4">
                    <div className="min-w-0 flex-1">
                      <Badge tone="neutral">{TARGET_LABEL[tpl.target]}</Badge>
                      <div className="mt-1 truncate text-[14px] text-fg-muted">{tpl.name}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => openNewModal(tpl.id)} aria-label={`New document from ${tpl.name}`}>
                      <Plus className="h-3.5 w-3.5" />
                      Use
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {isOwner && missingStandard.length > 0 && (
              <div className="pt-2">
                <Button size="sm" variant="secondary" onClick={() => missingStandard.forEach((t) => store.saveTemplate(t.id, t.name, t.description, t.body))}>
                  <Plus className="h-3.5 w-3.5" />
                  Add standard letters
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right: editor */}
        <div className="lg:col-span-8">
          {!selected ? (
            <Card kind="text" title="Editor">
              <EmptyState
                icon={<FileText className="h-6 w-6" />}
                title={docs.length ? 'Select a document to edit' : 'Nothing to edit yet'}
                description="Documents you create show up on the left."
                action={
                  <Button variant="primary" onClick={() => openNewModal()}>
                    <FilePlus2 className="h-4 w-4" />
                    New document
                  </Button>
                }
              />
            </Card>
          ) : (
            <Card
              kind="text"
              title={selected.title}
              actions={
                selected.can_delete !== false && (
                  <Button size="sm" variant="ghost" onClick={handleDelete} className="text-breach-text hover:text-breach-text">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                )
              }
            >
              <form onSubmit={handleSave} className="space-y-4">
                <Field label="Title" htmlFor="doc-title">
                  <input id="doc-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="font-medium" maxLength={200} />
                </Field>
                <Field label="Body" htmlFor="doc-body">
                  <textarea id="doc-body" value={body} onChange={(e) => setBody(e.target.value)} rows={18} className="font-mono text-[13px] leading-relaxed" />
                </Field>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" variant="primary" disabled={!dirty}>
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  {dirty && (
                    <Button variant="ghost" onClick={() => { setTitle(selected.title); setBody(selected.content); }}>
                      Revert
                    </Button>
                  )}
                  <span className="text-xs text-fg-subtle">
                    {dirty ? 'Unsaved changes' : savedAt ? `Saved ${timeLabel(savedAt)}` : `Last edited ${timeLabel(selected.updated_at)}`}
                  </span>
                </div>
              </form>
            </Card>
          )}
        </div>
      </div>

      <Alert tone="info">Replace everything in [BRACKETS] with your own details before you send a letter.</Alert>

      {isNewOpen && (
        <Modal title="New document" description="Start blank or from one of your templates. You can change everything afterwards." onClose={() => setIsNewOpen(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Start from" htmlFor="new-template">
              <select
                id="new-template"
                value={newTemplateId}
                onChange={(e) => {
                  const id = e.target.value;
                  const prevDefault = templateName(newTemplateId) ?? '';
                  setNewTemplateId(id);
                  // Keep a custom title; otherwise follow the template's name
                  if (!newTitle.trim() || newTitle === prevDefault) setNewTitle(templateName(id) ?? '');
                }}
              >
                <option value="">Blank document</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title" htmlFor="new-title">
              <input id="new-title" type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Notice to Texas AG" maxLength={200} autoFocus />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsNewOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={!newTitle.trim()}>
                <FilePlus2 className="h-4 w-4" />
                Create document
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <Modal title={confirm.title} description={confirm.description} onClose={() => setConfirm(null)}>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const run = confirm.onConfirm;
                setConfirm(null);
                run();
              }}
            >
              {confirm.confirmLabel}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
