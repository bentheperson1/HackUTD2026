import React from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Fifth Edge UI primitives.                                         */
/*  Visual language: an incident briefing / control-room board.        */
/*  - No floating boxes: sections sit on the page, split by rules      */
/*  - Numbered section heads in condensed Archivo                      */
/*  - Square corners, square status markers, underline tabs            */
/*  - Mono only for numbers, times and codes                           */
/*  Colors come only from the palette tokens in index.css.             */
/* ------------------------------------------------------------------ */

export const cx = (...parts: unknown[]) => parts.filter((p) => typeof p === 'string' && p).join(' ');

/* Small uppercase label --------------------------------------------- */

export const MonoLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={cx('text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase', className)}>{children}</span>
);
export const Label = MonoLabel;

/* Keyboard hint ----------------------------------------------------- */

export const Kbd: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <kbd className={cx('inline-flex h-5 min-w-5 items-center justify-center border border-line-strong px-1 font-mono text-[10.5px] leading-none text-fg-subtle', className)}>
    {children}
  </kbd>
);

/* Page header ------------------------------------------------------- */

export const PageHeader: React.FC<{
  title: string;
  description?: React.ReactNode;
  eyebrow?: string;
  actions?: React.ReactNode;
}> = ({ title, description, eyebrow, actions }) => (
  <div className="flex flex-col gap-5 pb-2 md:flex-row md:items-end md:justify-between">
    <div className="min-w-0">
      {eyebrow && <Label className="text-accent">{eyebrow}</Label>}
      <h1 className="font-display mt-1 text-[44px] leading-[0.95] font-bold tracking-[-0.01em] text-fg uppercase">{title}</h1>
      {description && <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-fg-muted">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

/* Section (replaces boxed cards) ------------------------------------ */

export type CellKind = 'table' | 'chat' | 'form' | 'metric' | 'text' | 'list' | 'timeline' | 'json' | 'chart' | 'data' | 'people' | 'drill';

/**
 * A numbered section with a ruled header. No box, no background.
 * `kind` is kept for compatibility but no longer renders a tag.
 * `kindTone="drill"` turns the section number amber.
 */
export const Card: React.FC<{
  title?: React.ReactNode;
  description?: React.ReactNode;
  kind?: CellKind;
  kindTone?: 'default' | 'drill';
  actions?: React.ReactNode;
  hoverActions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  padded?: boolean;
  /** Sub-block inside a numbered group: lighter rule, no number */
  nested?: boolean;
}> = ({ title, description, kindTone, actions, hoverActions, children, className, bodyClassName, padded = true, nested }) => (
  <section className={cx('group/sec border-t', nested ? 'border-line' : 'border-line-strong', className)}>
    {(title || actions || hoverActions) && (
      <header className="flex min-h-11 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-3">
        <div className="flex min-w-0 items-baseline gap-3">
          {!nested && <span className={cx('sec-num font-mono text-[11px] tabular-nums', kindTone === 'drill' ? 'text-drill' : 'text-fg-subtle')} aria-hidden="true" />}
          {title && <h2 className={cx('leading-tight font-semibold text-fg', nested ? 'text-[15px]' : 'font-display text-[19px]')}>{title}</h2>}
          {description && <span className="hidden truncate text-[13px] text-fg-subtle sm:inline">{description}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hoverActions && <div className="opacity-0 transition-opacity group-hover/sec:opacity-100 group-focus-within/sec:opacity-100">{hoverActions}</div>}
          {actions}
        </div>
      </header>
    )}
    <div className={cx(padded ? 'pt-4' : 'pt-2', bodyClassName)}>{children}</div>
  </section>
);

/* Inset panel (for the few places that need a filled area) --------- */

export const Panel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cx('bg-surface p-4', className)}>{children}</div>
);

/* Section label ----------------------------------------------------- */

export const SectionLabel: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
  <div className="flex items-baseline justify-between gap-3 border-t border-line-strong pt-3">
    <span className="flex items-baseline gap-3">
      <span className="sec-num font-mono text-[11px] text-fg-subtle tabular-nums" aria-hidden="true" />
      <span className="font-display text-[19px] leading-tight font-semibold text-fg">{children}</span>
    </span>
    {right && <div className="text-[13px] text-fg-subtle">{right}</div>}
  </div>
);

