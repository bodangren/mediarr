import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';

interface SkeletonBlockProps {
  className?: string;
  ariaLabel?: string;
}

export function SkeletonBlock({ className = 'h-4 w-full', ariaLabel = 'loading' }: SkeletonBlockProps) {
  return (
    <Skeleton
      className={cn('rounded-sm bg-surface-2', className)}
      aria-label={ariaLabel}
      role="status"
    />
  );
}
