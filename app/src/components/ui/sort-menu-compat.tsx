
import { ArrowUp, ArrowDown, ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const selectedOption = options.find(opt => opt.key === value);

  return (
    <div className="inline-flex items-center gap-2 text-xs text-text-secondary">
      <span>{label}</span>
      <div className="inline-flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="xs"
              className="rounded-r-none h-7 px-2 font-normal"
              aria-label={`${label} by`}
            >
              <span className="truncate max-w-[100px]">{selectedOption?.label ?? value}</span>
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
                {option.key === value && <Check size={12} className="ml-auto text-accent-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="secondary"
          size="xs"
          className="rounded-l-none border-l-0 h-7 px-2 text-accent-primary hover:bg-surface-2"
          aria-label={`Toggle sort direction (${direction})`}
          onClick={toggleDirection}
        >
          <DirectionIcon size={14} />
        </Button>
      </div>
    </div>
  );
}
