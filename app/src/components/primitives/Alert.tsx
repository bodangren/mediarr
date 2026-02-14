import type { ReactNode } from 'react';
import { Icon } from './Icon';

type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

interface AlertProps {
  variant?: AlertVariant;
  children: ReactNode;
}

const TONE_CLASS: Record<AlertVariant, string> = {
  info: 'border-accent-primary/40 bg-accent-primary/10 text-text-primary',
  success: 'border-status-completed/40 bg-status-completed/10 text-text-primary',
  warning: 'border-status-wanted/40 bg-status-wanted/10 text-text-primary',
  danger: 'border-status-error/40 bg-status-error/10 text-text-primary',
};

const ICON_BY_VARIANT: Record<AlertVariant, Parameters<typeof Icon>[0]['name']> = {
  info: 'search',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
};

export function Alert({ variant = 'info', children }: AlertProps) {
  return (
    <div className={`flex items-start gap-2 rounded-sm border px-3 py-2 text-sm ${TONE_CLASS[variant]}`} role="alert">
      <Icon name={ICON_BY_VARIANT[variant]} label={`${variant} alert`} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
