'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import { Modal, ModalHeader, ModalBody } from '@/components/primitives/Modal';
import { NAV_ITEMS, isNavActive } from '@/lib/navigation';
import { PageSidebar } from './PageSidebar';
// Icon mapping component
function LucideIcon({ name }) {
    const iconRegistry = Icons;
    const IconComponent = iconRegistry[name];
    if (!IconComponent) {
        return null;
    }
    return _jsx(IconComponent, { className: "h-4 w-4" });
}
// Flatten navigation sections for mobile bottom nav
function flattenNavItems(sections) {
    return sections.flatMap(section => section.items);
}
export function PageLayout({ pathname, sidebarCollapsed, onToggleSidebar, header, children, navItems = NAV_ITEMS, }) {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
    const allNavItems = flattenNavItems(navItems);
    const primaryNavItems = allNavItems.slice(0, 4); // First 4 items in bottom nav
    const overflowNavItems = allNavItems.slice(4); // Remaining items in More menu
    return (_jsxs("div", { className: "min-h-screen bg-surface-0 text-text-primary", children: [_jsxs("div", { className: `mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 ${sidebarCollapsed ? 'lg:grid-cols-[88px_1fr]' : 'lg:grid-cols-[240px_1fr]'}`, children: [_jsx(PageSidebar, { pathname: pathname, collapsed: sidebarCollapsed, onToggle: onToggleSidebar, items: navItems, isOpen: isMobileSidebarOpen, onClose: () => setIsMobileSidebarOpen(false) }), _jsxs("div", { className: "flex min-h-screen flex-col", children: [_jsxs("header", { className: "sticky top-0 z-20 flex items-center gap-3 border-b border-border-subtle bg-surface-1/90 px-4 py-3 backdrop-blur lg:gap-0", children: [_jsx("button", { type: "button", className: "rounded-sm p-1 text-text-secondary hover:bg-surface-2 lg:hidden", onClick: () => setIsMobileSidebarOpen(true), "aria-label": "Open navigation menu", children: _jsx(Icons.Menu, { className: "h-5 w-5" }) }), _jsx("div", { className: "flex-1", children: header })] }), _jsx("main", { className: "flex-1 px-3 pb-20 pt-3 sm:px-4 sm:pt-4 lg:pb-4", children: children })] })] }), _jsx("nav", { className: "fixed bottom-0 left-0 right-0 z-20 border-t border-border-subtle bg-surface-1 px-2 py-1 lg:hidden", "aria-label": "Mobile Navigation", children: _jsxs("ul", { className: "grid grid-cols-5 gap-1", children: [primaryNavItems.map(item => {
                            const active = isNavActive(pathname, item.path);
                            return (_jsx("li", { children: _jsxs(Link, { href: item.path, className: "flex h-full min-h-[44px] flex-col items-center justify-center rounded-sm px-1 py-1.5 text-[10px] sm:px-2 sm:py-2 sm:text-[11px]", "aria-current": active ? 'page' : undefined, children: [_jsx(LucideIcon, { name: item.icon }), _jsx("span", { className: "mt-0.5 truncate", children: item.shortLabel })] }) }, item.path));
                        }), _jsx("li", { children: _jsxs("button", { type: "button", className: "flex h-full min-h-[44px] flex-col items-center justify-center rounded-sm px-1 py-1.5 text-[10px] sm:px-2 sm:py-2 sm:text-[11px]", onClick: () => setIsMobileMoreOpen(true), "aria-label": "More navigation options", "aria-expanded": isMobileMoreOpen, children: [_jsx(Icons.MoreHorizontal, { className: "h-4 w-4" }), _jsx("span", { className: "mt-0.5", children: "More" })] }) })] }) }), _jsxs(Modal, { isOpen: isMobileMoreOpen, ariaLabel: "More navigation", onClose: () => setIsMobileMoreOpen(false), maxWidthClassName: "max-w-md", children: [_jsx(ModalHeader, { title: "More", onClose: () => setIsMobileMoreOpen(false) }), _jsx(ModalBody, { children: _jsx("ul", { className: "space-y-1", role: "menu", children: overflowNavItems.map(item => {
                                const active = isNavActive(pathname, item.path);
                                return (_jsx("li", { role: "none", children: _jsxs(Link, { href: item.path, role: "menuitem", className: `flex items-center gap-3 rounded-sm px-3 py-2 text-sm ${active ? 'bg-accent-primary/20 text-accent-primary' : 'hover:bg-surface-2'}`, onClick: () => setIsMobileMoreOpen(false), children: [_jsx(LucideIcon, { name: item.icon }), _jsx("span", { children: item.label })] }) }, item.path));
                            }) }) })] })] }));
}
//# sourceMappingURL=PageLayout.js.map