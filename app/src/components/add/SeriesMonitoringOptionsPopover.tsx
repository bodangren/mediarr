
import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Icon } from '@/components/primitives/Icon';

export type MonitoringOption = 'all' | 'future' | 'missing' | 'existing' | 'pilot' | 'firstSeason' | 'none';

interface MonitoringOptionConfig {
  value: MonitoringOption;
  label: string;
  description: string;
}

const MONITORING_OPTIONS: MonitoringOptionConfig[] = [
  {
    value: 'all',
    label: 'All Episodes',
    description: 'Monitor all episodes for all seasons',
  },
  {
    value: 'future',
    label: 'Future Episodes',
    description: 'Monitor only episodes that have not aired yet',
  },
  {
    value: 'missing',
    label: 'Missing Episodes',
    description: 'Monitor episodes that do not have files',
  },
  {
    value: 'existing',
    label: 'Existing Episodes',
    description: 'Monitor episodes that have files or have not aired yet',
  },
  {
    value: 'pilot',
    label: 'Pilot Episode',
    description: 'Monitor only the first episode of the first season',
  },
  {
    value: 'firstSeason',
    label: 'First Season',
    description: 'Monitor all episodes of the first season',
  },
  {
    value: 'none',
    label: 'None',
    description: 'No episodes will be monitored',
  },
];

interface SeriesMonitoringOptionsPopoverProps {
  value: MonitoringOption;
  onChange: (value: MonitoringOption) => void;
  disabled?: boolean;
}

export function SeriesMonitoringOptionsPopover({
  value,
  onChange,
  disabled = false,
}: SeriesMonitoringOptionsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = MONITORING_OPTIONS.find(opt => opt.value === value) ?? MONITORING_OPTIONS[0];

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

  const handleSelect = (option: MonitoringOption) => {
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
          aria-label="Monitoring options"
          className="absolute left-0 top-full z-50 mt-1 w-72 rounded-md border border-border-subtle bg-surface-1 py-1 shadow-elevation-3"
        >
          {MONITORING_OPTIONS.map(option => (
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

export { MONITORING_OPTIONS };
