
import * as Icons from 'lucide-react';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  actions?: ReactNode;
  onMenuToggle: () => void;
}

export function PageHeader({ title, actions, onMenuToggle }: PageHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <button
        type="button"
        onClick={onMenuToggle}
        aria-label="Toggle sidebar"
        className="rounded-sm p-1 text-text-secondary hover:bg-surface-2 hover:text-text-primary lg:hidden"
      >
        <Icons.Menu className="h-5 w-5" />
      </button>
      <h1 className="flex-1 truncate text-xl font-semibold text-text-primary">{title}</h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
