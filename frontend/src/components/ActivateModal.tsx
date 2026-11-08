import React, { useState } from 'react';
import { Siren } from 'lucide-react';
import { store } from '../lib/store';
import { Field } from './Field';
import { Button, Modal, cx } from './ui';

const SEVERITY = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'High' },
  { value: 4, label: 'Critical' },
];

/** Shared "Activate an incident" dialog. The server needs a name and a severity (1-4). */
export const ActivateModal: React.FC<{ actor: string; rosterSize: number; onClose: () => void; onDone?: (ok: boolean, error?: string) => void }> = ({
  actor,
  rosterSize,
  onClose,
  onDone,
}) => {
  const [name, setName] = useState('Ransomware on front-desk PCs');
  const [severity, setSeverity] = useState(4);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const res = store.setIncidentStatus(actor, 'active', { name: name.trim(), severity });
    onDone?.(res.success, res.error);
    onClose();
  };

  return (
    <Modal
      title="Activate an incident?"
      description={`This alerts all ${rosterSize} people on your team and opens the incident chat.`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="What's happening?" htmlFor="inc-name">
          <input id="inc-name" className="w-full" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <div>
          <span className="text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase">Severity</span>
          <div className="mt-1.5 grid grid-cols-4 border border-line-strong" role="radiogroup" aria-label="Severity">
            {SEVERITY.map((s) => (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={severity === s.value}
                onClick={() => setSeverity(s.value)}
                className={cx(
                  'h-9 border-r border-line-strong text-[13px] last:border-r-0',
                  severity === s.value ? (s.value === 4 ? 'bg-breach text-white' : 'bg-surface-3 font-semibold text-fg') : 'text-fg-muted hover:bg-surface'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={!name.trim()}>
            <Siren className="h-4 w-4" />
            Activate now
          </Button>
        </div>
      </form>
    </Modal>
  );
};
