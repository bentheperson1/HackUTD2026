import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePersisted } from '../lib/usePersisted';
import { Card, IconButton, cx } from './ui';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Default monthly slot: the first Thursday of the month. */
const firstThursday = (year: number, month: number) => {
  const d = new Date(year, month, 1);
  while (d.getDay() !== 4) d.setDate(d.getDate() + 1);
  return d;
};

/**
 * Month calendar for scheduling the monthly Drill Night.
 * Click a day to set that month's drill. Choices are remembered in this browser.
 */
export const DrillCalendar: React.FC = () => {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [scheduled, setScheduled] = usePersisted<Record<string, string>>('drill_night_schedule', {});

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthKey = `${year}-${month}`;
  const drillDayKey = scheduled[monthKey] ?? toKey(firstThursday(year, month));

  // Build a Monday-first grid
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))];
  while (cells.length % 7) cells.push(null);

  const drillDate = new Date(drillDayKey + 'T19:00:00');
  const isPast = drillDate.getTime() < new Date(toKey(today) + 'T00:00:00').getTime();
  const monthLabel = cursor.toLocaleDateString([], { month: 'long', year: 'numeric' });

  return (
    <Card
      kind="timeline"
      kindTone="drill"
      title="Schedule"
      description="Drill Night happens once a month. Click a day to set this month's date."
      actions={
        <div className="flex items-center gap-0.5">
          <IconButton label="Previous month" onClick={() => setCursor(new Date(year, month - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <span className="w-32 text-center text-[13px] text-fg">{monthLabel}</span>
          <IconButton label="Next month" onClick={() => setCursor(new Date(year, month + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_220px]">
        <div>
          <div className="grid grid-cols-7 gap-1 pb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} className="h-9" />;
              const key = toKey(d);
              const isDrill = key === drillDayKey;
              const isToday = key === toKey(today);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setScheduled({ ...scheduled, [monthKey]: key })}
                  aria-pressed={isDrill}
                  aria-label={`${d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}${isDrill ? ', Drill Night' : ''}`}
                  className={cx(
                    'h-9 rounded-md text-[13px] tabular-nums transition-colors',
                    isDrill ? 'bg-drill font-semibold text-bg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                    isToday && !isDrill && 'shadow-[inset_0_0_0_1px_var(--color-accent)] text-fg'
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 bg-surface p-4">
          <div className="text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase">{isPast ? 'Last drill' : 'Next drill'}</div>
          <div>
            <div className="text-[15px] font-semibold text-fg">{drillDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</div>
            <div className="font-mono text-xs text-fg-muted">7:00 PM</div>
          </div>
        </div>
      </div>
    </Card>
  );
};
