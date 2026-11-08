import React from 'react';

type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  filled: 'bg-primary text-on-primary px-6 disabled:bg-on-surface/12',
  tonal: 'bg-secondary-container text-on-secondary-container px-6 disabled:bg-on-surface/12',
  outlined: 'border border-outline text-primary px-6 disabled:border-on-surface/12',
  text: 'text-primary px-3',
  danger: 'bg-error text-on-error px-6 disabled:bg-on-surface/12',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'filled',
  icon,
  className = '',
  children,
  type = 'button',
  ...rest
}) => {
  const iconPadding = icon ? (variant === 'text' ? 'pl-3' : 'pl-4') : '';
  return (
    <button
      type={type}
      className={`state-layer inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full type-label-large transition-colors disabled:cursor-not-allowed disabled:text-on-surface/38 ${VARIANT_CLASSES[variant]} ${iconPadding} ${className}`}
      {...rest}
    >
      {icon && <span className="flex [&>svg]:h-[18px] [&>svg]:w-[18px]">{icon}</span>}
      {children}
    </button>
  );
};

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export const IconButton: React.FC<IconButtonProps> = ({ label, className = '', children, type = 'button', ...rest }) => (
  <button
    type={type}
    aria-label={label}
    title={label}
    className={`state-layer inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant disabled:text-on-surface/38 [&>svg]:h-5 [&>svg]:w-5 ${className}`}
    {...rest}
  >
    {children}
  </button>
);
