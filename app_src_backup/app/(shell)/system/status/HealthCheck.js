import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StatusBadge } from '@/components/primitives/StatusBadge';
const STATUS_MAP = {
    ok: 'completed',
    warning: 'warning',
    error: 'error',
    unknown: 'warning',
};
export function HealthCheck({ check }) {
    const status = STATUS_MAP[check.status];
    return (_jsxs("li", { className: "flex items-start gap-3 border-b border-border-subtle px-4 py-3 last:border-0", children: [_jsx(StatusBadge, { status: status }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("h3", { className: "text-sm font-medium text-text-primary", children: check.source }), _jsx("span", { className: "text-xs text-text-secondary", children: check.type })] }), _jsx("p", { className: "mt-1 text-xs text-text-secondary", children: check.message }), check.lastChecked && (_jsxs("p", { className: "mt-1 text-xs text-text-muted", children: ["Last checked: ", new Date(check.lastChecked).toLocaleString()] }))] })] }));
}
//# sourceMappingURL=HealthCheck.js.map