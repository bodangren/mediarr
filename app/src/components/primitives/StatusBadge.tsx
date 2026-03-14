import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';

interface StatusBadgeProps {
  status: string;
}

const STATUS_CLASS: Record<string, string> = {
  monitored: 'bg-status-monitored/20 text-status-monitored hover:bg-status-monitored/20',
  wanted: 'bg-status-wanted/20 text-status-wanted hover:bg-status-wanted/20',
  downloading: 'bg-status-downloading/20 text-status-downloading hover:bg-status-downloading/20',
  seeding: 'bg-status-seeding/20 text-status-seeding hover:bg-status-seeding/20',
  completed: 'bg-status-completed/20 text-status-completed hover:bg-status-completed/20',
  error: 'bg-status-error/20 text-status-error hover:bg-status-error/20',
  queued: 'bg-accent-warning/20 text-accent-warning hover:bg-accent-warning/20',
  importing: 'bg-accent-info/20 text-accent-info hover:bg-accent-info/20',
  paused: 'bg-surface-2 text-text-muted hover:bg-surface-2',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  const colorClass = STATUS_CLASS[normalized] ?? 'bg-surface-2 text-text-secondary hover:bg-surface-2';

  return (
    <Badge className={cn('rounded-full px-2 py-0.5 text-xs font-semibold border-0', colorClass)}>
      {normalized}
    </Badge>
  );
}
