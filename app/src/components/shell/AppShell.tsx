'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ConnectionState } from '@/lib/api/eventsApi';
import { getApiClients } from '@/lib/api/client';
import { NAV_ITEMS, buildBreadcrumbs } from '@/lib/navigation';
import {
  KEYBOARD_SHORTCUTS,
  emitShortcutSaveEvent,
  isEditableTarget,
  isQuestionMarkShortcut,
} from '@/lib/shortcuts';
import { useUIStore } from '@/lib/state/useUIStore';
import { applyUIPreferences, loadUIPreferences } from '@/lib/uiPreferences';
import { PageLayout } from './PageLayout';

interface AppShellProps {
  pathname: string;
  children: ReactNode;
}

export function AppShell({ pathname, children }: AppShellProps) {
  const { state: uiState, toggleSidebarCollapsed } = useUIStore();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(() => {
    return getApiClients().eventsApi.connectionState;
  });
  const [query, setQuery] = useState('');

  useEffect(() => {
    applyUIPreferences(loadUIPreferences());
  }, []);

  useEffect(() => {
    const { eventsApi } = getApiClients();
    return eventsApi.onStateChange(nextState => {
      setConnectionState(nextState);
    });
  }, []);

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      const isOpenShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (isOpenShortcut) {
        event.preventDefault();
        setShortcutHelpOpen(false);
        setPaletteOpen(current => !current);
        return;
      }

      const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';
      if (isSaveShortcut) {
        event.preventDefault();
        emitShortcutSaveEvent();
        return;
      }

      if (event.key === 'Escape') {
        setPaletteOpen(false);
        setShortcutHelpOpen(false);
        return;
      }

      if (!event.metaKey && !event.ctrlKey && !isEditableTarget(event.target) && isQuestionMarkShortcut(event)) {
        event.preventDefault();
        setPaletteOpen(false);
        setShortcutHelpOpen(true);
      }
    };

    window.addEventListener('keydown', onKeydown);
    return () => {
      window.removeEventListener('keydown', onKeydown);
    };
  }, []);

  const breadcrumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname]);

  const commandItems = useMemo(() => {
    return NAV_ITEMS.flatMap(section => section.items);
  }, []);

  const filteredCommands = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length === 0) {
      return commandItems;
    }

    return commandItems.filter(item => {
      return item.label.toLowerCase().includes(normalizedQuery) || item.path.includes(normalizedQuery);
    });
  }, [commandItems, query]);

  const connectionLabel = useMemo(() => {
    switch (connectionState) {
      case 'open':
        return 'Live';
      case 'connecting':
        return 'Connecting';
      case 'reconnecting':
        return 'Reconnecting';
      case 'closed':
        return 'Offline';
      default:
        return 'Idle';
    }
  }, [connectionState]);

  return (
    <PageLayout
      pathname={pathname}
      sidebarCollapsed={uiState.sidebarCollapsed}
      onToggleSidebar={toggleSidebarCollapsed}
      header={
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

          <div className="flex items-center gap-2">
            <span
              role="status"
              aria-live="polite"
              className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary"
            >
              Realtime: {connectionLabel}
            </span>
            <button
              type="button"
              className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:text-text-primary"
              onClick={() => {
                setShortcutHelpOpen(false);
                setPaletteOpen(true);
              }}
            >
              Cmd/Ctrl + K
            </button>
          </div>
        </div>
      }
    >
      {children}

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

      {shortcutHelpOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center bg-surface-3/80 px-3 pt-[12vh]"
          onClick={() => setShortcutHelpOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Keyboard Shortcuts"
            className="w-full max-w-xl rounded-lg border border-border-subtle bg-surface-1 p-4 shadow-elevation-3"
            onClick={event => event.stopPropagation()}
          >
            <h2 className="text-base font-semibold">Keyboard Shortcuts</h2>
            <p className="mt-1 text-xs text-text-secondary">Use these shortcuts throughout the app shell and settings pages.</p>
            <ul className="mt-4 space-y-2">
              {KEYBOARD_SHORTCUTS.map(shortcut => (
                <li key={shortcut.id} className="flex items-center justify-between gap-3 rounded-sm border border-border-subtle bg-surface-0 px-3 py-2">
                  <span className="text-sm text-text-secondary">{shortcut.description}</span>
                  <kbd className="rounded-sm border border-border-subtle bg-surface-2 px-2 py-1 text-xs font-semibold text-text-primary">
                    {shortcut.keyCombo}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </PageLayout>
  );
}
