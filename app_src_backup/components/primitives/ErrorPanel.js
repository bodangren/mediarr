import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ErrorPanel({ title, body, onRetry }) {
    return (_jsxs("section", { className: "rounded-lg border border-status-error/40 bg-status-error/10 px-5 py-4", children: [_jsx("p", { className: "text-sm font-semibold text-text-primary", children: title }), _jsx("p", { className: "mt-1 text-sm text-text-secondary", children: body }), onRetry ? (_jsx("button", { type: "button", className: "mt-3 rounded-sm border border-status-error/60 px-2 py-1 text-xs font-medium text-text-primary hover:bg-status-error/20", onClick: onRetry, children: "Retry" })) : null] }));
}
//# sourceMappingURL=ErrorPanel.js.map