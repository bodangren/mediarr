
import { ProgressBar } from '@/components/primitives/ProgressBar';
import { Button } from '@/components/primitives/Button';
import { X } from 'lucide-react';

export interface SearchProgressIndicatorProps {
  isSearching: boolean;
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  onDismiss?: () => void;
}

export function SearchProgressIndicator({
  isSearching,
  progress,
  onDismiss,
}: SearchProgressIndicatorProps) {
  if (!isSearching) {
    return null;
  }

  const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return (
    <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-text-primary">Searching for subtitles...</h3>
              <p className="mt-0.5 text-xs text-text-secondary">
                {progress.completed} of {progress.total} completed
                {progress.failed > 0 && `, ${progress.failed} failed`}
              </p>
            </div>
            <div className="text-sm font-medium text-text-primary">{Math.round(percentage)}%</div>
          </div>
          <ProgressBar value={percentage} />
        </div>
        {onDismiss && (
          <Button
            variant="secondary"
            className="h-8 w-8 p-0"
            onClick={onDismiss}
            aria-label="Dismiss progress"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
