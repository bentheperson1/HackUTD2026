import React, { useState, useEffect } from 'react';
import { store } from '../lib/store';
import { ReportTemplate } from '../lib/types';
import { FileEdit, Save, CheckCircle2 } from 'lucide-react';

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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2 m-0">
            <FileEdit className="w-5 h-5 text-hazard-yellow" />
            <span>Insurance &amp; Counsel Documentation Editor</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 mb-0">
            Standardized templates for cyber underwriters, outside counsel privileged memos, and state regulators.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Template Selector Buttons */}
      <div className="flex gap-2 flex-wrap">
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => setSelectedTemplateId(tpl.id)}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
              selectedTemplateId === tpl.id
                ? 'bg-hazard-yellow text-black shadow-lg shadow-hazard-yellow/20 font-black'
                : 'bg-card text-slate-300 hover:text-white border border-border'
            }`}
          >
            {tpl.name}
          </button>
        ))}
      </div>

      {/* Draft Workspace */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xl">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Document Title
            </label>
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="w-full text-sm font-bold text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Draft Body Content
            </label>
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              rows={16}
              className="w-full font-mono text-xs leading-relaxed text-slate-200"
            />
          </div>

          <button
            type="submit"
            className="min-h-[44px] px-6 bg-hazard-yellow hover:bg-hazard-bright text-black font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-hazard-yellow/20 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Working Draft</span>
          </button>
        </form>
      </div>
    </div>
  );
};
