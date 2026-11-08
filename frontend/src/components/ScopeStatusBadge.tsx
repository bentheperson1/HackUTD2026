import React from 'react';
import { ScopeStatus } from '../lib/types';
import { Badge, Tone } from './ui';

export const SCOPE_STATUS_META: Record<ScopeStatus, { label: string; long: string; tone: Tone }> = {
  exfiltrated: { label: 'Stolen', long: 'Stolen (copied out)', tone: 'breach' },
  locked: { label: 'Locked', long: 'Locked (encrypted)', tone: 'neutral' },
  unknown: { label: 'Not sure yet', long: 'Not sure yet', tone: 'neutral' },
  restored: { label: 'Restored', long: 'Restored', tone: 'accent' },
};

export const ScopeStatusBadge: React.FC<{ status: ScopeStatus }> = ({ status }) => {
  const meta = SCOPE_STATUS_META[status];
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
};

/** Shades for charts. Distinct in lightness, not only hue, using palette tokens only. */
export const SCOPE_SEGMENT_CLASS: Record<ScopeStatus, string> = {
  exfiltrated: 'bg-breach',
  locked: 'bg-fg-muted',
  unknown: 'bg-line-strong',
  restored: 'bg-accent',
};
