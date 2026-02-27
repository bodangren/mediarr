'use client';

import { useSelectContext } from './SelectProvider';

interface SelectFooterAction {
  label: string;
  onClick: (selectedIds: Array<string | number>) => void;
}

interface SelectFooterProps {
  actions: SelectFooterAction[];
}

export function SelectFooter({ actions }: SelectFooterProps) {
  const { selectedIds, clearSelection } = useSelectContext();

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <footer className="flex items-center justify-between rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-sm">
      <p>{selectedIds.length} selected</p>
      <div className="flex items-center gap-2">
        {actions.map(action => (
          <button
            key={action.label}
            type="button"
            className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-primary"
            onClick={() => action.onClick(selectedIds)}
          >
            {action.label}
          </button>
        ))}
        <button
          type="button"
          className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary"
          onClick={clearSelection}
        >
          Clear
        </button>
      </div>
    </footer>
  );
}
