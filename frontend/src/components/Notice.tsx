import React from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';

type NoticeTone = 'error' | 'success' | 'warning' | 'info';

interface NoticeProps {
  tone?: NoticeTone;
  title?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const TONES: Record<NoticeTone, { classes: string; icon: React.ReactNode }> = {
  error: { classes: 'bg-error-container text-on-error-container', icon: <AlertCircle /> },
  success: { classes: 'bg-tertiary-container text-on-tertiary-container', icon: <CheckCircle2 /> },
  warning: { classes: 'bg-primary-container text-on-primary-container', icon: <TriangleAlert /> },
  info: { classes: 'bg-surface-container-high text-on-surface-variant', icon: <Info /> },
};

export const Notice: React.FC<NoticeProps> = ({ tone = 'info', title, action, children, className = '' }) => {
  const { classes, icon } = TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex flex-col gap-3 rounded-xl px-4 py-3 sm:flex-row sm:items-center ${classes} ${className}`}
    >
      <div className="flex flex-1 items-start gap-3">
        <span className="mt-0.5 flex shrink-0 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
        <div className="min-w-0 type-body-medium">
          {title && <div className="type-title-small">{title}</div>}
          {children}
        </div>
      </div>
      {action && <div className="shrink-0 sm:ml-auto">{action}</div>}
    </div>
  );
};
