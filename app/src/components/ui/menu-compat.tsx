
import { type ComponentType, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type MenuAlign = 'left' | 'right';

export interface MenuItem {
  key: string;
  label: string;
  icon?: ComponentType<{ className?: string; size?: number }>;
  disabled?: boolean;
  divider?: boolean;
  onClick?: () => void;
}

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: MenuItem[];
  align?: MenuAlign;
  className?: string;
  ariaLabel?: string;
}

interface MenuButtonProps {
  items: MenuItem[];
  align?: MenuAlign;
  ariaLabel?: string;
  children: ReactNode;
}

interface MenuTriggerProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export function MenuTrigger({ children, onClick, disabled = false, ariaLabel }: MenuTriggerProps) {
  const labelText = ariaLabel ?? (typeof children === 'string' ? children : undefined);
  return (
    <Button variant="secondary" onClick={onClick} disabled={disabled} aria-label={labelText}>
      {children}
    </Button>
  );
}

export function Menu({ isOpen, onClose, items, align = 'left', ariaLabel = 'Menu' }: MenuProps) {
  return (
    <DropdownMenu open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* 
        The original Menu didn't have its own trigger in the same component. 
        It was controlled from outside. We need a trigger for DropdownMenu to work correctly,
        but we don't want to render anything visible since the trigger is outside.
      */}
      <DropdownMenuTrigger asChild>
        <span className="sr-only" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align === 'right' ? 'end' : 'start'}>
        {items.map((item, index) => {
          if (item.divider) {
            return <DropdownMenuSeparator key={`divider-${index}`} />;
          }

          const Icon = item.icon;

          return (
            <DropdownMenuItem
              key={item.key}
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick?.();
                }
              }}
            >
              {Icon && <Icon size={14} className="mr-2" />}
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MenuButton({ items, align = 'left', ariaLabel = 'Menu', children }: MenuButtonProps) {
  const triggerLabel = typeof children === 'string' ? children : ariaLabel;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" aria-label={triggerLabel}>
          {children}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align === 'right' ? 'end' : 'start'}>
        {items.map((item, index) => {
          if (item.divider) {
            return <DropdownMenuSeparator key={`divider-${index}`} />;
          }

          const Icon = item.icon;

          return (
            <DropdownMenuItem
              key={item.key}
              disabled={item.disabled}
              onClick={item.onClick}
            >
              {Icon && <Icon size={14} className="mr-2" />}
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
