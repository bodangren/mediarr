'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronRight } from 'lucide-react';
export function QualityComparison({ current, cutoff, className = '' }) {
    return (_jsxs("div", { className: `flex items-center gap-2 ${className}`, children: [_jsx("span", { className: "text-sm font-medium text-text-primary", children: current }), _jsx(ChevronRight, { className: "h-4 w-4 text-accent-primary", "aria-hidden": "true" }), _jsx("span", { className: "text-sm text-text-muted", children: cutoff })] }));
}
//# sourceMappingURL=QualityComparison.js.map