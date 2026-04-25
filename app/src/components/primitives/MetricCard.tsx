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
    <article className="px-0 py-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-muted">{label}</p>
      <div className="mt-4 flex items-baseline justify-between gap-6">
        <p className="text-5xl font-bold tracking-tight text-white">{value}</p>
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-secondary opacity-40">{trendText(trend)}</span>
      </div>
      {onAction ? (
        <button
          type="button"
          className="mt-6 text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-white transition-colors"
          onClick={onAction}
          aria-label={`Open ${label}`}
        >
          {label} DETAILS
        </button>
      ) : null}
    </article>
  );
}
