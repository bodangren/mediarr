
import { ArrowUp, ArrowDown } from 'lucide-react';

export interface SortMenuOption {
  key: string;
  label: string;
}

export type SortDirection = 'asc' | 'desc';

interface SortMenuProps {
  options: SortMenuOption[];
  value: string;
  direction: SortDirection;
  label?: string;
  onChange: (key: string) => void;
  onDirectionChange: (direction: SortDirection) => void;
}

export function SortMenu({
  options,
  value,
  direction = 'asc',
  label = 'Sort',
  onChange,
  onDirectionChange,
}: SortMenuProps) {
  const toggleDirection = () => {
    onDirectionChange(direction === 'asc' ? 'desc' : 'asc');
  };

  const DirectionIcon = direction === 'asc' ? ArrowUp : ArrowDown;

  return (
    <div className="inline-flex items-center gap-2 text-xs text-text-secondary">
      <span>{label}</span>
      <div className="inline-flex items-center">
        <select
          value={value}
          aria-label={`${label} by`}
          className="rounded-sm rounded-r-none border border-border-subtle bg-surface-1 px-2 py-1 text-xs text-text-primary"
          onChange={event => onChange(event.currentTarget.value)}
        >
          {options.map(option => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label={`Toggle sort direction (${direction})`}
          className="rounded-sm rounded-l-none border border-l-0 border-border-subtle bg-surface-1 px-2 py-1 text-accent-primary hover:bg-surface-2"
          onClick={toggleDirection}
        >
          <DirectionIcon size={14} />
        </button>
      </div>
    </div>
  );
}
