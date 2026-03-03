'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
export function ImportSeriesRow({ series, isSelected, onSelect, onManualMatch, onImport, backendSupported }) {
    const getStatusIcon = () => {
        switch (series.status) {
            case 'matched':
                return (_jsxs("span", { className: "inline-flex items-center gap-1 text-status-completed", title: "Matched", children: [_jsx(Icon, { name: "success", label: "Matched" }), _jsx("span", { className: "text-xs", children: "Matched" })] }));
            case 'unmatched':
                return (_jsxs("span", { className: "inline-flex items-center gap-1 text-status-warning", title: "Unmatched - Manual selection needed", children: [_jsx(Icon, { name: "warning", label: "Unmatched" }), _jsx("span", { className: "text-xs", children: "Unmatched" })] }));
            case 'pending':
                return (_jsxs("span", { className: "inline-flex items-center gap-1 text-status-downloading", title: "Pending", children: [_jsx(Icon, { name: "refresh", label: "Pending", className: "animate-pulse" }), _jsx("span", { className: "text-xs", children: "Pending" })] }));
            default:
                return null;
        }
    };
    return (_jsxs("tr", { className: "border-b border-border-subtle hover:bg-surface-2", children: [_jsx("td", { className: "px-3 py-3", children: _jsx("input", { type: "checkbox", checked: isSelected, onChange: () => onSelect(series.id), "aria-label": `Select ${series.folderName}`, disabled: series.status === 'unmatched' }) }), _jsx("td", { className: "px-3 py-3", children: _jsxs("div", { children: [_jsx("p", { className: "font-medium text-text-primary", children: series.folderName }), series.matchedSeriesTitle && series.matchedSeriesTitle !== series.folderName && (_jsxs("p", { className: "text-xs text-text-secondary", children: ["Matched as: ", series.matchedSeriesTitle, series.matchedSeriesYear && ` (${series.matchedSeriesYear})`] }))] }) }), _jsx("td", { className: "px-3 py-3 text-sm text-text-secondary max-w-xs truncate", title: series.path, children: series.path }), _jsxs("td", { className: "px-3 py-3 text-sm text-text-secondary", children: [series.fileCount, " file", series.fileCount !== 1 ? 's' : ''] }), _jsx("td", { className: "px-3 py-3", children: getStatusIcon() }), _jsx("td", { className: "px-3 py-3", children: _jsxs("div", { className: "flex items-center gap-2", children: [series.status === 'unmatched' && (_jsxs(Button, { variant: "secondary", onClick: () => onManualMatch(series), className: "text-xs", children: [_jsx(Icon, { name: "search", label: "Search", className: "mr-1" }), "Search"] })), series.status === 'matched' && (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "secondary", onClick: () => onManualMatch(series), className: "text-xs", children: [_jsx(Icon, { name: "edit", label: "Edit", className: "mr-1" }), "Edit"] }), _jsx(Button, { variant: "primary", onClick: () => onImport(series), disabled: backendSupported === false, title: backendSupported === false ? 'Import requires backend support' : undefined, className: "text-xs", children: "Import" })] }))] }) })] }));
}
//# sourceMappingURL=ImportSeriesRow.js.map