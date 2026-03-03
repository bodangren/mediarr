'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { ConfirmModal } from '@/components/primitives/Modal';
import { Button } from '@/components/primitives/Button';
import { HistoryFilters } from '@/components/subtitles/HistoryFilters';
import { LanguageBadge } from '@/components/subtitles/LanguageBadge';
import { getApiClients } from '@/lib/api/client';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { queryKeys } from '@/lib/query/queryKeys';
import { formatRelativeTime } from '@/lib/subtitles/time';
import { SUBTITLE_ACTIONS_VALUES, SUBTITLE_PROVIDERS_VALUES, SUBTITLE_LANGUAGES, toMutable, } from '@/lib/subtitles/constants';
export default function SeriesHistoryPage() {
    const api = useMemo(() => getApiClients(), []);
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [filters, setFilters] = useState({});
    const [showClearModal, setShowClearModal] = useState(false);
    const queryParams = {
        page,
        pageSize,
        type: 'series',
        provider: filters.provider,
        languageCode: filters.languageCode,
        action: filters.action,
        startDate: filters.startDate,
        endDate: filters.endDate,
    };
    const historyQuery = useApiQuery({
        queryKey: queryKeys.subtitleHistory('series', queryParams),
        queryFn: () => api.subtitleHistoryApi.listHistory(queryParams),
        staleTimeKind: 'list',
        isEmpty: data => data.items.length === 0,
    });
    const clearHistoryMutation = useMutation({
        mutationFn: () => api.subtitleHistoryApi.clearHistory('series'),
        onSuccess: () => {
            setShowClearModal(false);
            queryClient.invalidateQueries({ queryKey: ['subtitle-history', 'series'] });
        },
    });
    const columns = [
        {
            key: 'series',
            header: 'Series',
            render: row => (_jsx(Link, { href: `/library/series/${row.seriesId}`, className: "font-medium hover:underline", children: row.seriesTitle })),
        },
        {
            key: 'episode',
            header: 'Episode',
            render: row => {
                const season = row.seasonNumber?.toString().padStart(2, '0') ?? '??';
                const episode = row.episodeNumber?.toString().padStart(2, '0') ?? '??';
                return `S${season}E${episode}`;
            },
        },
        {
            key: 'episodeTitle',
            header: 'Title',
            render: row => row.episodeTitle ?? '-',
            hideOnMobile: true,
        },
        {
            key: 'language',
            header: 'Language',
            render: row => (_jsx(LanguageBadge, { languageCode: row.languageCode, variant: "available" })),
        },
        {
            key: 'provider',
            header: 'Provider',
            render: row => row.provider,
            hideOnTablet: true,
        },
        {
            key: 'action',
            header: 'Action',
            render: row => (_jsx("span", { className: "inline-flex rounded-sm bg-surface-2 px-2 py-0.5 text-xs", children: row.action })),
        },
        {
            key: 'score',
            header: 'Score',
            render: row => (_jsx("span", { className: "text-sm font-mono", children: row.score.toFixed(1) })),
            hideOnMobile: true,
        },
        {
            key: 'timestamp',
            header: 'Time',
            render: row => (_jsx("time", { dateTime: row.timestamp, className: "text-xs text-text-secondary", children: formatRelativeTime(row.timestamp) })),
        },
    ];
    const data = historyQuery.data;
    return (_jsxs("section", { className: "space-y-4", children: [_jsxs("header", { className: "flex items-center justify-between gap-4", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Series History" }), _jsx("p", { className: "text-sm text-text-secondary", children: "View subtitle download history for TV series." })] }), _jsx(Button, { variant: "danger", onClick: () => setShowClearModal(true), children: "Clear History" })] }), _jsx(HistoryFilters, { filters: filters, onChange: setFilters, providers: toMutable(SUBTITLE_PROVIDERS_VALUES), languages: toMutable(SUBTITLE_LANGUAGES), actions: toMutable(SUBTITLE_ACTIONS_VALUES) }), _jsx(QueryPanel, { isLoading: historyQuery.isPending, isError: historyQuery.isError, isEmpty: historyQuery.isResolvedEmpty, errorMessage: historyQuery.error?.message, onRetry: () => void historyQuery.refetch(), emptyTitle: "No history found", emptyBody: "Start downloading subtitles for series to see history here.", children: _jsx(DataTable, { data: historyQuery.data?.items ?? [], columns: columns, getRowId: row => row.id, pagination: data
                        ? {
                            page,
                            totalPages: Math.ceil(data.meta.totalCount / (queryParams.pageSize ?? 25)),
                            pageSize: queryParams.pageSize,
                            pageSizeOptions: [10, 25, 50, 100],
                            onPrev: () => setPage(current => Math.max(1, current - 1)),
                            onNext: () => setPage(current => Math.min(Math.ceil(data.meta.totalCount / (queryParams.pageSize ?? 25)), current + 1)),
                            onPageSizeChange: (size) => {
                                setPage(1);
                                setPageSize(size);
                            },
                        }
                        : undefined }) }), _jsx(ConfirmModal, { isOpen: showClearModal, title: "Clear Series History", description: "This will permanently delete all series subtitle history. This action cannot be undone.", onCancel: () => setShowClearModal(false), onConfirm: () => clearHistoryMutation.mutate(), cancelLabel: "Cancel", confirmLabel: "Clear History", confirmVariant: "danger", isConfirming: clearHistoryMutation.isPending })] }));
}
//# sourceMappingURL=page.js.map