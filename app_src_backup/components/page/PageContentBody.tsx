import type { ReactNode } from 'react';

interface PageContentBodyProps {
  children: ReactNode;
  className?: string;
}

export function PageContentBody({ children, className = '' }: PageContentBodyProps) {
  return (
    <div
      className={`
        overflow-y-auto
        scroll-smooth
        scrollbar-thin
        scrollbar-thumb-border-subtle
        scrollbar-track-transparent
        hover:scrollbar-thumb-text-muted
        ${className}
      `}
    >
      {children}
    </div>
  );
}
