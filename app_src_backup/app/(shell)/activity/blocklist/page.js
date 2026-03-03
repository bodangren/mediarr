'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/primitives/DataTable';
import { SelectProvider, useSelectContext } from '@/components/primitives/SelectProvider';
import { SelectCheckboxCell } from '@/components/primitives/SelectCheckboxCell';
import { SelectFooter } from '@/components/primitives/SelectFooter';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { Button } from '@/components/primitives/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { MovieCell } from '@/components/activity/MovieCell';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { formatRelativeDate, formatBytesFromString } from '@/lib/format';
import { Ban } from 'lucide-react';
function BlocklistRowActions({ item, onUnblock, }) {
    const [isRemoving, setIsRemoving] = useState(false);
    const handleUnblock = async () => {
        setIsRemoving(true);
        try {
            await onUnblock(item.id);
        }
        finally {
            setIsRemoving(false);
        }
    };
    return (_jsx("div", { className: "flex items-center gap-2", children: _jsxs(Button, { variant: "secondary", onClick: handleUnblock, disabled: isRemoving, className: "flex items-center gap-1 text-xs", children: [_jsx(Ban, { size: 14 }), "Unblock"] }) }));
}
function MobileCheckboxCell({ rowId }) {
    const { isSelected, toggleRow } = useSelectContext();
    return (_jsx("input", { type: "checkbox", "aria-label": "Select row", checked: isSelected(rowId), onChange: event => toggleRow(rowId, event.nativeEvent.shiftKey) }));
}
export default function BlocklistPage() {
    const api = useMemo(() => getApiClients(), []);
    const queryClient = useQueryClient();
    const { pushToast } = useToast();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const blocklistQuery = useApiQuery({
        queryKey: queryKeys.blocklist({ page, pageSize }),
        queryFn: () => api.blocklistApi.list({ page, pageSize }),
        staleTimeKind: 'list',
        isEmpty: data => data.items.length === 0,
    });
    const handleUnblock = async (id) => {
        try {
            await api.blocklistApi.remove([id]);
            await queryClient.invalidateQueries({ queryKey: ['blocklist'] });
            pushToast({
                title: 'Release unblocked',
                message: 'The release has been removed from the blocklist.',
                variant: 'success',
            });
        }
        catch (error) {
            pushToast({
                title: 'Failed to unblock',
                message: error instanceof Error ? error.message : 'An error occurred',
                variant: 'error',
            });
        }
    };
    const handleBulkUnblock = async (selectedIds) => {
        try {
            await api.blocklistApi.remove(selectedIds);
            await queryClient.invalidateQueries({ queryKey: ['blocklist'] });
            pushToast({
                title: 'Releases unblocked',
                message: `${selectedIds.length} releases have been removed from the blocklist.`,
                variant: 'success',
            });
        }
        catch (error) {
            pushToast({
                title: 'Failed to unblock',
                message: error instanceof Error ? error.message : 'An error occurred',
                variant: 'error',
            });
        }
    };
    const formatEpisode = (seasonNumber, episodeNumber) => {
        if (seasonNumber !== undefined && episodeNumber !== undefined) {
            return `S${seasonNumber.toString().padStart(2, '0')}E${episodeNumber.toString().padStart(2, '0')}`;
        }
        return '-';
    };
    const columns = [
        {
            key: 'select',
            header: '',
            render: row => _jsx(SelectCheckboxCell, { rowId: row.id }),
            className: 'w-10',
        },
        {
            key: 'media',
            header: 'Media',
            render: row => row.movieId ? (_jsx(MovieCell, { movieId: row.movieId, title: row.movieTitle ?? row.releaseTitle, posterUrl: row.moviePosterUrl, year: row.year })) : row.seriesTitle ? (_jsxs("div", { children: [_jsx("p", { className: "font-medium text-text-primary", children: row.seriesTitle }), _jsx("p", { className: "text-xs text-text-secondary", children: formatEpisode(row.seasonNumber, row.episodeNumber) })] })) : (_jsx("span", { className: "text-sm text-text-muted", children: "-" })),
        },
        {
            key: 'releaseTitle',
            header: 'Release Title',
            render: row => (_jsx("span", { className: "text-sm text-text-primary", children: row.releaseTitle })),
        },
        {
            key: 'quality',
            header: 'Quality',
            render: row => (_jsx("span", { className: "text-xs text-text-primary bg-surface-2 px-2 py-0.5 rounded-sm", children: row.quality ?? '-' })),
        },
        {
            key: 'size',
            header: 'Size',
            render: row => (_jsx("span", { className: "text-sm text-text-secondary", children: row.size ? formatBytesFromString(row.size) : '-' })),
            hideOnMobile: true,
        },
        {
            key: 'dateBlocked',
            header: 'Date Blocked',
            render: row => (_jsx("span", { className: "text-sm text-text-secondary", children: formatRelativeDate(row.dateBlocked) })),
        },
        {
            key: 'reason',
            header: 'Reason',
            render: row => (_jsx("span", { className: "text-sm text-text-muted", title: row.reason, children: row.reason.length > 50
                    ? `${row.reason.slice(0, 50)}...`
                    : row.reason })),
            hideOnMobile: true,
        },
        {
            key: 'indexer',
            header: 'Indexer',
            render: row => (_jsx("span", { className: "text-sm text-text-secondary", children: row.indexer ?? '-' })),
            hideOnTablet: true,
        },
    ];
    const data = blocklistQuery.data?.items ?? [];
    const meta = blocklistQuery.data?.meta;
    const rowIds = data.map(row => row.id);
    return (_jsx(SelectProvider, { rowIds: rowIds, children: _jsxs("section", { className: "space-y-4", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Blocklist" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Manage blocked releases (Sonarr/Radarr style)." })] }), _jsx(SelectFooter, { actions: [
                        {
                            label: 'Remove Selected',
                            onClick: handleBulkUnblock,
                        },
                    ] }), _jsx(QueryPanel, { isLoading: blocklistQuery.isPending, isError: blocklistQuery.isError, isEmpty: blocklistQuery.isResolvedEmpty, errorMessage: blocklistQuery.error?.message, onRetry: () => void blocklistQuery.refetch(), emptyTitle: "Blocklist is empty", emptyBody: "Releases will be added to the blocklist when they fail quality checks or are manually blocked.", children: _jsx(DataTable, { data: data, columns: columns, getRowId: row => row.id, rowActions: row => (_jsx(BlocklistRowActions, { item: row, onUnblock: handleUnblock })), pagination: meta
                            ? {
                                page: meta.page,
                                totalPages: meta.totalPages,
                                pageSize: meta.pageSize,
                                pageSizeOptions: [10, 25, 50, 100],
                                onPrev: () => setPage(p => Math.max(1, p - 1)),
                                onNext: () => setPage(p => Math.min(meta.totalPages, p + 1)),
                                onPageSizeChange: setPageSize,
                            }
                            : undefined, mobileCardView: true, renderMobileCard: row => (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-start justify-between", children: [row.movieId ? (_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "font-medium text-text-primary", children: row.movieTitle }), _jsx("p", { className: "text-xs text-text-secondary", children: row.releaseTitle })] })) : row.seriesTitle ? (_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "font-medium text-text-primary", children: row.seriesTitle }), _jsx("p", { className: "text-xs text-text-secondary", children: row.releaseTitle })] })) : null, _jsx(MobileCheckboxCell, { rowId: row.id })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2 text-xs", children: [row.seriesTitle ? (_jsxs("div", { children: [_jsx("span", { className: "text-text-secondary", children: "Episode:" }), _jsx("span", { className: "ml-1 text-text-primary", children: formatEpisode(row.seasonNumber, row.episodeNumber) })] })) : null, _jsxs("div", { children: [_jsx("span", { className: "text-text-secondary", children: "Quality:" }), _jsx("span", { className: "ml-1 text-text-primary", children: row.quality ?? '-' })] }), _jsxs("div", { children: [_jsx("span", { className: "text-text-secondary", children: "Date:" }), _jsx("span", { className: "ml-1 text-text-primary", children: formatRelativeDate(row.dateBlocked) })] }), _jsxs("div", { children: [_jsx("span", { className: "text-text-secondary", children: "Reason:" }), _jsx("span", { className: "ml-1 text-text-muted", title: row.reason, children: row.reason.length > 20
                                                        ? `${row.reason.slice(0, 20)}...`
                                                        : row.reason })] })] }), _jsx("div", { className: "pt-2", children: _jsx(BlocklistRowActions, { item: row, onUnblock: handleUnblock }) })] })) }) })] }) }));
}
//# sourceMappingURL=page.js.map