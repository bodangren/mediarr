'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Page({ title, headerActions, onMenuToggle, children }) {
    return (_jsx("div", { className: "h-full", children: _jsxs("div", { className: "px-4 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-4", children: [title && (_jsxs("div", { className: "mb-4 flex items-center justify-between gap-4", children: [_jsx("h1", { className: "flex-1 truncate text-2xl font-semibold text-text-primary", children: title }), headerActions && _jsx("div", { className: "flex items-center gap-2", children: headerActions })] })), _jsx("div", { className: "flex-1", children: children })] }) }));
}
//# sourceMappingURL=Page.js.map