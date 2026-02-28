import type { ReactNode } from 'react';

interface RouteScaffoldProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function RouteScaffold({ title, description, children }: RouteScaffoldProps) {
  return (
    <div className="space-y-4">
      <header className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-sm text-text-secondary">{description}</p>
      </header>
      {children}
    </div>
  );
}
