import React from 'react';

interface FieldProps {
  label: string;
  error?: string;
  help?: string;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({ label, error, help, children }) => {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-300">
        {label}
      </label>
      {children}
      {help && <p className="text-[11px] text-slate-400 m-0">{help}</p>}
      {error && <p className="text-xs text-rose-400 font-semibold m-0">{error}</p>}
    </div>
  );
};
