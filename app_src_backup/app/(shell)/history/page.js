'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/primitives/DataTable';
import { Label } from '@/components/primitives/Label';
import { ConfirmModal, Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { Button } from '@/components/primitives/Button';
import { MovieCell } from '@/components/activity/MovieCell';
import { ActivityEventBadge } from '@/components/activity/ActivityEventBadge';
import { getApiClients } from '@/lib/api/client';
import { formatRelativeDate } from '@/lib/format';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
const EVENT_TYPE_OPTIONS = [
    { label: 'All events', value: '' },
    { label: 'Movie Grabbed', value: 'MOVIE_GRABBED' },
    { label: 'Movie Downloaded', value: 'MOVIE_DOWNLOADED' },
    { label: 'Movie Imported', value: 'MOVIE_IMPORTED' },
    { label: 'Movie Renamed', value: 'MOVIE_RENAMED' },
    { label: 'File Deleted', value: 'MOVIE_FILE_DELETED' },
    { label: 'Download Failed', value: 'DOWNLOAD_FAILED' },
    { label: 'Grabbed', value: 'RELEASE_GRABBED' },
    { label: 'Query', value: 'INDEXER_QUERY' },
    { label: 'RSS', value: 'INDEXER_RSS' },
    { label: 'Auth', value: 'INDEXER_AUTH' },
];
function getHistoryStatus(success) {
    if (success === true) {
        return 'success';
    }
    if (success === false) {
        return 'failed';
    }
    return 'unknown';
}
function renderStatus(status) {
    if (status === 'success') {
        return _jsx(Label, { tone: "success", children: "success" });
    }
    if (status === 'failed') {
        return _jsx(Label, { tone: "danger", children: "failed" });
    }
    return '-';
}
function formatDetails(details) {
    if (details === undefined || details === null) {
        return '{}';
    }
    try {
        return JSON.stringify(details, null, 2);
    }
    catch {
        return '{}';
    }
}
function downloadHistoryExport(payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
    });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `history-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(objectUrl);
}
export default function HistoryPage() {
    const api = useMemo(() => getApiClients(), []);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [eventType, setEventType] = useState('');
    const [detailsRow, setDetailsRow] = useState(null);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const query = useMemo(() => ({
        page,
        pageSize,
        ...(eventType ? { eventType } : {}),
    }), [eventType, page, pageSize]);
    const historyQuery = useApiQuery({
        queryKey: queryKeys.activity(query),
        queryFn: () => api.activityApi.list(query),
        staleTimeKind: 'list',
        isEmpty: data => data.items.length === 0,
    });
    const columns = useMemo(() => [
        {
            key: 'occurredAt',
            header: 'Time',
            render: row => formatRelativeDate(row.occurredAt),
        },
        {
            key: 'movie',
            header: 'Movie',
            render: row => row.movieId ? (_jsx(MovieCell, { movieId: row.movieId, title: row.movieTitle ?? row.summary, posterUrl: row.moviePosterUrl, size: "small" })) : (_jsx("span", { className: "text-sm text-text-muted", children: "-" })),
        },
        {
            key: 'eventType',
            header: 'Event',
            render: row => _jsx(ActivityEventBadge, { eventType: row.eventType }),
        },
        {
            key: 'quality',
            header: 'Quality',
            render: row => row.quality ? (_jsx("span", { className: "text-xs text-text-primary bg-surface-2 px-2 py-0.5 rounded-sm", children: row.quality })) : (_jsx("span", { className: "text-sm text-text-muted", children: "-" })),
        },
        {
            key: 'indexer',
            header: 'Indexer',
            render: row => row.indexer ? (_jsx("span", { className: "text-sm text-text-secondary", children: row.indexer })) : (_jsx("span", { className: "text-sm text-text-muted", children: "-" })),
        },
        {
            key: 'summary',
            header: 'Summary',
            render: row => (_jsx("span", { className: "text-sm text-text-primary truncate", title: row.summary, children: row.summary })),
        },
        {
            key: 'success',
            header: 'Status',
            render: row => renderStatus(getHistoryStatus(row.success)),
        },
    ], []);
    const meta = historyQuery.data?.meta;
    const exportQuery = useMemo(() => (eventType ? { eventType } : {}), [eventType]);
    const clearHistoryMutation = useMutation({
        mutationFn: () => api.activityApi.clear({}),
        onSuccess: () => {
            setPage(1);
            setIsClearConfirmOpen(false);
            void historyQuery.refetch();
        },
    });
    const markFailedMutation = useMutation({
        mutationFn: (id) => api.activityApi.markFailed(id),
        onSuccess: () => {
            void historyQuery.refetch();
        },
    });
    const exportHistoryMutation = useMutation({
        mutationFn: () => api.activityApi.export(exportQuery),
        onSuccess: exported => {
            downloadHistoryExport(exported.items);
        },
    });
    return (_jsxs("section", { className: "space-y-4", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "History" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Download/import activity timeline with movie support." })] }), _jsxs("div", { className: "flex flex-wrap items-end gap-3 rounded-md border border-border-subtle bg-surface-1 p-3", children: [_jsxs("label", { className: "flex min-w-56 flex-col gap-1 text-xs text-text-secondary", htmlFor: "history-event-type", children: ["Event type", _jsx("select", { id: "history-event-type", value: eventType, className: "rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-sm text-text-primary", onChange: event => {
                                    setEventType(event.currentTarget.value);
                                    setPage(1);
                                }, children: EVENT_TYPE_OPTIONS.map(option => (_jsx("option", { value: option.value, children: option.label }, option.value || 'all'))) })] }), _jsxs("div", { className: "ml-auto flex flex-wrap items-center gap-2", children: [_jsx(Button, { variant: "secondary", disabled: exportHistoryMutation.isPending, onClick: () => {
                                    exportHistoryMutation.mutate();
                                }, children: "Export history" }), _jsx(Button, { variant: "danger", disabled: clearHistoryMutation.isPending, onClick: () => setIsClearConfirmOpen(true), children: "Clear history" })] })] }), _jsx(QueryPanel, { isLoading: historyQuery.isPending, isError: historyQuery.isError, isEmpty: historyQuery.isResolvedEmpty, errorMessage: historyQuery.error?.message, onRetry: () => void historyQuery.refetch(), emptyTitle: "No history records", emptyBody: "Indexer activity will appear once queries and grabs run.", children: _jsx(DataTable, { data: historyQuery.data?.items ?? [], columns: columns, getRowId: row => row.id, rowActions: row => (_jsxs("div", { className: "flex items-center justify-end gap-2", children: [(row.eventType === 'RELEASE_GRABBED' ||
                                row.eventType === 'MOVIE_GRABBED') &&
                                row.success !== false ? (_jsx(Button, { variant: "secondary", className: "text-xs px-2 py-1", onClick: () => markFailedMutation.mutate(row.id), disabled: markFailedMutation.isPending, children: "Mark failed" })) : null, _jsx(Button, { variant: "secondary", className: "text-xs px-2 py-1", onClick: () => setDetailsRow(row), children: "Details" })] })), pagination: {
                        page: meta?.page ?? page,
                        totalPages: Math.max(1, meta?.totalPages ?? 1),
                        pageSize: meta?.pageSize ?? pageSize,
                        onPrev: () => setPage(current => Math.max(1, current - 1)),
                        onNext: () => {
                            const totalPages = Math.max(1, meta?.totalPages ?? 1);
                            setPage(current => Math.min(totalPages, current + 1));
                        },
                        onPageSizeChange: nextPageSize => {
                            setPageSize(nextPageSize);
                            setPage(1);
                        },
                    } }) }), detailsRow ? (_jsxs(Modal, { isOpen: true, ariaLabel: "History details", onClose: () => setDetailsRow(null), children: [_jsx(ModalHeader, { title: "History details", onClose: () => setDetailsRow(null) }), _jsx(ModalBody, { children: _jsxs("div", { className: "space-y-3 text-sm", children: [_jsxs("div", { className: "grid grid-cols-1 gap-2 sm:grid-cols-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-text-secondary", children: "Event" }), _jsx("div", { className: "flex items-center gap-2", children: _jsx(ActivityEventBadge, { eventType: detailsRow.eventType }) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-text-secondary", children: "Status" }), _jsx("div", { children: renderStatus(getHistoryStatus(detailsRow.success)) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-text-secondary", children: "Source" }), _jsx("p", { children: detailsRow.sourceModule ?? 'core' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-text-secondary", children: "Entity" }), _jsx("p", { children: detailsRow.entityRef ?? 'n/a' })] }), detailsRow.movieId ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-text-secondary", children: "Movie" }), _jsx(MovieCell, { movieId: detailsRow.movieId, title: detailsRow.movieTitle ?? 'Unknown', posterUrl: detailsRow.moviePosterUrl })] }), detailsRow.quality ? (_jsxs("div", { children: [_jsx("p", { className: "text-xs text-text-secondary", children: "Quality" }), _jsx("p", { children: detailsRow.quality })] })) : null, detailsRow.indexer ? (_jsxs("div", { children: [_jsx("p", { className: "text-xs text-text-secondary", children: "Indexer" }), _jsx("p", { children: detailsRow.indexer })] })) : null] })) : null] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-text-secondary", children: "Parameters" }), _jsx("pre", { className: "overflow-x-auto rounded-sm border border-border-subtle bg-surface-2 p-2 text-xs text-text-primary", children: formatDetails(detailsRow.details) })] })] }) }), _jsx(ModalFooter, { children: _jsx(Button, { variant: "secondary", onClick: () => setDetailsRow(null), children: "Close" }) })] })) : null, _jsx(ConfirmModal, { isOpen: isClearConfirmOpen, title: "Clear history", description: "This will permanently remove all history records.", onCancel: () => setIsClearConfirmOpen(false), onConfirm: () => clearHistoryMutation.mutate(), confirmLabel: "Clear history", confirmVariant: "danger", isConfirming: clearHistoryMutation.isPending })] }));
}
//# sourceMappingURL=page.js.map