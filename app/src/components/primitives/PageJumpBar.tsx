const LETTERS = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));

export type JumpFilter = 'All' | '#' | (typeof LETTERS)[number];

interface PageJumpBarProps {
  value: JumpFilter;
  onChange: (value: JumpFilter) => void;
}

export function matchesJumpFilter(name: string, filter: JumpFilter) {
  if (filter === 'All') {
    return true;
  }

  const normalized = name.trim();
  if (!normalized) {
    return false;
  }

  const firstChar = normalized[0].toUpperCase();

  if (filter === '#') {
    return !/[A-Z]/.test(firstChar);
  }

  return firstChar === filter;
}

export function PageJumpBar({ value, onChange }: PageJumpBarProps) {
  const options: JumpFilter[] = ['All', '#', ...LETTERS];

  return (
    <nav aria-label="Jump bar" className="flex flex-wrap gap-1 rounded-md border border-border-subtle bg-surface-1 px-2 py-2">
      {options.map(option => {
        const active = option === value;

        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            className={`rounded-sm border px-2 py-1 text-xs ${active ? 'border-accent-primary bg-accent-primary/10 text-text-primary' : 'border-border-subtle text-text-secondary'}`}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        );
      })}
    </nav>
  );
}
