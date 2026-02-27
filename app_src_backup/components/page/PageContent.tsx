import type { ReactNode } from 'react';

interface PageContentProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function PageContent({ children, title, className = '' }: PageContentProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      {title && <h1 className="mb-4 text-2xl font-semibold text-text-primary">{title}</h1>}
      {children}
    </div>
  );
}