/* Button ------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'drill';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-bg hover:bg-accent-hover',
  secondary: 'border border-line-strong text-fg hover:border-fg-subtle hover:bg-surface',
  ghost: 'text-fg-muted hover:text-fg hover:bg-surface',
  danger: 'bg-breach text-white hover:bg-breach-hover',
  drill: 'bg-drill text-bg hover:bg-drill-hover',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-[13px] gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
};

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; block?: boolean }
>(({ variant = 'secondary', size = 'md', block, className, type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cx(
      'inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40',
      buttonVariants[variant],
      buttonSizes[size],
      block && 'w-full',
      className
    )}
    {...props}
  />
));
Button.displayName = 'Button';

export const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: 'default' | 'danger' }> = ({
  label,
  tone = 'default',
  className,
  children,
  ...props
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={cx(
      'inline-flex h-8 w-8 items-center justify-center transition-colors',
      tone === 'danger' ? 'text-fg-subtle hover:bg-breach-soft hover:text-breach-text' : 'text-fg-subtle hover:bg-surface hover:text-fg',
      className
    )}
    {...props}
  >
    {children}
  </button>
);

/** Text link with a trailing arrow */
export const ArrowLink: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={cx('inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent underline-offset-4 group-hover:underline', className)}>
    {children}
    <span aria-hidden="true">→</span>
  </span>
);

/* Status marker (replaces pill badges) ------------------------------ */

export type Tone = 'neutral' | 'accent' | 'drill' | 'breach';

const markerFill: Record<Tone, string> = {
  neutral: 'bg-fg-subtle',
  accent: 'bg-accent',
  drill: 'bg-drill',
  breach: 'bg-breach',
};
const markerText: Record<Tone, string> = {
  neutral: 'text-fg-muted',
  accent: 'text-accent',
  drill: 'text-drill',
  breach: 'text-breach-text',
};

/**
 * Default: a small square marker + label in the tone color.
 * `mono`: a bordered code tag (state codes, action names).
 */
export const Badge: React.FC<{ tone?: Tone; children: React.ReactNode; dot?: boolean; className?: string; mono?: boolean }> = ({
  tone = 'neutral',
  children,
  className,
  mono,
}) =>
  mono ? (
    <span className={cx('inline-flex h-5 items-center border border-line-strong px-1.5 font-mono text-[11px] whitespace-nowrap text-fg-muted', className)}>
      {children}
    </span>
  ) : (
    <span className={cx('inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap', markerText[tone], className)}>
      <span className={cx('h-[7px] w-[7px] shrink-0', markerFill[tone])} aria-hidden="true" />
      {children}
    </span>
  );

/* Status dot -------------------------------------------------------- */

export const StatusDot: React.FC<{ tone?: Tone | 'off'; pulse?: boolean }> = ({ tone = 'accent', pulse }) => {
  const color = tone === 'off' ? 'bg-fg-subtle' : markerFill[tone];
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden="true">
      {pulse && <span className={cx('absolute inline-flex h-full w-full animate-ping opacity-60', color)} />}
      <span className={cx('relative inline-flex h-2 w-2', color)} />
    </span>
  );
};

/* Filters: underlined text toggles ---------------------------------- */

export const FilterChip: React.FC<{ active?: boolean; onClick?: () => void; children: React.ReactNode; count?: number }> = ({
  active,
  onClick,
  children,
  count,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cx(
      'inline-flex h-8 items-center gap-1.5 border-b-2 px-0.5 text-[13px] transition-colors',
      active ? 'border-accent font-semibold text-fg' : 'border-transparent text-fg-muted hover:text-fg'
    )}
  >
    {children}
    {count !== undefined && <span className="font-mono text-[11px] font-normal text-fg-subtle">{count}</span>}
  </button>
);

export const FilterBar: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line">
    <Label className="mr-1">Show</Label>
    {children}
    {right && <div className="ml-auto pb-1">{right}</div>}
  </div>
);

