import type { ReactNode } from 'react';

interface RouteScaffoldProps {
  title: string;
  description: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function RouteScaffold({ title, description, actions, children }: RouteScaffoldProps) {
  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 rounded-md border border-border-subtle bg-surface-1 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-text-secondary">{description}</p>
        </div>
        {actions ? <div className="min-w-0 max-w-full sm:ml-4 sm:shrink-0">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}
