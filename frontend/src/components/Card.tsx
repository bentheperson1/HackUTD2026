import React from 'react';

type CardVariant = 'filled' | 'outlined' | 'elevated';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  filled: 'bg-surface-container',
  outlined: 'border border-outline-variant bg-surface',
  elevated: 'bg-surface-container-low shadow-[0_1px_2px_rgba(0,0,0,0.3),0_1px_3px_1px_rgba(0,0,0,0.15)]',
};

export const Card: React.FC<CardProps> = ({ variant = 'filled', className = '', children, ...rest }) => (
  <div className={`rounded-xl ${VARIANT_CLASSES[variant]} ${className}`} {...rest}>
    {children}
  </div>
);

export const SectionTitle: React.FC<{ children: React.ReactNode; trailing?: React.ReactNode }> = ({
  children,
  trailing,
}) => (
  <div className="mb-3 flex items-baseline justify-between gap-3">
    <h2 className="m-0 type-title-medium text-on-surface">{children}</h2>
    {trailing && <div className="type-body-small text-on-surface-variant">{trailing}</div>}
  </div>
);
