import React from 'react';
import { Role } from '../lib/types';
import { Badge, Tone } from './ui';

export const ROLE_SHORT: Record<Role, string> = {
  owner: 'Owner',
  it_lead: 'IT lead',
  legal: 'Legal',
  comms: 'Comms',
  insurer: 'Insurer',
  outside_counsel: 'Counsel',
};

// Guests (insurer, outside counsel) use cyan: they are the "active legal / insurance connections".
const ROLE_TONE: Record<Role, Tone> = {
  owner: 'neutral',
  it_lead: 'neutral',
  legal: 'neutral',
  comms: 'neutral',
  insurer: 'accent',
  outside_counsel: 'accent',
};

export const RoleBadge: React.FC<{ role: Role }> = ({ role }) => (
  <Badge tone={ROLE_TONE[role] ?? 'neutral'}>{ROLE_SHORT[role] ?? role}</Badge>
);