/* Alert: full-width band -------------------------------------------- */

const alertStyles: Record<'info' | 'success' | 'warning' | 'error', { cls: string; Icon: React.FC<{ className?: string }>; icon: string }> = {
  info: { cls: 'border-line-strong', Icon: Info, icon: 'text-fg-subtle' },
  success: { cls: 'border-accent/50 bg-accent-soft', Icon: CheckCircle2, icon: 'text-accent' },
  warning: { cls: 'border-drill/50 bg-drill-soft', Icon: TriangleAlert, icon: 'text-drill' },
  error: { cls: 'border-breach/60 bg-breach-soft', Icon: AlertCircle, icon: 'text-breach-text' },
};

export const Alert: React.FC<{
  tone?: 'info' | 'success' | 'warning' | 'error';
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
}> = ({ tone = 'info', title, children, action, onDismiss }) => {
  const { cls, Icon, icon } = alertStyles[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('flex items-start gap-3 border-y px-4 py-3 text-[13px]', cls)}>
      <Icon className={cx('mt-0.5 h-4 w-4 shrink-0', icon)} />
      <div className="min-w-0 flex-1">
        {title && <div className="font-semibold text-fg">{title}</div>}
        {children && <div className={cx('text-fg-muted', title && 'mt-0.5')}>{children}</div>}
      </div>
      {action}
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="text-xs font-semibold text-fg-subtle hover:text-fg">
          Dismiss
        </button>
      )}
    </div>
  );
};

/* Figures (no boxes; a ruled row of big condensed numbers) ---------- */

export const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: Tone; mono?: boolean }> = ({
  label,
  value,
  hint,
  tone = 'neutral',
  mono,
}) => {
  const valueColor = tone === 'neutral' ? 'text-fg' : markerText[tone];
  return (
    <div className="min-w-0 bg-bg px-0 py-4 md:px-5 md:first:pl-0">
      <Label>{label}</Label>
      <div className={cx('mt-1.5 truncate leading-none font-bold tabular-nums', mono ? 'font-mono text-[26px] font-medium' : 'font-display text-[46px]', valueColor)}>
        {value}
      </div>
      {hint && <div className="mt-2 truncate text-[13px] text-fg-subtle">{hint}</div>}
    </div>
  );
};

export const StatRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-2 gap-x-6 border-y border-line-strong md:grid-cols-4 md:gap-x-0 md:divide-x md:divide-line">{children}</div>
);

/* Empty state: plain, left-aligned ---------------------------------- */

export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }> = ({ title, description, action }) => (
  <div className="py-8">
    <div className="text-[14px] font-semibold text-fg">{title}</div>
    {description && <p className="mt-1 max-w-md text-[13px] text-fg-subtle">{description}</p>}
    {action && <div className="mt-3">{action}</div>}
  </div>
);

/* Tabs: underline style --------------------------------------------- */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; count?: number; hidden?: boolean }[];
  ariaLabel: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="inline-flex flex-wrap gap-x-5">
      {options
        .filter((o) => !o.hidden)
        .map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(o.value)}
              className={cx(
                'inline-flex h-8 items-center gap-1.5 border-b-2 text-[13px] transition-colors',
                active ? 'border-accent font-semibold text-fg' : 'border-transparent text-fg-muted hover:text-fg'
              )}
            >
              {o.label}
              {o.count !== undefined && <span className="font-mono text-[11px] font-normal text-fg-subtle">{o.count}</span>}
            </button>
          );
        })}
    </div>
  );
}

/* Modal ------------------------------------------------------------- */

export const Modal: React.FC<{ title: string; description?: string; onClose: () => void; children: React.ReactNode }> = ({ title, description, onClose, children }) => {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md border-t-2 border-accent bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-5">
          <h2 className="font-display text-[24px] leading-tight font-bold text-fg uppercase">{title}</h2>
          {description && <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">{description}</p>}
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

/* Helpers ----------------------------------------------------------- */

export const formatClock = (totalSeconds: number) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${String(h).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
};

export const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
