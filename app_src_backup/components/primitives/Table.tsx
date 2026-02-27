import type { ReactNode } from 'react';
import { memo } from 'react';

interface TableProps {
  children: ReactNode;
}

export const Table = memo(function Table({ children }: TableProps) {
  return (
    <div data-testid="table-overflow" className="overflow-x-auto rounded-md border border-border-subtle">
      <table className="min-w-full text-left text-sm">{children}</table>
    </div>
  );
});
