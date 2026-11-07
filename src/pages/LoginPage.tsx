import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { Field } from '../components/Field';

export const LoginPage: React.FC = () => {
  const { currentUser, switchUser, loginAsTestUser } = useAuth();
  const [members, setMembers] = useState(store.getState().members);
  const [phoneNumber, setPhoneNumber] = useState('+1 (555) 302-8841');
  const [statusMessage, setStatusMessage] = useState('');

  const handleSimulatePhoneLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const match = members.find((m) => m.phone.trim() === phoneNumber.trim());
    if (match) {
      switchUser(match.id);
      setStatusMessage(`Authenticated via SMS OTP simulation as ${match.name} (${match.role})`);
    } else {
      setStatusMessage(`Phone number not found in authorized member directory.`);
    }
  };

  return (
    <div>
      <h3>Authentication &amp; Out-of-Band Access</h3>
      <p>
        In an active ransomware crisis, company email, Active Directory, and corporate SSO are assumed compromised.
        Drill Night authenticates against independent out-of-band verified credentials (SMS OTP / personal phone / SpacetimeDB OIDC tokens).
      </p>

      <fieldset style={{ marginBottom: '20px', padding: '16px' }}>
        <legend><strong>Quick Hackathon Access</strong></legend>
        <p>Current Active Identity: <code>{currentUser.identity}</code> ({currentUser.name})</p>
        <button onClick={loginAsTestUser} style={{ padding: '8px 16px', fontWeight: 'bold' }}>
          Continue as Test User (Admin / Owner)
        </button>
      </fieldset>

      <fieldset style={{ marginBottom: '20px', padding: '16px' }}>
        <legend><strong>Simulate SMS / Phone Number Login (Phase 4a Baseline)</strong></legend>
        <form onSubmit={handleSimulatePhoneLogin}>
          <Field label="Personal Phone Number" help="Enter phone number registered in member directory (e.g. +1 (555) 302-8841)">
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              style={{ width: '300px', padding: '6px' }}
            />
          </Field>
          <button type="submit" style={{ padding: '6px 12px' }}>Verify &amp; Sign In</button>
        </form>
        {statusMessage && <p style={{ fontWeight: 'bold', color: 'blue' }}>{statusMessage}</p>}
      </fieldset>

      <fieldset style={{ padding: '16px' }}>
        <legend><strong>Switch Active Role for Testing</strong></legend>
        <p>Switch between teammate personas to test role-based access control:</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => switchUser(m.id)}
              style={{
                padding: '6px 12px',
                backgroundColor: currentUser.id === m.id ? '#ddd' : '#fff',
                fontWeight: currentUser.id === m.id ? 'bold' : 'normal',
              }}
            >
              {m.name} [{m.role}]
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
};
