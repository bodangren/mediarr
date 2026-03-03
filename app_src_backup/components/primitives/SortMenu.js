'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowUp, ArrowDown } from 'lucide-react';
export function SortMenu({ options, value, direction = 'asc', label = 'Sort', onChange, onDirectionChange, }) {
    const toggleDirection = () => {
        onDirectionChange(direction === 'asc' ? 'desc' : 'asc');
    };
    const DirectionIcon = direction === 'asc' ? ArrowUp : ArrowDown;
    return (_jsxs("div", { className: "inline-flex items-center gap-2 text-xs text-text-secondary", children: [_jsx("span", { children: label }), _jsxs("div", { className: "inline-flex items-center", children: [_jsx("select", { value: value, "aria-label": `${label} by`, className: "rounded-sm rounded-r-none border border-border-subtle bg-surface-1 px-2 py-1 text-xs text-text-primary", onChange: event => onChange(event.currentTarget.value), children: options.map(option => (_jsx("option", { value: option.key, children: option.label }, option.key))) }), _jsx("button", { type: "button", "aria-label": `Toggle sort direction (${direction})`, className: "rounded-sm rounded-l-none border border-l-0 border-border-subtle bg-surface-1 px-2 py-1 text-accent-primary hover:bg-surface-2", onClick: toggleDirection, children: _jsx(DirectionIcon, { size: 14 }) })] })] }));
}
//# sourceMappingURL=SortMenu.js.map