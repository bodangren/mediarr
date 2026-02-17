import { StatusBadge } from '@/components/primitives/StatusBadge';

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
      <span className="text-xs font-semibold uppercase">Legend:</span>
      {/* Episode statuses */}
      <StatusBadge status="Downloaded" />
      <StatusBadge status="Missing" />
      <StatusBadge status="Airing" />
      <StatusBadge status="Unaired" />
      {/* Movie statuses */}
      <StatusBadge status="Monitored" />
      <StatusBadge status="Unmonitored" />
      {/* Release types */}
      <span className="inline-flex rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-semibold text-purple-400">
        Cinema
      </span>
      <span className="inline-flex rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-400">
        Digital
      </span>
      <span className="inline-flex rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-semibold text-green-400">
        Physical
      </span>
    </div>
  );
}
