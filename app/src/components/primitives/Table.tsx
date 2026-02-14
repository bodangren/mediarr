import type { ReactNode } from 'react';

interface TableProps {
  children: ReactNode;
}

export function Table({ children }: TableProps) {
  return (
    <div data-testid="table-overflow" className="overflow-x-auto rounded-md border border-border-subtle">
      <table className="min-w-full text-left text-sm">{children}</table>
    </div>
  );
}
