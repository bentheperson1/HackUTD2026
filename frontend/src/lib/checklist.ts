import { useSyncExternalStore } from 'react';

/**
 * Which role-checklist steps are ticked, shared by every component on the page
 * (the "Do this now" bar and the checklist itself) and remembered in this browser.
 * Keys look like `${incidentId}:${cardIndex}:${stepIndex}`, so a new incident starts clean.
 */
const KEY = 'fifth_edge_checklist';
type Done = Record<string, boolean>;

const load = (): Done => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Done;
  } catch {
    return {};
  }
};

let done: Done = load();
const subs = new Set<() => void>();

const toggle = (key: string) => {
  done = { ...done, [key]: !done[key] };
  try {
    localStorage.setItem(KEY, JSON.stringify(done));
  } catch {
    /* storage unavailable: keep it in memory only */
  }
  subs.forEach((f) => f());
};

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};

export const checklistKey = (incidentId: string, card: number, step: number) => `${incidentId}:${card}:${step}`;

export function useChecklist(): [Done, (key: string) => void] {
  return [useSyncExternalStore(subscribe, () => done), toggle];
}
