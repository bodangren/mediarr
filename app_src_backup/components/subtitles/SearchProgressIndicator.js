'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ProgressBar } from '@/components/primitives/ProgressBar';
import { Button } from '@/components/primitives/Button';
import { X } from 'lucide-react';
export function SearchProgressIndicator({ isSearching, progress, onDismiss, }) {
    if (!isSearching) {
        return null;
    }
    const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
    return (_jsx("div", { className: "rounded-md border border-border-subtle bg-surface-1 p-4", children: _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "flex-1 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-text-primary", children: "Searching for subtitles..." }), _jsxs("p", { className: "mt-0.5 text-xs text-text-secondary", children: [progress.completed, " of ", progress.total, " completed", progress.failed > 0 && `, ${progress.failed} failed`] })] }), _jsxs("div", { className: "text-sm font-medium text-text-primary", children: [Math.round(percentage), "%"] })] }), _jsx(ProgressBar, { value: percentage })] }), onDismiss && (_jsx(Button, { variant: "secondary", className: "h-8 w-8 p-0", onClick: onDismiss, "aria-label": "Dismiss progress", children: _jsx(X, { className: "h-4 w-4" }) }))] }) }));
}
//# sourceMappingURL=SearchProgressIndicator.js.map