import { useState } from 'react';
import { LayoutGrid, List, Table2, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

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
  const [open, setOpen] = useState(false);
  const selectedOption = VIEW_OPTIONS.find(opt => opt.key === value);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          aria-label={`${label}: ${selectedOption?.label}`}
          onPointerDown={event => {
            // Radix opens dropdown menus on pointerdown; suppress that so the trigger
            // consistently toggles on click in both the browser and test environment.
            if (event.button === 0 && event.ctrlKey === false) {
              event.preventDefault();
            }
          }}
          onClick={() => setOpen(current => !current)}
        >
          {selectedOption && <selectedOption.icon size={14} className="mr-1.5" />}
          <span className="text-xs">{selectedOption?.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {VIEW_OPTIONS.map(option => {
          const Icon = option.icon;
          const isActive = option.key === value;

          return (
            <DropdownMenuItem
              key={option.key}
              onSelect={() => {
                onChange(option.key);
                setOpen(false);
              }}
            >
              <Icon size={14} />
              <span>{option.label}</span>
              {isActive && (
                <Check size={14} className="ml-auto text-accent-primary" data-testid="active-checkmark" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
