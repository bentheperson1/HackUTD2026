import React from 'react';

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  help?: string;
  children: React.ReactNode;
  className?: string;
}

export const Field: React.FC<FieldProps> = ({ label, htmlFor, error, help, children, className }) => {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-fg-muted">
        {label}
      </label>
      {children}
      {help && <p className="text-xs text-fg-subtle">{help}</p>}
      {error && <p className="text-xs font-medium text-breach-text">{error}</p>}
    </div>
  );
};
