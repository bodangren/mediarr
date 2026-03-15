import type { SubtitleProvider } from '@/lib/api';
import { StatusBadge } from '@/components/ui/status-badge-compat';

export interface ProviderStatusBadgeProps {
  status: 'active' | 'error' | 'disabled';
  lastError?: string;
  provider?: SubtitleProvider;
}

export function ProviderStatusBadge({ status, lastError, provider }: ProviderStatusBadgeProps) {
  const displayStatus = provider?.enabled ? (provider.status === 'error' ? 'error' : 'active') : 'disabled';
  const errorMessage = lastError ?? provider?.lastError;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`
          h-2 w-2 rounded-full
          ${displayStatus === 'active' ? 'bg-status-error' : ''}
          ${displayStatus === 'error' ? 'bg-status-error' : ''}
          ${displayStatus === 'disabled' ? 'bg-text-muted' : ''}
        `}
      />
      <StatusBadge status={displayStatus === 'active' ? 'completed' : displayStatus} />
      {errorMessage && displayStatus === 'error' && (
        <span
          className="max-w-[200px] truncate text-xs text-status-error"
          title={errorMessage}
        >
          {errorMessage}
        </span>
      )}
    </div>
  );
}
