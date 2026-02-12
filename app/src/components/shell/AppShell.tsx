'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { NAV_ITEMS, buildBreadcrumbs, isNavActive } from '@/lib/navigation';

interface AppShellProps {
  pathname: string;
  children: ReactNode;
}

export function AppShell({ pathname, children }: AppShellProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      const isOpenShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (isOpenShortcut) {
        event.preventDefault();
        setPaletteOpen(current => !current);
        return;
      }

      if (event.key === 'Escape') {
        setPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', onKeydown);
    return () => {
      window.removeEventListener('keydown', onKeydown);
    };
  }, []);

  const breadcrumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname]);

  const filteredCommands = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length === 0) {
      return NAV_ITEMS;
    }

    return NAV_ITEMS.filter(item => {
      return item.label.toLowerCase().includes(normalizedQuery) || item.path.includes(normalizedQuery);
    });
  }, [query]);

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary">
      <div
        className={`mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 ${
          sidebarCollapsed ? 'lg:grid-cols-[88px_1fr]' : 'lg:grid-cols-[240px_1fr]'
        }`}
      >
        <aside className="hidden border-r border-border-subtle bg-surface-1 p-4 lg:block">
          <div className={`mb-4 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between gap-2'}`}>
            <p className="text-xs uppercase tracking-wide text-text-muted">{sidebarCollapsed ? 'MR' : 'Mediarr'}</p>
            <button
              type="button"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:text-text-primary"
              onClick={() => setSidebarCollapsed(current => !current)}
            >
              {sidebarCollapsed ? '>' : '<'}
            </button>
          </div>
          <nav className="space-y-1" aria-label="Sidebar Navigation">
            {NAV_ITEMS.map(item => {
              const active = isNavActive(pathname, item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`block rounded-sm px-3 py-2 text-sm ${
                    active ? 'bg-accent-primary/20 text-text-primary' : 'text-text-secondary hover:bg-surface-2'
                  } ${sidebarCollapsed ? 'text-center' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  {sidebarCollapsed ? item.shortLabel : item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 border-b border-border-subtle bg-surface-1/90 px-4 py-3 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <nav aria-label="Breadcrumbs" className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                {breadcrumbs.map((crumb, index) => (
                  <span key={crumb.href} className="inline-flex items-center gap-2">
                    {index > 0 ? <span aria-hidden="true">/</span> : null}
                    <Link href={crumb.href} className="hover:text-text-primary">
                      {crumb.label}
                    </Link>
                  </span>
                ))}
              </nav>

              <button
                type="button"
                className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:text-text-primary"
                onClick={() => setPaletteOpen(true)}
              >
                Cmd/Ctrl + K
              </button>
            </div>
          </header>

          <main className="flex-1 px-4 pb-20 pt-4 lg:pb-4">{children}</main>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border-subtle bg-surface-1 px-2 py-1 lg:hidden" aria-label="Mobile Navigation">
        <ul className="grid grid-cols-5 gap-1">
          {NAV_ITEMS.slice(0, 5).map(item => {
            const active = isNavActive(pathname, item.path);
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`flex h-full flex-col items-center justify-center rounded-sm px-2 py-2 text-[11px] ${
                    active ? 'bg-accent-primary/20 text-text-primary' : 'text-text-secondary'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.shortLabel}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {paletteOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center bg-surface-3/80 px-3 pt-[12vh]"
          onClick={() => setPaletteOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Command Palette"
            className="w-full max-w-xl rounded-lg border border-border-subtle bg-surface-1 p-3 shadow-elevation-3"
            onClick={event => event.stopPropagation()}
          >
            <input
              value={query}
              onChange={event => setQuery(event.currentTarget.value)}
              placeholder="Jump to route or search"
              className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary"
            />
            <ul className="mt-3 max-h-80 overflow-y-auto">
              {filteredCommands.map(item => (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    className="block rounded-sm px-3 py-2 text-sm text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                    onClick={() => setPaletteOpen(false)}
                  >
                    {item.label}
                    <span className="ml-2 text-xs text-text-muted">{item.path}</span>
                  </Link>
                </li>
              ))}
              {filteredCommands.length === 0 ? (
                <li className="px-3 py-2 text-sm text-text-muted">No command matches your query.</li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
