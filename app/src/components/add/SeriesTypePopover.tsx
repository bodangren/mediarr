'use client';

import { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/primitives/Icon';

export type SeriesType = 'standard' | 'anime' | 'daily';

interface SeriesTypeConfig {
  value: SeriesType;
  label: string;
  description: string;
}

const SERIES_TYPE_OPTIONS: SeriesTypeConfig[] = [
  {
    value: 'standard',
    label: 'Standard',
    description: 'Standard TV series with season and episode numbering (SXXEXX)',
  },
  {
    value: 'anime',
    label: 'Anime',
    description: 'Anime series with absolute episode numbering and season folder handling',
  },
  {
    value: 'daily',
    label: 'Daily',
    description: 'Daily shows with date-based naming (YYYY-MM-DD)',
  },
];

interface SeriesTypePopoverProps {
  value: SeriesType;
  onChange: (value: SeriesType) => void;
  disabled?: boolean;
}

export function SeriesTypePopover({ value, onChange, disabled = false }: SeriesTypePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = SERIES_TYPE_OPTIONS.find(opt => opt.value === value) ?? SERIES_TYPE_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (option: SeriesType) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm text-text-primary hover:border-border-default disabled:cursor-not-allowed disabled:opacity-50"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>{selectedOption.label}</span>
        <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} className="text-text-secondary" />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Series type options"
          className="absolute left-0 top-full z-50 mt-1 w-72 rounded-md border border-border-subtle bg-surface-1 py-1 shadow-elevation-3"
        >
          {SERIES_TYPE_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              onClick={() => handleSelect(option.value)}
              className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2 ${
                value === option.value ? 'bg-accent-primary/10' : ''
              }`}
            >
              <span className="font-medium text-text-primary">{option.label}</span>
              <span className="text-xs text-text-secondary">{option.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { SERIES_TYPE_OPTIONS };
