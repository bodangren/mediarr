import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'border-accent-primary bg-accent-primary text-white hover:opacity-90',
  secondary: 'border-border-subtle bg-surface-1 text-text-primary hover:bg-surface-2',
  danger: 'border-status-error/70 bg-status-error/20 text-text-primary hover:bg-status-error/30',
};

export function Button({ variant = 'primary', children, className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-sm border px-3 py-1.5 text-sm font-medium transition ${VARIANT_CLASS[variant]} ${className ?? ''}`}
      {...props}
    >
      {children}
    </button>
  );
}
