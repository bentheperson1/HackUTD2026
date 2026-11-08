import React from 'react';

type ChipTone = 'neutral' | 'primary' | 'error' | 'success';

interface ChipProps {
  tone?: ChipTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

const TONES: Record<ChipTone, string> = {
  neutral: 'border border-outline-variant text-on-surface-variant',
  primary: 'bg-primary-container text-on-primary-container',
  error: 'bg-error-container text-on-error-container',
  success: 'bg-tertiary-container text-on-tertiary-container',
};

/** Non-interactive status chip. */
export const Chip: React.FC<ChipProps> = ({ tone = 'neutral', icon, children, className = '', title }) => (
  <span
    title={title}
    className={`inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 type-label-medium [&>svg]:h-4 [&>svg]:w-4 ${TONES[tone]} ${className}`}
  >
    {icon}
    {children}
  </span>
);
