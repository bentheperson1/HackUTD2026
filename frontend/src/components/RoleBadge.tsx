import React from 'react';
import { Role } from '../lib/types';
import { ROLES } from '../lib/constants';

interface RoleBadgeProps {
  role: Role;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const match = ROLES.find((r) => r.value === role);
  const label = match ? match.label : role;
  return <span style={{ fontWeight: 'bold', padding: '2px 6px', border: '1px solid #ccc' }}>[{label}]</span>;
};

