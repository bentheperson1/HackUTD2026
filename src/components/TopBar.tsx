import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { RoleBadge } from './RoleBadge';

export const TopBar: React.FC = () => {
  const { currentUser, connectionStatus, spacetimedbIdentity, switchUser } = useAuth();
  const shortId = spacetimedbIdentity ? `${spacetimedbIdentity.slice(0, 8)}...${spacetimedbIdentity.slice(-6)}` : 'disconnected';

  const navLinks = [
    { to: '/login', label: 'Login' },
    { to: '/members', label: 'Members' },
    { to: '/incident', label: 'Incident' },
    { to: '/warroom', label: 'War Room' },
    { to: '/docs', label: 'Docs & Audit' },
    { to: '/scope', label: 'Scope' },
    { to: '/notify', label: 'Breach Notification' },
    { to: '/editor', label: 'Templates & Drafts' },
    { to: '/export', label: 'PDF Export' },
    { to: '/drill', label: 'Drill Night' },
    { to: '/debug', label: 'Debug / DB JSON' },
  ];

  return (
    <header style={{ borderBottom: '2px solid black', paddingBottom: '8px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ margin: 0 }}>🚨 Drill Night: Crisis Command Center</h2>
          <small>Out-of-band Ransomware Response &amp; Multiplayer Drill System</small>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.9em', border: '1px solid #aaa', padding: '6px' }}>
          <div><strong>Connection:</strong> <span style={{ color: 'green' }}>● {connectionStatus}</span> | <strong>SpacetimeDB Identity:</strong> <code>{shortId}</code></div>
          <div><strong>User:</strong> {currentUser.name} | <strong>Phone:</strong> {currentUser.phone} | <RoleBadge role={currentUser.role} /></div>
          <div><strong>Org:</strong> Acme Logistics Corp</div>
        </div>
      </div>

      <nav style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              padding: '6px 12px',
              border: '1px solid black',
              backgroundColor: isActive ? '#000' : '#eee',
              color: isActive ? '#fff' : '#000',
              textDecoration: 'none',
              fontWeight: isActive ? 'bold' : 'normal',
            })}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
};
