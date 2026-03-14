import { Progress } from '@/components/ui/progress';
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
      <Progress
        value={indeterminate ? undefined : clamped}
        aria-label={label ?? 'Progress'}
        className={`h-2 bg-surface-2 ${indeterminate ? '[&>div]:animate-indeterminate [&>div]:rounded-full' : ''} [&>div]:bg-accent-primary`}
      />
      {indeterminate ? null : (
        <span className="text-xs text-text-secondary">{formatPercent(clamped)}</span>
      )}
    </div>
  );
}
