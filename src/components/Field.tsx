import React from 'react';

interface FieldProps {
  label: string;
  error?: string;
  help?: string;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({ label, error, help, children }) => {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
        {label}
      </label>
      {children}
      {help && <div style={{ fontSize: '0.85em', color: '#555', marginTop: '2px' }}>{help}</div>}
      {error && <div style={{ color: 'red', fontSize: '0.85em', marginTop: '2px' }}>Error: {error}</div>}
    </div>
  );
};

