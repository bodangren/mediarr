
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

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

interface MenuTriggerProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export function MenuTrigger({ children, onClick, disabled = false, ariaLabel }: MenuTriggerProps) {
  // Use ariaLabel if provided, otherwise use children text
  const labelText = ariaLabel ?? (typeof children === 'string' ? children : undefined);

  return (
    <Button
      variant="secondary"
      onClick={onClick}
      disabled={disabled}
      aria-label={labelText}
    >
      {children}
    </Button>
  );
}

export function Menu({
  isOpen,
  onClose,
  items,
  align = 'left',
  className = '',
  ariaLabel = 'Menu',
}: MenuProps) {
  // Close on escape key
  useEffect(() => {
    if (!isOpen || !onClose) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Close on click outside
  const handleBackdropClick = () => {
    if (onClose) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  const alignClass = align === 'right' ? 'right-0' : 'left-0';

  return (
    <>
      {/* Backdrop for click outside */}
      <button
        type="button"
        className="fixed inset-0 z-30"
        onClick={handleBackdropClick}
        aria-label="Close menu"
        data-testid="menu-backdrop"
      />

      {/* Menu */}
      <ul
        role="menu"
        aria-label={ariaLabel}
        className={`absolute ${alignClass} z-40 mt-1 min-w-[160px] rounded-sm border border-border-subtle bg-surface-1 shadow-elevation-2 ${className}`.trim()}
      >
          {items.map((item, index) => {
            if (item.divider) {
              return (
                <li key={`divider-${index}`}>
                  <hr role="separator" className="my-1 border-border-subtle" data-testid="menu-divider" />
                </li>
              );
            }

          const Icon = item.icon;

          return (
            <li key={item.key} role="none">
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.();
                  onClose();
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-xs text-left transition ${
                  item.disabled
                    ? 'text-text-muted cursor-not-allowed'
                    : 'text-text-secondary hover:bg-surface-2'
                }`}
              >
                {Icon && <Icon size={14} />}
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function MenuButton({
  items,
  align = 'left',
  ariaLabel = 'Menu',
  children,
}: {
  items: MenuItem[];
  align?: MenuAlign;
  ariaLabel?: string;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerLabel = typeof children === 'string' ? children : undefined;

  return (
    <div className="relative inline-flex items-center">
      <MenuTrigger onClick={() => setIsOpen(!isOpen)} ariaLabel={triggerLabel}>
        {children}
      </MenuTrigger>

      <Menu
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        items={items}
        align={align}
        ariaLabel={ariaLabel}
      />
    </div>
  );
}
