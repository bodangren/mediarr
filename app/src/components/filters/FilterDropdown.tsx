'use client';

import type { CustomFilter } from '@/lib/api/filters';

interface FilterDropdownProps {
  filters: CustomFilter[];
  selectedFilterId: number | 'custom' | null;
  onSelectFilter: (value: number | 'custom' | null) => void;
  onOpenBuilder: () => void;
  label?: string;
  allLabel?: string;
  id?: string;
}

export function FilterDropdown({
  filters,
  selectedFilterId,
  onSelectFilter,
  onOpenBuilder,
  label = 'Saved Filter',
  allLabel = 'All series',
  id = 'series-filter-dropdown',
}: FilterDropdownProps) {
  const selectedValue = selectedFilterId === null ? 'all' : String(selectedFilterId);

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor={id}>{label}</label>
      <select
        id={id}
        aria-label={label}
        className="rounded-sm border border-border-subtle bg-surface-1 px-2 py-1.5 text-xs"
        value={selectedValue}
        onChange={event => {
          const value = event.currentTarget.value;
          if (value === 'all') {
            onSelectFilter(null);
            return;
          }

          if (value === 'custom') {
            onSelectFilter('custom');
            onOpenBuilder();
            return;
          }

          const parsedId = Number.parseInt(value, 10);
          if (Number.isFinite(parsedId)) {
            onSelectFilter(parsedId);
          }
        }}
      >
        <option value="all">{allLabel}</option>
        {filters.map(filter => (
          <option key={filter.id} value={filter.id}>
            {filter.name}
          </option>
        ))}
        <option value="custom">Custom...</option>
      </select>

      <button
        type="button"
        className="rounded-sm border border-border-subtle bg-surface-1 px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary"
        onClick={onOpenBuilder}
      >
        {selectedFilterId && selectedFilterId !== 'custom' ? 'Edit Filter' : 'Build Filter'}
      </button>
    </div>
  );
}
