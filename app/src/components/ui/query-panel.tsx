import type { ReactNode } from 'react';
import { EmptyPanel } from './empty-panel';
import { ErrorPanel } from './error-panel';
import { SkeletonBlock } from '@/components/ui/skeleton-compat';

interface QueryPanelProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  emptyTitle: string;
  emptyBody: string;
  children: ReactNode;
}

export function QueryPanel({
  isLoading,
  isError,
  isEmpty,
  errorMessage,
  onRetry,
  emptyTitle,
  emptyBody,
  children,
}: QueryPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <SkeletonBlock className="h-4 w-44" ariaLabel="loading heading" />
        <SkeletonBlock className="h-24 w-full" ariaLabel="loading table" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorPanel
        title="Could not load data"
        body={errorMessage ?? 'An unexpected error occurred.'}
        onRetry={onRetry}
      />
    );
  }

  if (isEmpty) {
    return <EmptyPanel title={emptyTitle} body={emptyBody} />;
  }

  return <>{children}</>;
}
