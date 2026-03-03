'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function FilterDropdown({ filters, selectedFilterId, onSelectFilter, onOpenBuilder, label = 'Saved Filter', allLabel = 'All series', id = 'series-filter-dropdown', }) {
    const selectedValue = selectedFilterId === null ? 'all' : String(selectedFilterId);
    return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("label", { className: "sr-only", htmlFor: id, children: label }), _jsxs("select", { id: id, "aria-label": label, className: "rounded-sm border border-border-subtle bg-surface-1 px-2 py-1.5 text-xs", value: selectedValue, onChange: event => {
                    const value = event.currentTarget.value;
                    if (value === 'all') {
                        onSelectFilter(null);
                        return;
                    }
                    if (value === 'custom') {
                        onSelectFilter('custom');
                        onOpenBuilder();
                        return;
                    }
                    const parsedId = Number.parseInt(value, 10);
                    if (Number.isFinite(parsedId)) {
                        onSelectFilter(parsedId);
                    }
                }, children: [_jsx("option", { value: "all", children: allLabel }), filters.map(filter => (_jsx("option", { value: filter.id, children: filter.name }, filter.id))), _jsx("option", { value: "custom", children: "Custom..." })] }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle bg-surface-1 px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary", onClick: onOpenBuilder, children: selectedFilterId && selectedFilterId !== 'custom' ? 'Edit Filter' : 'Build Filter' })] }));
}
//# sourceMappingURL=FilterDropdown.js.map