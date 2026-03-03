'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as Icons from 'lucide-react';
export function PageHeader({ title, actions, onMenuToggle }) {
    return (_jsxs("div", { className: "mb-4 flex items-center justify-between gap-4", children: [_jsx("button", { type: "button", onClick: onMenuToggle, "aria-label": "Toggle sidebar", className: "rounded-sm p-1 text-text-secondary hover:bg-surface-2 hover:text-text-primary lg:hidden", children: _jsx(Icons.Menu, { className: "h-5 w-5" }) }), _jsx("h1", { className: "flex-1 truncate text-xl font-semibold text-text-primary", children: title }), actions && _jsx("div", { className: "flex items-center gap-2", children: actions })] }));
}
//# sourceMappingURL=PageHeader.js.map