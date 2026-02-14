export interface SortMenuOption {
  key: string;
  label: string;
}

interface SortMenuProps {
  options: SortMenuOption[];
  value: string;
  label?: string;
  onChange: (key: string) => void;
}

export function SortMenu({ options, value, label = 'Sort', onChange }: SortMenuProps) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
      <span>{label}</span>
      <select
        value={value}
        aria-label={label}
        className="rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-xs text-text-primary"
        onChange={event => onChange(event.currentTarget.value)}
      >
        {options.map(option => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
