import { formatPercent } from '@/lib/format';

interface ProgressBarProps {
  value?: number;
  indeterminate?: boolean;
  label?: string;
}

export function ProgressBar({ value = 0, indeterminate = false, label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="flex w-full flex-col gap-1">
      {label ? <span className="text-xs text-text-secondary">{label}</span> : null}
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full bg-accent-primary ${indeterminate ? 'animate-indeterminate' : ''}`}
          style={indeterminate ? undefined : { width: `${clamped}%` }}
          aria-label={label ?? 'Progress'}
        />
      </div>
      {indeterminate ? null : <span className="text-xs text-text-secondary">{formatPercent(clamped)}</span>}
    </div>
  );
}
