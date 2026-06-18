import { cn } from '@/lib/utils';

type StatusVariant = 'healthy' | 'warning' | 'error' | 'disabled';

const statusConfig: Record<StatusVariant, { label: string; className: string }> = {
  healthy: { label: 'Healthy', className: 'bg-status-completed/20 text-status-completed' },
  warning: { label: 'Warning', className: 'bg-accent-warning/20 text-accent-warning' },
  error: { label: 'Error', className: 'bg-status-error/20 text-status-error' },
  disabled: { label: 'Disabled', className: 'bg-surface-2 text-text-muted' },
};

interface TaskStatusBadgeProps {
  status: StatusVariant;
  className?: string;
}

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      title={status}
      className={cn(
        'inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
