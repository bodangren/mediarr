'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { Table } from '@/components/primitives/Table';
import { SelectProvider, useSelectContext } from '@/components/primitives/SelectProvider';
import { Button } from '@/components/primitives/Button';
import { EmptyPanel } from '@/components/primitives/EmptyPanel';
import { ImportSeriesRow } from './ImportSeriesRow';
function TableHeader() {
    return (_jsx("thead", { className: "bg-surface-2 text-left text-sm", children: _jsxs("tr", { children: [_jsx("th", { className: "w-10 px-3 py-3", children: _jsx("span", { className: "sr-only", children: "Select" }) }), _jsx("th", { className: "px-3 py-3 font-medium", children: "Series Name" }), _jsx("th", { className: "px-3 py-3 font-medium", children: "Path" }), _jsx("th", { className: "px-3 py-3 font-medium", children: "Files" }), _jsx("th", { className: "px-3 py-3 font-medium", children: "Status" }), _jsx("th", { className: "px-3 py-3 font-medium", children: "Actions" })] }) }));
}
function ImportSeriesTableContent({ detectedSeries, onManualMatch, onImport, onBulkImport, backendSupported, }) {
    const { selectedIds, isSelected, toggleRow, clearSelection } = useSelectContext();
    const selectableIds = useMemo(() => detectedSeries.filter(s => s.status === 'matched').map(s => s.id), [detectedSeries]);
    const matchedSeries = detectedSeries.filter(s => s.status === 'matched');
    if (detectedSeries.length === 0) {
        return (_jsx(EmptyPanel, { title: "No series detected", body: "Enter a folder path and click Scan to detect series in that location." }));
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs(Table, { children: [_jsx(TableHeader, {}), _jsx("tbody", { children: detectedSeries.map(series => (_jsx(ImportSeriesRow, { series: series, isSelected: isSelected(series.id), onSelect: toggleRow, onManualMatch: onManualMatch, onImport: onImport, backendSupported: backendSupported }, series.id))) })] }), selectedIds.length > 0 && (_jsxs("div", { className: "flex items-center justify-between rounded-md border border-border-subtle bg-surface-1 px-4 py-3", children: [_jsxs("div", { className: "text-sm text-text-secondary", children: [selectedIds.length, " series selected for import"] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "secondary", onClick: clearSelection, children: "Clear Selection" }), _jsx(Button, { variant: "primary", onClick: () => {
                                    onBulkImport(selectedIds);
                                    clearSelection();
                                }, disabled: selectedIds.length === 0 || backendSupported === false, title: backendSupported === false ? 'Import requires backend support' : undefined, children: "Import Selected" })] })] })), _jsxs("div", { className: "flex gap-6 text-sm text-text-secondary", children: [_jsxs("span", { children: [_jsx("strong", { className: "text-text-primary", children: matchedSeries.length }), " ready to import"] }), _jsxs("span", { children: [_jsx("strong", { className: "text-text-primary", children: detectedSeries.filter(s => s.status === 'unmatched').length }), ' ', "need manual match"] })] })] }));
}
export function ImportSeriesTable(props) {
    const selectableIds = useMemo(() => props.detectedSeries.filter(s => s.status === 'matched').map(s => s.id), [props.detectedSeries]);
    return (_jsx(SelectProvider, { rowIds: selectableIds, children: _jsx(ImportSeriesTableContent, { ...props }) }));
}
//# sourceMappingURL=ImportSeriesTable.js.map