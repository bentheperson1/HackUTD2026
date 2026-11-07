import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { RoleBadge } from './RoleBadge';
import { useSpacetimeDB } from 'spacetimedb/react';

export const TopBar: React.FC = () => {
  const { currentUser, spacetimedbIdentity } = useAuth();

  let isDbConnected = false;
  let liveIdentity = spacetimedbIdentity;
  try {
    const conn = useSpacetimeDB();
    if (conn) {
      isDbConnected = conn.isActive;
      if (conn.identity) {
        liveIdentity = conn.identity.toHexString();
      }
    }
  } catch {
    // Fallback if not inside provider
  }

  const shortId = liveIdentity ? `${liveIdentity.slice(0, 8)}...${liveIdentity.slice(-6)}` : 'offline';

  const navLinks = [
    { to: '/warroom', label: 'War Room' },
    { to: '/incident', label: 'Incident' },
    { to: '/members', label: 'Members' },
    { to: '/docs', label: 'Docs & Audit' },
    { to: '/scope', label: 'Scope' },
    { to: '/notify', label: 'Breach Notification' },
    { to: '/editor', label: 'Templates & Drafts' },
    { to: '/export', label: 'PDF Export' },
    { to: '/drill', label: 'Drill Night' },
    { to: '/login', label: 'Auth / Switch Role' },
    { to: '/debug', label: 'Debug & DB Test' },
  ];

  return (
    <header style={{ borderBottom: '2px solid black', paddingBottom: '8px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ margin: 0 }}>🚨 Drill Night: Crisis Command Center</h2>
          <small>Out-of-band Ransomware Response &amp; Multiplayer Drill System</small>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.9em', border: '1px solid #aaa', padding: '6px' }}>
          <div>
            <strong>SpacetimeDB:</strong>{' '}
            <span style={{ color: isDbConnected ? 'green' : 'orange', fontWeight: 'bold' }}>
              ● {isDbConnected ? 'Connected (Maincloud)' : 'Connecting / Offline'}
            </span>{' '}
            | <strong>Identity:</strong> <code>{shortId}</code>
          </div>
          <div>
            <strong>Active Responder:</strong> {currentUser.name} | <strong>Phone:</strong> {currentUser.phone} | <RoleBadge role={currentUser.role} />
          </div>
          <div><strong>Organization:</strong> Acme Logistics Corp</div>
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
