import { type ReactNode } from 'react';
import { Alert as ShadcnAlert } from '@/components/ui/alert';
import { Icon } from './Icon';
import { cn } from '@/lib/cn';

type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

interface AlertProps {
  variant?: AlertVariant;
  children: ReactNode;
}

const TONE_CLASS: Record<AlertVariant, string> = {
  info: 'border-accent-primary/30 bg-accent-primary/10 text-text-primary [&>svg]:text-accent-primary',
  success: 'border-status-completed/30 bg-status-completed/10 text-text-primary [&>svg]:text-status-completed',
  warning: 'border-status-wanted/30 bg-status-wanted/10 text-text-primary [&>svg]:text-status-wanted',
  danger: 'border-status-error/30 bg-status-error/10 text-text-primary [&>svg]:text-status-error',
};

const ICON_BY_VARIANT: Record<AlertVariant, Parameters<typeof Icon>[0]['name']> = {
  info: 'info',
  success: 'check',
  warning: 'warning',
  danger: 'warning',
};

export function Alert({ variant = 'info', children }: AlertProps) {
  return (
    <ShadcnAlert className={cn('flex items-start gap-2 rounded-sm px-3 py-2 text-sm', TONE_CLASS[variant])}>
      <Icon name={ICON_BY_VARIANT[variant]} label={`${variant} alert`} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </ShadcnAlert>
  );
}
