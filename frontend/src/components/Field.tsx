import React from 'react';

interface FieldProps {
  label: string;
  error?: string;
  help?: string;
  className?: string;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({ label, error, help, className = '', children }) => {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="type-label-large text-on-surface-variant">{label}</span>
      {children}
      {help && !error && <span className="px-4 type-body-small text-on-surface-variant">{help}</span>}
      {error && <span className="px-4 type-body-small text-error">{error}</span>}
    </label>
  );
};
