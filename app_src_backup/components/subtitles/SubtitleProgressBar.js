'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatPercent } from '@/lib/format';
function getProgressColorClass(percentage) {
    if (percentage >= 90)
        return 'bg-accent-success';
    if (percentage >= 50)
        return 'bg-accent-warning';
    return 'bg-accent-danger';
}
export function SubtitleProgressBar({ total, complete, label, className = '' }) {
    const percentage = total > 0 ? (complete / total) * 100 : 0;
    const colorClass = getProgressColorClass(percentage);
    return (_jsxs("div", { className: `flex w-full flex-col gap-2 ${className}`, children: [label ? (_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-text-secondary", children: label }), _jsxs("span", { className: "text-sm font-medium text-text-primary", children: [complete, "/", total] })] })) : null, _jsx("div", { className: "h-2 w-full overflow-hidden rounded-full bg-surface-2", role: "progressbar", "aria-valuenow": complete, "aria-valuemin": 0, "aria-valuemax": total, children: _jsx("div", { className: `h-full rounded-full transition-all duration-300 ${colorClass}`, style: { width: `${percentage}%` } }) }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "text-xs text-text-muted", children: [formatPercent(percentage), " complete"] }), _jsxs("span", { className: "text-xs text-text-muted", children: [total - complete, " missing"] })] })] }));
}
//# sourceMappingURL=SubtitleProgressBar.js.map