import React from 'react';
import { Role } from '../lib/types';
import { ROLES } from '../lib/constants';

interface RoleBadgeProps {
  role: Role;
}

export const roleLabel = (role: Role) => ROLES.find((r) => r.value === role)?.label ?? role;

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => (
  <span className="inline-flex h-5 items-center whitespace-nowrap rounded bg-surface-container-highest px-1.5 type-label-small text-on-surface-variant">
    {roleLabel(role)}
  </span>
);
