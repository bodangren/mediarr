'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getApiClients } from '@/lib/api/client';
import { NAV_ITEMS, buildBreadcrumbs } from '@/lib/navigation';
import { KEYBOARD_SHORTCUTS, emitShortcutSaveEvent, isEditableTarget, isQuestionMarkShortcut, } from '@/lib/shortcuts';
import { useUIStore } from '@/lib/state/useUIStore';
import { applyUIPreferences, loadUIPreferences } from '@/lib/uiPreferences';
import { PageLayout } from './PageLayout';
export function AppShell({ pathname, children }) {
    const { state: uiState, toggleSidebarCollapsed } = useUIStore();
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
    const [connectionState, setConnectionState] = useState(() => {
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
        const onKeydown = (event) => {
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
    return (_jsxs(PageLayout, { pathname: pathname, sidebarCollapsed: uiState.sidebarCollapsed, onToggleSidebar: toggleSidebarCollapsed, header: _jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("nav", { "aria-label": "Breadcrumbs", className: "flex flex-wrap items-center gap-2 text-sm text-text-secondary", children: breadcrumbs.map((crumb, index) => (_jsxs("span", { className: "inline-flex items-center gap-2", children: [index > 0 ? _jsx("span", { "aria-hidden": "true", children: "/" }) : null, _jsx(Link, { href: crumb.href, className: "hover:text-text-primary", children: crumb.label })] }, crumb.href))) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { role: "status", "aria-live": "polite", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary", children: ["Realtime: ", connectionLabel] }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:text-text-primary", onClick: () => {
                                setShortcutHelpOpen(false);
                                setPaletteOpen(true);
                            }, children: "Cmd/Ctrl + K" })] })] }), children: [children, paletteOpen ? (_jsx("div", { className: "fixed inset-0 z-40 flex items-start justify-center bg-surface-3/80 px-3 pt-[12vh]", onClick: () => setPaletteOpen(false), children: _jsxs("div", { role: "dialog", "aria-label": "Command Palette", className: "w-full max-w-xl rounded-lg border border-border-subtle bg-surface-1 p-3 shadow-elevation-3", onClick: event => event.stopPropagation(), children: [_jsx("input", { value: query, onChange: event => setQuery(event.currentTarget.value), placeholder: "Jump to route or search", className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary" }), _jsxs("ul", { className: "mt-3 max-h-80 overflow-y-auto", children: [filteredCommands.map(item => (_jsx("li", { children: _jsxs(Link, { href: item.path, className: "block rounded-sm px-3 py-2 text-sm text-text-secondary hover:bg-surface-2 hover:text-text-primary", onClick: () => setPaletteOpen(false), children: [item.label, _jsx("span", { className: "ml-2 text-xs text-text-muted", children: item.path })] }) }, item.path))), filteredCommands.length === 0 ? (_jsx("li", { className: "px-3 py-2 text-sm text-text-muted", children: "No command matches your query." })) : null] })] }) })) : null, shortcutHelpOpen ? (_jsx("div", { className: "fixed inset-0 z-40 flex items-start justify-center bg-surface-3/80 px-3 pt-[12vh]", onClick: () => setShortcutHelpOpen(false), children: _jsxs("div", { role: "dialog", "aria-label": "Keyboard Shortcuts", className: "w-full max-w-xl rounded-lg border border-border-subtle bg-surface-1 p-4 shadow-elevation-3", onClick: event => event.stopPropagation(), children: [_jsx("h2", { className: "text-base font-semibold", children: "Keyboard Shortcuts" }), _jsx("p", { className: "mt-1 text-xs text-text-secondary", children: "Use these shortcuts throughout the app shell and settings pages." }), _jsx("ul", { className: "mt-4 space-y-2", children: KEYBOARD_SHORTCUTS.map(shortcut => (_jsxs("li", { className: "flex items-center justify-between gap-3 rounded-sm border border-border-subtle bg-surface-0 px-3 py-2", children: [_jsx("span", { className: "text-sm text-text-secondary", children: shortcut.description }), _jsx("kbd", { className: "rounded-sm border border-border-subtle bg-surface-2 px-2 py-1 text-xs font-semibold text-text-primary", children: shortcut.keyCombo })] }, shortcut.id))) })] }) })) : null] }));
}
//# sourceMappingURL=AppShell.js.map