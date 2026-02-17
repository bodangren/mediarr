'use client';

import { formatPercent } from '@/lib/format';

export interface SubtitleProgressBarProps {
  total: number;
  complete: number;
  label?: string;
  className?: string;
}

function getProgressColorClass(percentage: number): string {
  if (percentage >= 90) return 'bg-accent-success';
  if (percentage >= 50) return 'bg-accent-warning';
  return 'bg-accent-danger';
}

export function SubtitleProgressBar({ total, complete, label, className = '' }: SubtitleProgressBarProps) {
  const percentage = total > 0 ? (complete / total) * 100 : 0;
  const colorClass = getProgressColorClass(percentage);

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      {label ? (
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">{label}</span>
          <span className="text-sm font-medium text-text-primary">
            {complete}/{total}
          </span>
        </div>
      ) : null}
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={complete} aria-valuemin={0} aria-valuemax={total}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{formatPercent(percentage)} complete</span>
        <span className="text-xs text-text-muted">
          {total - complete} missing
        </span>
      </div>
    </div>
  );
}
