import { useEffect, useState } from 'react';

/** useState that remembers its value in this browser (per-user preferences like hidden widgets). */
export function usePersisted<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable: keep it in memory only */
    }
  }, [key, value]);
  return [value, setValue];
}
