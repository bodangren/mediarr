import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';

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
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          disabled={disabled || loading}
          aria-label={ariaLabel || label}
          aria-busy={loading}
          className={cn('gap-2', isActive && 'bg-accent-primary/20 text-accent-primary')}
        >
          <span className={loading ? 'animate-spin' : ''}>{icon}</span>
          <span className="hidden sm:inline">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
