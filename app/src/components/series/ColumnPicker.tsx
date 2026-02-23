'use client';

import { useState } from 'react';

export type SeriesColumnKey =
  | 'title'
  | 'network'
  | 'genres'
  | 'rating'
  | 'seasons'
  | 'episodes'
  | 'size'
  | 'nextAiring'
  | 'status';

export interface SeriesColumnOption {
  key: SeriesColumnKey;
  label: string;
}

interface ColumnPickerProps {
  options: SeriesColumnOption[];
  visibleColumns: SeriesColumnKey[];
  onChange: (columns: SeriesColumnKey[]) => void;
}

export function ColumnPicker({ options, visibleColumns, onChange }: ColumnPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="rounded-sm border border-border-subtle bg-surface-1 px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary"
        onClick={() => setIsOpen(current => !current)}
        aria-expanded={isOpen}
      >
        Columns
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-52 rounded-sm border border-border-subtle bg-surface-1 p-2 shadow-elevation-3 z-20">
          <div className="space-y-1">
            {options.map(option => {
              const checked = visibleColumns.includes(option.key);
              return (
                <label key={option.key} className="flex items-center gap-2 rounded-sm px-1 py-1 text-xs hover:bg-surface-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? visibleColumns.filter(column => column !== option.key)
                        : [...visibleColumns, option.key];

                      if (next.length === 0) {
                        return;
                      }

                      onChange(next);
                    }}
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
