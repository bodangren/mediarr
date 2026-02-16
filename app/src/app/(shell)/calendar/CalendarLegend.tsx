import { StatusBadge } from '@/components/primitives/StatusBadge';

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
      <span className="text-xs font-semibold uppercase">Legend:</span>
      <StatusBadge status="Downloaded" />
      <StatusBadge status="Missing" />
      <StatusBadge status="Airing" />
      <StatusBadge status="Unaired" />
    </div>
  );
}
