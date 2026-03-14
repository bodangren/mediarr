import { useNavigate, Link } from 'react-router-dom';
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
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface AppShellProps {
  pathname: string;
  children: ReactNode;
}

export function AppShell({ pathname, children }: AppShellProps) {
  const navigate = useNavigate();
  const { state: uiState, toggleSidebarCollapsed } = useUIStore();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(() => {
    return getApiClients().eventsApi.connectionState;
  });

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

  const handleCommandSelect = (path: string) => {
    setPaletteOpen(false);
    navigate(path);
  };

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
                <Link to={crumb.href} className="hover:text-text-primary">
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

      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {NAV_ITEMS.map(section => (
            <CommandGroup key={section.id} heading={section.label}>
              {section.items.map(item => (
                <CommandItem
                  key={item.path}
                  onSelect={() => handleCommandSelect(item.path)}
                >
                  <span>{item.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{item.path}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>

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
