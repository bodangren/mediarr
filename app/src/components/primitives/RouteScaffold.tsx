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
      <header className="flex items-start justify-between rounded-md border border-border-subtle bg-surface-1 p-4">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-text-secondary">{description}</p>
        </div>
        {actions ? <div className="ml-4 shrink-0">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}
