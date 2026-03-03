'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/primitives/DataTable';
import { Label } from '@/components/primitives/Label';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { Icon } from '@/components/primitives/Icon';
import { getApiClients } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
function getEventLevelTone(level) {
    switch (level) {
        case 'fatal':
        case 'error':
            return 'danger';
        case 'warning':
            return 'warning';
        case 'info':
        default:
            return 'info';
    }
}
function EventLevelBadge({ level }) {
    return _jsx(Label, { tone: getEventLevelTone(level), children: level.toUpperCase() });
}
function formatEventTimestamp(timestamp) {
    const date = new Date(timestamp);
    return formatDateTime(date);
}
export default function EventsPage() {
    const api = useMemo(() => getApiClients(), []);
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState({ page: 1, pageSize: 25 });
    const [selectedEvent, setSelectedEvent] = useState(null);
    // Events query
    const eventsQuery = useApiQuery({
        queryKey: queryKeys.systemEvents(filters),
        queryFn: () => api.systemApi.getEvents(filters),
        staleTimeKind: 'systemEvents',
        isEmpty: data => data.items.length === 0,
    });
    // Clear events mutation
    const clearEventsMutation = useMutation({
        mutationFn: () => api.systemApi.clearEvents(),
        onSuccess: () => {
            void eventsQuery.refetch();
        },
    });
    // Export events mutation
    const exportEventsMutation = useMutation({
        mutationFn: (format) => api.systemApi.exportEvents({ ...filters, format }),
        onSuccess: (blob, format) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `events-${new Date().toISOString()}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },
    });
    // Handle filter changes
    const updateFilter = (key, value) => {
        setFilters(prev => {
            const next = {
                ...prev,
                [key]: value,
            };
            // Reset to page 1 for non-pagination filter changes.
            next.page = key === 'page' && typeof value === 'number' ? value : 1;
            return next;
        });
    };
    // Events table columns
    const columns = useMemo(() => [
        {
            key: 'timestamp',
            header: 'Timestamp',
            render: row => formatEventTimestamp(row.timestamp),
        },
        {
            key: 'level',
            header: 'Level',
            render: row => _jsx(EventLevelBadge, { level: row.level }),
        },
        {
            key: 'type',
            header: 'Type',
            render: row => row.type,
        },
        {
            key: 'message',
            header: 'Message',
            render: row => row.message,
        },
        {
            key: 'source',
            header: 'Source',
            render: row => row.source ?? '-',
        },
    ], []);
    const meta = eventsQuery.data?.meta;
    // Loading state
    if (eventsQuery.isPending) {
        return (_jsxs("section", { className: "space-y-6", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "System Events" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Application event log and notifications timeline." })] }), _jsxs("div", { className: "flex items-center justify-center py-12 text-text-muted", children: [_jsx(Icon, { name: "refresh", label: "Loading", className: "animate-spin h-5 w-5" }), _jsx("span", { className: "ml-2", children: "Loading events..." })] })] }));
    }
    // Error state
    if (eventsQuery.isError) {
        return (_jsxs("section", { className: "space-y-6", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "System Events" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Application event log and notifications timeline." })] }), _jsxs("div", { className: "rounded-md border border-border-danger bg-surface-danger p-4", children: [_jsx("h2", { className: "text-lg font-medium text-text-error", children: "Failed to load events" }), _jsx("p", { className: "text-sm text-text-error", children: eventsQuery.error?.message || 'Unknown error' }), _jsx("button", { type: "button", className: "mt-3 rounded-sm border border-border-subtle px-3 py-1 text-sm text-text-primary hover:bg-surface-2", onClick: () => void eventsQuery.refetch(), children: "Retry" })] })] }));
    }
    return (_jsxs("section", { className: "space-y-6", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "System Events" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Application event log and notifications timeline." })] }), _jsxs("div", { className: "flex flex-wrap items-end gap-3 rounded-md border border-border-subtle bg-surface-1 p-3", children: [_jsxs("label", { className: "flex min-w-40 flex-col gap-1 text-xs text-text-secondary", htmlFor: "filter-level", children: ["Level", _jsxs("select", { id: "filter-level", value: filters.level ?? '', className: "rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-sm text-text-primary", onChange: event => {
                                    updateFilter('level', event.currentTarget.value === '' ? undefined : event.currentTarget.value);
                                }, "aria-label": "Filter by event level", children: [_jsx("option", { value: "", children: "All levels" }), _jsx("option", { value: "info", children: "Info" }), _jsx("option", { value: "warning", children: "Warning" }), _jsx("option", { value: "error", children: "Error" }), _jsx("option", { value: "fatal", children: "Fatal" })] })] }), _jsxs("label", { className: "flex min-w-40 flex-col gap-1 text-xs text-text-secondary", htmlFor: "filter-type", children: ["Type", _jsxs("select", { id: "filter-type", value: filters.type ?? '', className: "rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-sm text-text-primary", onChange: event => {
                                    updateFilter('type', event.currentTarget.value === '' ? undefined : event.currentTarget.value);
                                }, "aria-label": "Filter by event type", children: [_jsx("option", { value: "", children: "All types" }), _jsx("option", { value: "system", children: "System" }), _jsx("option", { value: "indexer", children: "Indexer" }), _jsx("option", { value: "network", children: "Network" }), _jsx("option", { value: "download", children: "Download" }), _jsx("option", { value: "import", children: "Import" }), _jsx("option", { value: "health", children: "Health" }), _jsx("option", { value: "update", children: "Update" }), _jsx("option", { value: "backup", children: "Backup" }), _jsx("option", { value: "other", children: "Other" })] })] }), _jsxs("button", { type: "button", className: "ml-auto flex items-center gap-2 rounded-sm border border-border-subtle px-3 py-1.5 text-sm text-text-primary hover:bg-surface-2 disabled:opacity-60", disabled: exportEventsMutation.isPending, onClick: () => {
                            void exportEventsMutation.mutate('csv');
                        }, "aria-label": "Export events", children: [_jsx(Icon, { name: "download", label: "Export", className: "h-4 w-4" }), exportEventsMutation.isPending ? 'Exporting...' : 'Export'] }), _jsxs("button", { type: "button", className: "flex items-center gap-2 rounded-sm border border-border-danger bg-surface-danger px-3 py-1.5 text-sm text-text-primary hover:bg-surface-danger/80 disabled:opacity-60", disabled: clearEventsMutation.isPending, onClick: () => {
                            if (confirm('Are you sure you want to clear all events? This action cannot be undone.')) {
                                void clearEventsMutation.mutate();
                            }
                        }, "aria-label": "Clear events", children: [_jsx(Icon, { name: "trash", label: "Clear", className: "h-4 w-4" }), clearEventsMutation.isPending ? 'Clearing...' : 'Clear Events'] })] }), _jsx(QueryPanel, { isLoading: false, isError: false, isEmpty: eventsQuery.data?.items.length === 0, errorMessage: undefined, onRetry: () => void eventsQuery.refetch(), emptyTitle: "No events found", emptyBody: "System events will appear here when logged.", children: _jsx(DataTable, { data: eventsQuery.data?.items ?? [], columns: columns, getRowId: row => row.id, onRowClick: row => setSelectedEvent(row), pagination: meta
                        ? {
                            page: meta.page,
                            totalPages: meta.totalPages,
                            pageSize: meta.pageSize,
                            onPrev: () => updateFilter('page', Math.max(1, filters.page - 1)),
                            onNext: () => updateFilter('page', Math.min(meta.totalPages, filters.page + 1)),
                        }
                        : undefined }) }), selectedEvent ? (_jsxs(Modal, { isOpen: true, ariaLabel: "Event Details", onClose: () => setSelectedEvent(null), maxWidthClassName: "max-w-2xl", children: [_jsx(ModalHeader, { title: "Event Details", onClose: () => setSelectedEvent(null) }), _jsx(ModalBody, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(EventLevelBadge, { level: selectedEvent.level }), _jsx("span", { className: "text-sm font-semibold text-text-primary", children: selectedEvent.type.toUpperCase() }), selectedEvent.source && _jsxs("span", { className: "text-sm text-text-secondary", children: ["\u2022 ", selectedEvent.source] })] }), _jsx("p", { className: "text-base text-text-primary", children: selectedEvent.message }), _jsx("p", { className: "text-xs text-text-muted", children: formatEventTimestamp(selectedEvent.timestamp) })] }), selectedEvent.details && Object.keys(selectedEvent.details).length > 0 && (_jsxs("div", { className: "space-y-2", children: [_jsx("h3", { className: "text-sm font-medium text-text-primary", children: "Details" }), _jsx("div", { className: "overflow-x-auto rounded-sm border border-border-subtle bg-surface-2 p-3", children: _jsx("pre", { className: "text-xs text-text-primary whitespace-pre-wrap", children: JSON.stringify(selectedEvent.details, null, 2) }) })] })), _jsxs("div", { className: "flex items-center gap-2 text-xs text-text-muted", children: [_jsx("span", { children: "ID:" }), _jsx("span", { className: "font-mono", children: selectedEvent.id })] })] }) }), _jsx(ModalFooter, { children: _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-1 text-sm text-text-primary hover:bg-surface-2", onClick: () => setSelectedEvent(null), "aria-label": "Close event details", children: "Close" }) })] })) : null] }));
}
//# sourceMappingURL=page.js.map