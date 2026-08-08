import { useNavigate, Link } from 'react-router-dom';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
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

const SHORTCUT_DIALOG_FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function AppShell({ pathname, children }: AppShellProps) {
  const navigate = useNavigate();
  const { state: uiState, toggleSidebarCollapsed } = useUIStore();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const shortcutDialogRef = useRef<HTMLDivElement>(null);
  const shortcutCloseButtonRef = useRef<HTMLButtonElement>(null);
  const shortcutInvokerRef = useRef<HTMLElement | null>(null);
  const shortcutWasOpenRef = useRef(false);
  const restoreShortcutFocusRef = useRef(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>(() => {
    return getApiClients().eventsApi.connectionState;
  });

  const openShortcutHelp = useCallback(() => {
    shortcutInvokerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    restoreShortcutFocusRef.current = true;
    setPaletteOpen(false);
    setShortcutHelpOpen(true);
  }, []);

  const closeShortcutHelp = useCallback((restoreFocus = true) => {
    restoreShortcutFocusRef.current = restoreFocus;
    setShortcutHelpOpen(false);
  }, []);

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
    if (shortcutHelpOpen) {
      shortcutWasOpenRef.current = true;
      shortcutCloseButtonRef.current?.focus();
      return;
    }

    if (!shortcutWasOpenRef.current) {
      return;
    }

    shortcutWasOpenRef.current = false;
    const invoker = shortcutInvokerRef.current;
    shortcutInvokerRef.current = null;
    if (restoreShortcutFocusRef.current && invoker?.isConnected) {
      invoker.focus();
    }
  }, [shortcutHelpOpen]);

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      const isOpenShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (isOpenShortcut) {
        event.preventDefault();
        closeShortcutHelp(false);
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
        closeShortcutHelp();
        return;
      }

      if (!event.metaKey && !event.ctrlKey && !isEditableTarget(event.target) && isQuestionMarkShortcut(event)) {
        event.preventDefault();
        openShortcutHelp();
      }
    };

    window.addEventListener('keydown', onKeydown);
    return () => {
      window.removeEventListener('keydown', onKeydown);
    };
  }, [closeShortcutHelp, openShortcutHelp]);

  const handleShortcutDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeShortcutHelp();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const dialog = shortcutDialogRef.current;
    if (!dialog) {
      return;
    }

    const focusableElements = Array.from(
      dialog.querySelectorAll<HTMLElement>(SHORTCUT_DIALOG_FOCUSABLE_SELECTOR),
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements.at(-1);
    const activeElement = document.activeElement;

    if (!firstFocusable || !lastFocusable) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    if (
      event.shiftKey &&
      (activeElement === firstFocusable || !dialog.contains(activeElement))
    ) {
      event.preventDefault();
      lastFocusable.focus();
      return;
    }

    if (
      !event.shiftKey &&
      (activeElement === lastFocusable || !dialog.contains(activeElement))
    ) {
      event.preventDefault();
      firstFocusable.focus();
    }
  };

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
      sidebarCollapsed={uiState?.sidebarCollapsed ?? false}
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
          data-testid="keyboard-shortcuts-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8 backdrop-blur-2xl"
          onClick={event => {
            if (event.currentTarget === event.target) {
              closeShortcutHelp();
            }
          }}
        >
          <div
            ref={shortcutDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="keyboard-shortcuts-title"
            aria-describedby="keyboard-shortcuts-description"
            tabIndex={-1}
            className="w-full max-w-4xl p-0"
            onKeyDown={handleShortcutDialogKeyDown}
          >
            <h2 id="keyboard-shortcuts-title" className="text-5xl font-bold tracking-tight text-white mb-2">
              Keyboard Shortcuts
            </h2>
            <p
              id="keyboard-shortcuts-description"
              className="text-lg text-text-secondary mb-12 opacity-60"
            >
              System-wide command interface
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-8">
              {KEYBOARD_SHORTCUTS.map(shortcut => (
                <li key={shortcut.id} className="flex items-center justify-between py-4 border-b border-white/10">
                  <span className="text-xl text-text-secondary">{shortcut.description}</span>
                  <kbd className="text-sm font-bold tracking-widest text-white">
                    {shortcut.keyCombo.toUpperCase()}
                  </kbd>
                </li>
              ))}
            </ul>
            <button
              ref={shortcutCloseButtonRef}
              type="button"
              aria-label="Close keyboard shortcuts"
              className="mt-16 text-xs font-bold tracking-widest text-text-muted hover:text-white transition-colors"
              onClick={() => closeShortcutHelp()}
            >
              CLOSE (ESC)
            </button>
          </div>
        </div>
      ) : null}
    </PageLayout>
  );
}
