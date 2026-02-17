import type { ReactNode } from 'react';

interface PageToolbarButtonProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  isActive?: boolean;
  ariaLabel?: string;
}

export function PageToolbarButton({
  icon,
  label,
  onClick,
  disabled = false,
  loading = false,
  isActive = false,
  ariaLabel,
}: PageToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel || label}
      aria-busy={loading}
      className={`
        flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium
        transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:ring-offset-2 focus:ring-offset-surface-1
        ${disabled ? 'cursor-not-allowed opacity-50' : ''}
        ${
          isActive
            ? 'bg-accent-primary/20 text-accent-primary'
            : 'bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary'
        }
      `}
    >
      <span className={loading ? 'animate-spin' : ''}>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
