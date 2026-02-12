interface MetricCardProps {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'flat';
  onAction?: () => void;
}

function trendText(trend: 'up' | 'down' | 'flat' | undefined): string {
  if (trend === 'up') {
    return 'Trending up';
  }

  if (trend === 'down') {
    return 'Trending down';
  }

  return 'Stable';
}

export function MetricCard({ label, value, trend, onAction }: MetricCardProps) {
  return (
    <article className="rounded-lg border border-border-subtle bg-surface-1 px-4 py-3 shadow-elevation-1">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold text-text-primary">{value}</p>
        <span className="text-xs text-text-secondary">{trendText(trend)}</span>
      </div>
      {onAction ? (
        <button
          type="button"
          className="mt-3 rounded-sm border border-border-subtle px-2 py-1 text-xs font-medium text-text-primary hover:bg-surface-2"
          onClick={onAction}
          aria-label={`Open ${label}`}
        >
          Open {label}
        </button>
      ) : null}
    </article>
  );
}
