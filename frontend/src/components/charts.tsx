import React from 'react';
import { Tone, cx } from './ui';

/* Small, dependency-free charts. Colors come only from the palette tokens. */

const fillFor: Record<Tone, string> = {
  neutral: 'bg-fg-subtle',
  accent: 'bg-accent',
  drill: 'bg-drill',
  breach: 'bg-breach',
};

/** One horizontal bar split into parts of a whole, with a legend underneath. */
export const StackedBar: React.FC<{
  segments: { label: string; value: number; tone?: Tone; className?: string }[];
  ariaLabel: string;
}> = ({ segments, ariaLabel }) => {
  const total = segments.reduce((n, s) => n + s.value, 0);
  return (
    <div>
      <div
        role="img"
        aria-label={`${ariaLabel}: ${segments.map((s) => `${s.label} ${s.value}`).join(', ')}`}
        className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-bg"
      >
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <div key={s.label} className={cx('h-full first:rounded-l-full last:rounded-r-full', s.className ?? fillFor[s.tone ?? 'neutral'])} style={{ width: `${(s.value / total) * 100}%` }} />
            ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-xs">
            <span className={cx('h-2 w-2 shrink-0 rounded-sm', s.className ?? fillFor[s.tone ?? 'neutral'])} aria-hidden="true" />
            <span className="truncate text-fg-muted">{s.label}</span>
            <span className="ml-auto font-mono text-fg tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Labeled horizontal bars, one row per item (e.g. task progress per role). */
export const BarList: React.FC<{
  rows: { label: React.ReactNode; value: number; max: number; tone?: Tone; right?: React.ReactNode }[];
}> = ({ rows }) => (
  <ul className="space-y-3">
    {rows.map((r, i) => {
      const pct = r.max > 0 ? Math.min(100, (r.value / r.max) * 100) : 0;
      return (
        <li key={i}>
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-fg-muted">{r.label}</span>
            <span className="shrink-0 font-mono text-xs text-fg tabular-nums">{r.right ?? `${r.value}/${r.max}`}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div className={cx('h-full rounded-full transition-[width] duration-500', fillFor[r.tone ?? 'accent'])} style={{ width: `${pct}%` }} />
          </div>
        </li>
      );
    })}
  </ul>
);

/** Tiny column chart of counts over time buckets. */
export const ActivityBars: React.FC<{
  buckets: { label: string; value: number }[];
  ariaLabel: string;
  tone?: Tone;
}> = ({ buckets, ariaLabel, tone = 'accent' }) => {
  const max = Math.max(1, ...buckets.map((b) => b.value));
  return (
    <div>
      <div role="img" aria-label={`${ariaLabel}: ${buckets.map((b) => `${b.label} ${b.value}`).join(', ')}`} className="flex h-16 items-end gap-1">
        {buckets.map((b, i) => (
          <div key={i} className="group relative flex h-full flex-1 items-end" title={`${b.label}: ${b.value}`}>
            <div
              className={cx('w-full rounded-sm transition-[height] duration-500', b.value > 0 ? fillFor[tone] : 'bg-surface-3')}
              style={{ height: b.value > 0 ? `${Math.max(8, (b.value / max) * 100)}%` : '3px' }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10.5px] text-fg-subtle">
        <span>{buckets[0]?.label}</span>
        <span>{buckets[buckets.length - 1]?.label}</span>
      </div>
    </div>
  );
};
