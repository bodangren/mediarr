import type { ReactNode } from 'react';

interface PageToolbarProps {
  children: ReactNode;
}

interface PageToolbarSectionProps {
  children: ReactNode;
  align?: 'left' | 'right';
}

export function PageToolbar({ children }: PageToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-subtle bg-surface-1 px-3 py-2">
      {children}
    </div>
  );
}

export function PageToolbarSection({ children, align = 'left' }: PageToolbarSectionProps) {
  return <div className={`flex flex-wrap items-center gap-2 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>{children}</div>;
}
