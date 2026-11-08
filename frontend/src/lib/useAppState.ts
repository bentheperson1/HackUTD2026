import { useEffect, useState } from 'react';
import { store, AppState } from './store';

/** Subscribe a component to one slice of the local store. Re-renders when the store changes. */
export function useAppState<T>(select: (s: AppState) => T): T {
  const [value, setValue] = useState<T>(() => select(store.getState()));
  useEffect(() => {
    setValue(select(store.getState()));
    return store.subscribe((s) => setValue(select(s)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

/** Re-renders every `ms` milliseconds. Used for live timers. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
