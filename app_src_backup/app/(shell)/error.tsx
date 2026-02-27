'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function ShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl space-y-3 rounded-lg border border-status-error/30 bg-surface-1 p-6">
      <h2 className="text-lg font-semibold text-text-primary">Route Error</h2>
      <p className="text-sm text-text-secondary">{error.message}</p>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-sm border border-border-subtle px-3 py-1 text-sm text-text-primary hover:bg-surface-2"
          onClick={() => reset()}
        >
          Retry
        </button>
        <Link
          href="/"
          className="rounded-sm border border-border-subtle px-3 py-1 text-sm text-text-primary hover:bg-surface-2"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
