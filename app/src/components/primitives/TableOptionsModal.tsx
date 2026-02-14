'use client';

import { moveColumn, toggleColumnVisibility, type ColumnPreference } from '@/lib/table/columns';

interface TableOptionsModalProps {
  title: string;
  columns: ColumnPreference[];
  onChange: (columns: ColumnPreference[]) => void;
  onClose: () => void;
}

export function TableOptionsModal({ title, columns, onChange, onClose }: TableOptionsModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-surface-3/70 px-4">
      <div className="w-full max-w-md rounded-md border border-border-subtle bg-surface-1 p-4 shadow-elevation-3">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <ul className="space-y-2">
          {columns.map((column, index) => (
            <li key={column.key} className="flex items-center justify-between gap-2 rounded-sm border border-border-subtle p-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  aria-label={`Toggle ${column.label}`}
                  checked={column.visible}
                  onChange={() => onChange(toggleColumnVisibility(columns, column.key))}
                />
                <span>{column.label}</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`Move ${column.label} up`}
                  className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                  onClick={() => onChange(moveColumn(columns, index, Math.max(0, index - 1)))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${column.label} down`}
                  className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                  onClick={() => onChange(moveColumn(columns, index, Math.min(columns.length - 1, index + 1)))}
                >
                  ↓
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
