
import { useMemo } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

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
  const selectedOption = options.find(opt => opt.key === value);
  const displayLabel = customFilterActive ? 'Custom...' : (selectedOption?.label ?? value);

  return (
    <div className="inline-flex items-center gap-2 text-xs text-text-secondary">
      <span>{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="xs"
            className="h-7 px-2 font-normal"
            aria-label={label}
          >
            <span className="truncate max-w-[100px]">{displayLabel}</span>
            <ChevronDown size={12} className="ml-1 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {options.map(option => (
            <DropdownMenuItem
              key={option.key}
              onSelect={() => onChange(option.key)}
              className="text-xs"
            >
              <span>{option.label}</span>
              {!customFilterActive && option.key === value && (
                <Check size={12} className="ml-auto text-accent-primary" />
              )}
            </DropdownMenuItem>
          ))}
          {onCustomFilter && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={onCustomFilter}
                className="text-xs font-medium"
              >
                <span>Custom...</span>
                {customFilterActive && (
                  <Check size={12} className="ml-auto text-accent-primary" />
                )}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
