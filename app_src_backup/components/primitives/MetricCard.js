import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function trendText(trend) {
    if (trend === 'up') {
        return 'Trending up';
    }
    if (trend === 'down') {
        return 'Trending down';
    }
    return 'Stable';
}
export function MetricCard({ label, value, trend, onAction }) {
    return (_jsxs("article", { className: "rounded-lg border border-border-subtle bg-surface-1 px-4 py-3 shadow-elevation-1", children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-text-muted", children: label }), _jsxs("div", { className: "mt-2 flex items-end justify-between gap-3", children: [_jsx("p", { className: "text-2xl font-semibold text-text-primary", children: value }), _jsx("span", { className: "text-xs text-text-secondary", children: trendText(trend) })] }), onAction ? (_jsxs("button", { type: "button", className: "mt-3 rounded-sm border border-border-subtle px-2 py-1 text-xs font-medium text-text-primary hover:bg-surface-2", onClick: onAction, "aria-label": `Open ${label}`, children: ["Open ", label] })) : null] }));
}
//# sourceMappingURL=MetricCard.js.map