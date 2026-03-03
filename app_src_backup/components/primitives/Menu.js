'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Button } from './Button';
export function MenuTrigger({ children, onClick, disabled = false, ariaLabel }) {
    // Use ariaLabel if provided, otherwise use children text
    const labelText = ariaLabel ?? (typeof children === 'string' ? children : undefined);
    return (_jsx(Button, { variant: "secondary", onClick: onClick, disabled: disabled, "aria-label": labelText, children: children }));
}
export function Menu({ isOpen, onClose, items, align = 'left', className = '', ariaLabel = 'Menu', }) {
    // Close on escape key
    useEffect(() => {
        if (!isOpen || !onClose) {
            return;
        }
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);
    // Close on click outside
    const handleBackdropClick = () => {
        if (onClose) {
            onClose();
        }
    };
    if (!isOpen) {
        return null;
    }
    const alignClass = align === 'right' ? 'right-0' : 'left-0';
    return (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "fixed inset-0 z-30", onClick: handleBackdropClick, "aria-label": "Close menu", "data-testid": "menu-backdrop" }), _jsx("ul", { role: "menu", "aria-label": ariaLabel, className: `absolute ${alignClass} z-40 mt-1 min-w-[160px] rounded-sm border border-border-subtle bg-surface-1 shadow-elevation-2 ${className}`.trim(), children: items.map((item, index) => {
                    if (item.divider) {
                        return (_jsx("li", { children: _jsx("hr", { role: "separator", className: "my-1 border-border-subtle", "data-testid": "menu-divider" }) }, `divider-${index}`));
                    }
                    const Icon = item.icon;
                    return (_jsx("li", { role: "none", children: _jsxs("button", { type: "button", role: "menuitem", disabled: item.disabled, onClick: () => {
                                item.onClick?.();
                                onClose();
                            }, className: `flex w-full items-center gap-2 px-3 py-2 text-xs text-left transition ${item.disabled
                                ? 'text-text-muted cursor-not-allowed'
                                : 'text-text-secondary hover:bg-surface-2'}`, children: [Icon && _jsx(Icon, { size: 14 }), _jsx("span", { children: item.label })] }) }, item.key));
                }) })] }));
}
export function MenuButton({ items, align = 'left', ariaLabel = 'Menu', children, }) {
    const [isOpen, setIsOpen] = useState(false);
    const triggerLabel = typeof children === 'string' ? children : undefined;
    return (_jsxs("div", { className: "relative inline-flex items-center", children: [_jsx(MenuTrigger, { onClick: () => setIsOpen(!isOpen), ariaLabel: triggerLabel, children: children }), _jsx(Menu, { isOpen: isOpen, onClose: () => setIsOpen(false), items: items, align: align, ariaLabel: ariaLabel })] }));
}
//# sourceMappingURL=Menu.js.map