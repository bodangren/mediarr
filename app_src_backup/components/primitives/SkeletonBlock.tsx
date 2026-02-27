interface SkeletonBlockProps {
  className?: string;
  ariaLabel?: string;
}

export function SkeletonBlock({ className = 'h-4 w-full', ariaLabel = 'loading' }: SkeletonBlockProps) {
  return (
    <div
      aria-label={ariaLabel}
      className={`animate-pulse rounded-sm bg-surface-2 ${className}`}
      role="status"
    />
  );
}
