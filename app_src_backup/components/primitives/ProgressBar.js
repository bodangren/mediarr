import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatPercent } from '@/lib/format';
export function ProgressBar({ value = 0, indeterminate = false, label }) {
    const clamped = Math.max(0, Math.min(100, value));
    return (_jsxs("div", { className: "flex w-full flex-col gap-1", children: [label ? _jsx("span", { className: "text-xs text-text-secondary", children: label }) : null, _jsx("div", { className: "h-2 w-full overflow-hidden rounded-full bg-surface-2", children: _jsx("div", { className: `h-full rounded-full bg-accent-primary ${indeterminate ? 'animate-indeterminate' : ''}`, style: indeterminate ? undefined : { width: `${clamped}%` }, "aria-label": label ?? 'Progress' }) }), indeterminate ? null : _jsx("span", { className: "text-xs text-text-secondary", children: formatPercent(clamped) })] }));
}
//# sourceMappingURL=ProgressBar.js.map