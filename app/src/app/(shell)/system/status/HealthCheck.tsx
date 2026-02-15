import type { HealthCheck as HealthCheckType } from '@/lib/api/systemApi';
import { StatusBadge } from '@/components/primitives/StatusBadge';

interface HealthCheckProps {
  check: HealthCheckType;
}

const STATUS_MAP = {
  ok: 'completed' as const,
  warning: 'warning' as const,
  error: 'error' as const,
  unknown: 'warning' as const,
};

export function HealthCheck({ check }: HealthCheckProps) {
  const status = STATUS_MAP[check.status];

  return (
    <li className="flex items-start gap-3 border-b border-border-subtle px-4 py-3 last:border-0">
      <StatusBadge status={status} />
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-text-primary">{check.source}</h3>
          <span className="text-xs text-text-secondary">{check.type}</span>
        </div>
        <p className="mt-1 text-xs text-text-secondary">{check.message}</p>
        {check.lastChecked && (
          <p className="mt-1 text-xs text-text-muted">
            Last checked: {new Date(check.lastChecked).toLocaleString()}
          </p>
        )}
      </div>
    </li>
  );
}
