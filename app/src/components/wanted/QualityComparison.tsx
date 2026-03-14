
import { ChevronRight } from 'lucide-react';

export interface QualityComparisonProps {
  current: string;
  cutoff: string;
  className?: string;
}

export function QualityComparison({ current, cutoff, className = '' }: QualityComparisonProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm font-medium text-text-primary">{current}</span>
      <ChevronRight 
        className="h-4 w-4 text-accent-primary" 
        aria-hidden="true"
      />
      <span className="text-sm text-text-muted">{cutoff}</span>
    </div>
  );
}
