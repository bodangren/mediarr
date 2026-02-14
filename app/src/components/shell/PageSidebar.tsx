'use client';

import Link from 'next/link';
import { NAV_ITEMS, isNavActive, type NavigationItem } from '@/lib/navigation';

interface PageSidebarProps {
  pathname: string;
  collapsed: boolean;
  onToggle: () => void;
  items?: NavigationItem[];
}

export function PageSidebar({ pathname, collapsed, onToggle, items = NAV_ITEMS }: PageSidebarProps) {
  return (
    <aside className="hidden border-r border-border-subtle bg-surface-1 p-4 lg:block">
      <div className={`mb-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between gap-2'}`}>
        <p className="text-xs uppercase tracking-wide text-text-muted">{collapsed ? 'MR' : 'Mediarr'}</p>
        <button
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:text-text-primary"
          onClick={onToggle}
        >
          {collapsed ? '>' : '<'}
        </button>
      </div>
      <nav className="space-y-1" aria-label="Sidebar Navigation">
        {items.map(item => {
          const active = isNavActive(pathname, item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`block rounded-sm px-3 py-2 text-sm ${
                active ? 'bg-accent-primary/20 text-text-primary' : 'text-text-secondary hover:bg-surface-2'
              } ${collapsed ? 'text-center' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              {collapsed ? item.shortLabel : item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
