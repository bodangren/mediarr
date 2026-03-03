'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { RefreshCw, CloudDownload, Trash2, Download } from 'lucide-react';
import { DataTable } from '@/components/primitives/DataTable';
import { ProgressBar } from '@/components/primitives/ProgressBar';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { Button } from '@/components/primitives/Button';
import { MovieCell } from '@/components/activity/MovieCell';
import { QueueRemoveModal } from '@/components/activity/QueueRemoveModal';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { formatBytes, formatSpeed, formatTimeRemaining } from '@/lib/format';
const STATUS_FILTER_OPTIONS = [
    { label: 'All', value: 'all' },
    { label: 'Downloading', value: 'downloading' },
    { label: 'Completed', value: 'completed' },
    { label: 'Paused', value: 'paused' },
    { label: 'Failed', value: 'failed' },
];
const SORT_OPTIONS = [
    { label: 'Time', value: 'time' },
    { label: 'Movie', value: 'movie' },
    { label: 'Quality', value: 'quality' },
    { label: 'Status', value: 'status' },
];
function ProtocolIcon({ protocol }) {
    if (protocol === 'torrent') {
        return _jsx(Download, { size: 16, className: "text-accent-primary", "aria-label": "Torrent" });
    }
    return _jsx(CloudDownload, { size: 16, className: "text-accent-info", "aria-label": "Usenet" });
}
export default function QueuePage() {
    const api = useMemo(() => getApiClients(), []);
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('time');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [removeModalItem, setRemoveModalItem] = useState(null);
    const queueQuery = useApiQuery({
        queryKey: queryKeys.torrents({ page: 1, pageSize: 50 }),
        queryFn: () => api.torrentApi.list({ page: 1, pageSize: 50 }),
        staleTimeKind: 'queue',
        isEmpty: data => data.items.length === 0,
        refetchInterval: 5000, // 5 second polling
    });
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await queueQuery.refetch();
        setIsRefreshing(false);
    };
    const handleRemove = async (options) => {
        if (!removeModalItem)
            return;
        try {
            await api.torrentApi.remove(removeModalItem.id);
            await queueQuery.refetch();
            setRemoveModalItem(null);
        }
        catch (error) {
            console.error('Failed to remove item:', error);
        }
    };
    const handleBulkRemove = async () => {
        try {
            await Promise.all(selectedItems.map(id => api.torrentApi.remove(id)));
            setSelectedItems([]);
            await queueQuery.refetch();
        }
        catch (error) {
            console.error('Failed to remove items:', error);
        }
    };
    // Filter items by status
    const filteredItems = useMemo(() => {
        const items = queueQuery.data?.items ?? [];
        if (statusFilter === 'all')
            return items;
        return items.filter(item => item.status === statusFilter);
    }, [queueQuery.data, statusFilter]);
    // Sort items
    const sortedItems = useMemo(() => {
        return [...filteredItems].sort((a, b) => {
            switch (sortBy) {
                case 'movie':
                    return (a.movieTitle ?? a.releaseTitle).localeCompare(b.movieTitle ?? b.releaseTitle);
                case 'quality':
                    return a.quality.localeCompare(b.quality);
                case 'status':
                    return a.status.localeCompare(b.status);
                case 'time':
                default:
                    return 0; // API should return sorted by time by default
            }
        });
    }, [filteredItems, sortBy]);
    const columns = [
        {
            key: 'select',
            header: '',
            render: row => (_jsx("input", { type: "checkbox", "aria-label": "Select item", checked: selectedItems.includes(row.id), onChange: e => {
                    if (e.target.checked) {
                        setSelectedItems([...selectedItems, row.id]);
                    }
                    else {
                        setSelectedItems(selectedItems.filter(id => id !== row.id));
                    }
                }, className: "h-4 w-4 rounded border-border-subtle bg-surface-1 text-accent-primary" })),
            className: 'w-10',
        },
        {
            key: 'movie',
            header: 'Movie',
            render: row => row.movieId ? (_jsx(MovieCell, { movieId: row.movieId, title: row.movieTitle ?? row.releaseTitle, posterUrl: row.moviePosterUrl, year: row.year })) : (_jsx("div", { className: "truncate font-medium text-text-primary", children: row.releaseTitle })),
            className: 'min-w-[200px]',
        },
        {
            key: 'release',
            header: 'Release',
            render: row => (_jsx("span", { className: "text-sm text-text-primary truncate", children: row.releaseTitle })),
        },
        {
            key: 'status',
            header: 'Status',
            render: row => _jsx(StatusBadge, { status: row.status }),
        },
        {
            key: 'progress',
            header: 'Progress',
            render: row => (_jsxs("div", { className: "space-y-1", children: [_jsx(ProgressBar, { value: row.progress, label: "" }), _jsxs("span", { className: "text-xs text-text-secondary", children: [formatBytes(row.downloaded), " / ", formatBytes(row.size)] })] })),
        },
        {
            key: 'speed',
            header: 'Speed',
            render: row => (_jsx("span", { className: "text-sm text-text-primary", children: formatSpeed(row.speed) })),
            hideOnMobile: true,
        },
        {
            key: 'timeRemaining',
            header: 'Time Remaining',
            render: row => (_jsx("span", { className: "text-sm text-text-secondary", children: formatTimeRemaining(row.timeRemaining) })),
            hideOnMobile: true,
        },
        {
            key: 'quality',
            header: 'Quality',
            render: row => (_jsx("span", { className: "text-xs text-text-primary bg-surface-2 px-2 py-0.5 rounded-sm", children: row.quality })),
        },
        {
            key: 'language',
            header: 'Language',
            render: row => (_jsx("span", { className: "text-sm text-text-secondary", children: row.language ?? '-' })),
            hideOnTablet: true,
        },
        {
            key: 'protocol',
            header: 'Protocol',
            render: row => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(ProtocolIcon, { protocol: row.protocol }), _jsx("span", { className: "text-sm text-text-secondary capitalize", children: row.protocol })] })),
            hideOnTablet: true,
        },
        {
            key: 'indexer',
            header: 'Indexer',
            render: row => (_jsx("span", { className: "text-sm text-text-secondary", children: row.indexer ?? '-' })),
            hideOnMobile: true,
        },
        {
            key: 'actions',
            header: 'Actions',
            render: row => (_jsxs("div", { className: "flex items-center gap-2", children: [row.status === 'queued' && (_jsx(Button, { variant: "secondary", className: "text-xs px-2 py-1", children: "Grab" })), _jsx(Button, { variant: "danger", className: "text-xs px-2 py-1", onClick: () => setRemoveModalItem(row), children: _jsx(Trash2, { size: 14 }) })] })),
        },
    ];
    return (_jsxs("section", { className: "space-y-4", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Queue" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Live torrent queue updates with movie support." })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 rounded-md border border-border-subtle bg-surface-1 p-3", children: [_jsxs(Button, { variant: "secondary", onClick: handleRefresh, disabled: isRefreshing, className: "flex items-center gap-2", children: [_jsx(RefreshCw, { size: 16, className: isRefreshing ? 'animate-spin' : '' }), "Refresh"] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("label", { className: "text-sm text-text-secondary", children: "Filter:" }), _jsx("select", { value: statusFilter, onChange: e => setStatusFilter(e.target.value), className: "rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-sm text-text-primary", children: STATUS_FILTER_OPTIONS.map(option => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("label", { className: "text-sm text-text-secondary", children: "Sort:" }), _jsx("select", { value: sortBy, onChange: e => setSortBy(e.target.value), className: "rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-sm text-text-primary", children: SORT_OPTIONS.map(option => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("div", { className: "ml-auto flex items-center gap-2", children: [_jsxs("span", { className: "flex items-center gap-2 text-xs text-text-secondary", children: [_jsx("span", { className: "h-2 w-2 rounded-full bg-accent-primary animate-pulse" }), "Live"] }), selectedItems.length > 0 && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: "secondary", className: "text-xs", onClick: () => setSelectedItems([]), children: "Clear Selection" }), _jsxs(Button, { variant: "danger", className: "text-xs", onClick: handleBulkRemove, children: ["Remove Selected (", selectedItems.length, ")"] })] }))] })] }), _jsx(QueryPanel, { isLoading: queueQuery.isPending, isError: queueQuery.isError, isEmpty: sortedItems.length === 0 && !queueQuery.isPending, errorMessage: queueQuery.error?.message, onRetry: () => void queueQuery.refetch(), emptyTitle: "Queue is empty", emptyBody: "Grab a release from Wanted to start downloading.", children: _jsx(DataTable, { data: sortedItems, columns: columns, getRowId: row => row.id }) }), removeModalItem && (_jsx(QueueRemoveModal, { isOpen: !!removeModalItem, onClose: () => setRemoveModalItem(null), onConfirm: handleRemove, itemTitle: removeModalItem.movieTitle ?? removeModalItem.releaseTitle }))] }));
}
//# sourceMappingURL=page.js.map