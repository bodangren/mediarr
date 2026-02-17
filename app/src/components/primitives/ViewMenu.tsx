'use client';

import { useState } from 'react';
import { LayoutGrid, List, Table2 } from 'lucide-react';
import { Button } from './Button';

export type ViewMode = 'poster' | 'overview' | 'table';

export interface ViewMenuOption {
  key: ViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

const VIEW_OPTIONS: ViewMenuOption[] = [
  { key: 'poster', label: 'Poster', icon: LayoutGrid },
  { key: 'overview', label: 'Overview', icon: List },
  { key: 'table', label: 'Table', icon: Table2 },
];

interface ViewMenuProps {
  value: ViewMode;
  onChange: (view: ViewMode) => void;
  label?: string;
}

export function ViewMenu({ value, onChange, label = 'View' }: ViewMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = VIEW_OPTIONS.find(opt => opt.key === value);

  return (
    <div className="relative inline-flex items-center">
      <Button
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`${label}: ${selectedOption?.label}`}
      >
        {selectedOption && <selectedOption.icon size={14} className="mr-1.5" />}
        <span className="text-xs">{selectedOption?.label}</span>
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
            aria-label="Close view menu"
          />

          {/* Menu */}
          <ul
            className="absolute right-0 z-40 mt-1 min-w-[140px] rounded-sm border border-border-subtle bg-surface-1 shadow-elevation-2"
            role="listbox"
            aria-label={label}
          >
            {VIEW_OPTIONS.map(option => {
              const Icon = option.icon;
              const isActive = option.key === value;

              return (
                <li key={option.key} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2 px-3 py-2 text-xs text-left transition ${
                      isActive ? 'bg-surface-2 text-text-primary font-medium' : 'text-text-secondary hover:bg-surface-2'
                    }`}
                    onClick={() => {
                      onChange(option.key);
                      setIsOpen(false);
                    }}
                  >
                    <Icon size={14} />
                    <span>{option.label}</span>
                    {isActive && (
                      <svg
                        className="ml-auto h-3.5 w-3.5 text-accent-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        data-testid="active-checkmark"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
