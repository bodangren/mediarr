'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import { NAV_ITEMS, isNavActive } from '@/lib/navigation';
import { useTouchGestures } from '@/lib/hooks/useTouchGestures';
import { WantedCountBadge } from '@/components/subtitles/WantedCountBadge';
// Icon mapping component
function LucideIcon({ name }) {
    const IconComponent = Icons[name];
    if (!IconComponent) {
        return null;
    }
    return _jsx(IconComponent, { className: "h-4 w-4" });
}
export function PageSidebar({ pathname, collapsed, onToggle, items = NAV_ITEMS, isOpen = false, onClose, }) {
    const [collapsedSections, setCollapsedSections] = useState(new Set());
    const sidebarRef = useRef(null);
    // Touch gesture support for mobile swipe to close
    useTouchGestures(sidebarRef.current, {
        onSwipeLeft: () => {
            if (isOpen && onClose) {
                onClose();
            }
        },
        threshold: 50,
    });
    // Handle click outside to close on mobile
    useEffect(() => {
        if (!isOpen)
            return;
        const handleClickOutside = (event) => {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                onClose?.();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);
    // Prevent body scroll when sidebar is open on mobile
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);
    const toggleSection = (sectionId) => {
        setCollapsedSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sectionId)) {
                newSet.delete(sectionId);
            }
            else {
                newSet.add(sectionId);
            }
            return newSet;
        });
    };
    return (_jsxs(_Fragment, { children: [_jsxs("aside", { className: "hidden border-r border-border-subtle bg-surface-1 p-4 lg:block", children: [_jsxs("div", { className: `mb-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between gap-2'}`, children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-text-muted", children: collapsed ? 'MR' : 'Mediarr' }), _jsx("button", { type: "button", "aria-label": collapsed ? 'Expand sidebar' : 'Collapse sidebar', className: "rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:text-text-primary", onClick: onToggle, children: collapsed ? '>' : '<' })] }), _jsx("nav", { className: "space-y-4", "aria-label": "Sidebar Navigation", children: items.map(section => {
                            const isCollapsed = collapsedSections.has(section.id);
                            return (_jsxs("div", { children: [!collapsed && (_jsxs("button", { type: "button", className: "mb-2 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-text-muted hover:text-text-primary", onClick: () => toggleSection(section.id), "aria-expanded": !isCollapsed, "aria-controls": `section-${section.id}`, children: [_jsx("span", { children: section.label }), _jsx("span", { className: "text-xs", children: isCollapsed ? '+' : '-' })] })), !isCollapsed && (_jsx("ul", { className: `space-y-1 ${collapsed ? '' : ''}`, children: section.items.map(item => {
                                            const active = isNavActive(pathname, item.path);
                                            return (_jsx("li", { children: _jsxs(Link, { href: item.path, className: `flex items-center gap-2 rounded-sm px-3 py-2 text-sm ${active
                                                        ? 'bg-accent-primary/20 text-text-primary'
                                                        : 'text-text-secondary hover:bg-surface-2'} ${collapsed ? 'justify-center' : ''}`, "aria-current": active ? 'page' : undefined, children: [_jsx(LucideIcon, { name: item.icon }), !collapsed && (_jsxs(_Fragment, { children: [_jsx("span", { children: item.label }), item.showBadge && _jsx(WantedCountBadge, { className: "ml-auto" })] })), collapsed && _jsx("span", { className: "text-xs", children: item.shortLabel })] }) }, item.path));
                                        }) }))] }, section.id));
                        }) })] }), isOpen && (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 z-40 bg-black/50 lg:hidden", onClick: onClose, "aria-hidden": "true" }), _jsxs("aside", { ref: sidebarRef, className: "fixed left-0 top-0 z-50 h-full w-64 border-r border-border-subtle bg-surface-1 p-4 lg:hidden", "aria-label": "Mobile Navigation", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between gap-2", children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-text-muted", children: "Mediarr" }), _jsx("button", { type: "button", "aria-label": "Close sidebar", className: "rounded-sm border border-border-subtle p-1 text-text-secondary hover:text-text-primary", onClick: onClose, children: _jsx(Icons.X, { className: "h-4 w-4" }) })] }), _jsx("nav", { className: "space-y-4", children: items.map(section => {
                                    const isCollapsed = collapsedSections.has(section.id);
                                    return (_jsxs("div", { children: [_jsxs("button", { type: "button", className: "mb-2 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-text-muted hover:text-text-primary", onClick: () => toggleSection(section.id), "aria-expanded": !isCollapsed, "aria-controls": `section-${section.id}`, children: [_jsx("span", { children: section.label }), _jsx("span", { className: "text-xs", children: isCollapsed ? '+' : '-' })] }), !isCollapsed && (_jsx("ul", { className: "space-y-1", children: section.items.map(item => {
                                                    const active = isNavActive(pathname, item.path);
                                                    return (_jsx("li", { children: _jsxs(Link, { href: item.path, onClick: onClose, className: `flex items-center gap-2 rounded-sm px-3 py-3 text-sm ${active
                                                                ? 'bg-accent-primary/20 text-text-primary'
                                                                : 'text-text-secondary hover:bg-surface-2'}`, "aria-current": active ? 'page' : undefined, children: [_jsx(LucideIcon, { name: item.icon }), _jsx("span", { children: item.label }), item.showBadge && _jsx(WantedCountBadge, { className: "ml-auto" })] }) }, item.path));
                                                }) }))] }, section.id));
                                }) })] })] }))] }));
}
//# sourceMappingURL=PageSidebar.js.map