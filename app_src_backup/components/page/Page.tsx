'use client';

import type { ReactNode } from 'react';

interface PageProps {
  title: string;
  headerActions?: ReactNode;
  onMenuToggle: () => void;
  children: ReactNode;
}

export function Page({ title, headerActions, onMenuToggle, children }: PageProps) {
  return (
    <div className="h-full">
      <div className="px-4 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-4">
        {title && (
          <div className="mb-4 flex items-center justify-between gap-4">
            <h1 className="flex-1 truncate text-2xl font-semibold text-text-primary">{title}</h1>
            {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
          </div>
        )}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
