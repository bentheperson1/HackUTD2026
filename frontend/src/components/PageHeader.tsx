import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => (
  <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div className="min-w-0">
      <h1 className="m-0 type-headline-small text-on-surface">{title}</h1>
      {description && <p className="mb-0 mt-1 max-w-2xl type-body-medium text-on-surface-variant">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
);
