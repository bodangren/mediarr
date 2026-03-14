
import { useMemo } from 'react';

export interface FilterMenuOption {
  key: string;
  label: string;
}

export type FilterValue = string | { type: 'custom'; conditions: unknown };

export interface CustomFilter {
  type: 'custom';
  conditions: unknown;
}

interface FilterMenuProps {
  label?: string;
  value: string;
  options: FilterMenuOption[];
  onChange: (key: string) => void;
  onCustomFilter?: () => void;
  customFilterActive?: boolean;
}

export function FilterMenu({
  label = 'Filter',
  value,
  options,
  onChange,
  onCustomFilter,
  customFilterActive = false,
}: FilterMenuProps) {
  const extendedOptions = useMemo(() => {
    return onCustomFilter
      ? [
          ...options,
          {
            key: 'custom',
            label: 'Custom...',
          },
        ]
      : options;
  }, [options, onCustomFilter]);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.currentTarget.value;

    if (selectedValue === 'custom') {
      onCustomFilter?.();
    } else {
      onChange(selectedValue);
    }
  };

  return (
    <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
      <span>{label}</span>
      <select
        aria-label={label}
        value={customFilterActive ? 'custom' : value}
        className="rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-xs text-text-primary"
        onChange={handleSelectChange}
      >
        {extendedOptions.map(option => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
