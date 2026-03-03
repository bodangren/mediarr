import { jsx as _jsx } from "react/jsx-runtime";
export function SkeletonBlock({ className = 'h-4 w-full', ariaLabel = 'loading' }) {
    return (_jsx("div", { "aria-label": ariaLabel, className: `animate-pulse rounded-sm bg-surface-2 ${className}`, role: "status" }));
}
//# sourceMappingURL=SkeletonBlock.js.map