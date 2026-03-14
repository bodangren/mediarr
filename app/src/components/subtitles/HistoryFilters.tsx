
import type { ChangeEvent } from 'react';

export interface FilterState {
  provider?: string;
  languageCode?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

interface HistoryFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  providers: string[];
  languages: string[];
  actions: string[];
}

export function HistoryFilters({
  filters,
  onChange,
  providers,
  languages,
  actions,
}: HistoryFiltersProps) {
  const handleChange = (key: keyof FilterState, value: string) => {
    onChange({
      ...filters,
      [key]: value === '' ? undefined : value,
    });
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border border-border-subtle bg-surface-1 p-4">
      <div className="flex-1 min-w-[150px] space-y-1">
        <label htmlFor="provider-filter" className="block text-xs text-text-secondary">
          Provider
        </label>
        <select
          id="provider-filter"
          value={filters.provider ?? ''}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => handleChange('provider', e.currentTarget.value)}
          className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
        >
          <option value="">All Providers</option>
          {providers.map(provider => (
            <option key={provider} value={provider}>
              {provider}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-[150px] space-y-1">
        <label htmlFor="language-filter" className="block text-xs text-text-secondary">
          Language
        </label>
        <select
          id="language-filter"
          value={filters.languageCode ?? ''}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => handleChange('languageCode', e.currentTarget.value)}
          className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
        >
          <option value="">All Languages</option>
          {languages.map(language => (
            <option key={language} value={language}>
              {language}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-[150px] space-y-1">
        <label htmlFor="action-filter" className="block text-xs text-text-secondary">
          Action
        </label>
        <select
          id="action-filter"
          value={filters.action ?? ''}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => handleChange('action', e.currentTarget.value)}
          className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
        >
          <option value="">All Actions</option>
          {actions.map(action => (
            <option key={action} value={action}>
              {action.charAt(0).toUpperCase() + action.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-[150px] space-y-1">
        <label htmlFor="start-date-filter" className="block text-xs text-text-secondary">
          Start Date
        </label>
        <input
          id="start-date-filter"
          type="date"
          value={filters.startDate ?? ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('startDate', e.currentTarget.value)}
          className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex-1 min-w-[150px] space-y-1">
        <label htmlFor="end-date-filter" className="block text-xs text-text-secondary">
          End Date
        </label>
        <input
          id="end-date-filter"
          type="date"
          value={filters.endDate ?? ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('endDate', e.currentTarget.value)}
          className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
        />
      </div>

      <button
        type="button"
        onClick={() =>
          onChange({
            provider: undefined,
            languageCode: undefined,
            action: undefined,
            startDate: undefined,
            endDate: undefined,
          })
        }
        className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm hover:bg-surface-3"
      >
        Clear Filters
      </button>
    </div>
  );
}
