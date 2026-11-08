import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { useAppState } from '../lib/useAppState';
import { useChecklist, checklistKey } from '../lib/checklist';
import { CARD_FOR_ROLE, ROLE_GUIDANCE_CARDS } from '../lib/demoData';
import { DoLine } from './NextAction';
import { Card, cx } from './ui';

/** The signed-in person's checklist for the active incident. Other roles are one click away. */
export const RoleChecklist: React.FC = () => {
  const { currentUser } = useAuth();
  const incidentId = useAppState((s) => s.incident.id);
  const [done, toggle] = useChecklist();
  const [showOthers, setShowOthers] = useState(false);
  const myIdx = CARD_FOR_ROLE[currentUser.role] ?? 0;
  const order = [myIdx, ...(showOthers ? ROLE_GUIDANCE_CARDS.map((_, i) => i).filter((i) => i !== myIdx) : [])];

  const tick = (idx: number, s: number, step: string) => {
    const key = checklistKey(incidentId, idx, s);
    if (!done[key]) store.recordAuditLog(currentUser.name, 'TASK_COMPLETED', `Completed checklist item: ${step}`);
    toggle(key);
  };

  return (
    <div className="space-y-6">
      {order.map((idx) => {
        const card = ROLE_GUIDANCE_CARDS[idx];
        const mine = idx === myIdx;
        const count = card.plainSteps.filter((_, s) => done[checklistKey(incidentId, idx, s)]).length;
        return (
          <Card
            key={card.role}
            nested={!mine}
            kind="list"
            title={mine ? 'Your checklist' : `${card.role} checklist`}
            description={card.primaryAction}
            actions={
              <span className={cx('font-mono text-[13px] tabular-nums', count === card.plainSteps.length ? 'text-fg' : 'text-fg-subtle')}>
                {count}/{card.plainSteps.length} done
              </span>
            }
          >
            <ol className="divide-y divide-line border-y border-line">
              {card.plainSteps.map((step, s) => {
                const isDone = !!done[checklistKey(incidentId, idx, s)];
                return (
                  <li key={s}>
                    <label className="flex cursor-pointer items-center gap-4 py-3 select-none hover:bg-surface">
                      <input type="checkbox" checked={isDone} onChange={() => tick(idx, s, step)} className="h-5 w-5 shrink-0" />
                      <span className="w-4 shrink-0 font-mono text-[13px] text-fg-subtle">{s + 1}</span>
                      <span className={cx('text-[15px]', isDone ? 'text-fg-subtle line-through' : 'text-fg')}>{step}</span>
                    </label>
                  </li>
                );
              })}
            </ol>
            <DoLine dont className="mt-3">
              {card.doNotDoThis}
            </DoLine>
          </Card>
        );
      })}
      <button type="button" onClick={() => setShowOthers((v) => !v)} className="text-[13px] font-semibold text-fg-muted hover:text-fg">
        {showOthers ? 'Hide other roles' : "Show other roles' checklists"}
      </button>
    </div>
  );
};
