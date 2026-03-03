'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { ConfirmModal } from '@/components/primitives/Modal';
import { Button } from '@/components/primitives/Button';
import { LanguageBadge } from '@/components/subtitles/LanguageBadge';
import { getApiClients } from '@/lib/api/client';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { queryKeys } from '@/lib/query/queryKeys';
import { formatRelativeTime } from '@/lib/subtitles/time';
export default function BlacklistMoviesPage() {
    const api = useMemo(() => getApiClients(), []);
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [showClearModal, setShowClearModal] = useState(false);
    const [itemToRemove, setItemToRemove] = useState(null);
    const queryParams = {
        page,
        pageSize,
    };
    const blacklistQuery = useApiQuery({
        queryKey: queryKeys.subtitleBlacklistMovies(queryParams),
        queryFn: () => api.subtitleBlacklistApi.listBlacklistMovies(queryParams),
        staleTimeKind: 'list',
        isEmpty: data => data.items.length === 0,
    });
    const clearBlacklistMutation = useMutation({
        mutationFn: () => api.subtitleBlacklistApi.clearBlacklistMovies(),
        onSuccess: () => {
            setShowClearModal(false);
            queryClient.invalidateQueries({ queryKey: ['subtitle-blacklist', 'movies'] });
        },
    });
    const removeItemMutation = useMutation({
        mutationFn: (id) => api.subtitleBlacklistApi.removeFromBlacklist(id),
        onSuccess: () => {
            setItemToRemove(null);
            queryClient.invalidateQueries({ queryKey: ['subtitle-blacklist', 'movies'] });
        },
    });
    const columns = [
        {
            key: 'movie',
            header: 'Movie',
            render: row => (_jsx(Link, { href: `/library/movies/${row.movieId}`, className: "font-medium hover:underline", children: row.movieTitle })),
        },
        {
            key: 'year',
            header: 'Year',
            render: row => {
                // Extract year from episodeTitle which contains "(2023)" pattern
                const year = row.subtitlePath?.match(/\((\d{4})\)/)?.[1] ?? '-';
                return year;
            },
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
            key: 'reason',
            header: 'Reason',
            render: row => (_jsx("span", { className: "text-sm text-text-secondary max-w-[200px] truncate", children: row.reason })),
            hideOnMobile: true,
        },
        {
            key: 'timestamp',
            header: 'Time',
            render: row => (_jsx("time", { dateTime: row.timestamp, className: "text-xs text-text-secondary", children: formatRelativeTime(row.timestamp) })),
        },
    ];
    const data = blacklistQuery.data;
    const totalCount = data?.meta.totalCount ?? 0;
    return (_jsxs("section", { className: "space-y-4", children: [_jsxs("header", { className: "flex items-center justify-between gap-4", children: [_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Blacklisted Movie Subtitles" }), totalCount > 0 && (_jsx("span", { className: "inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-text-secondary", children: totalCount }))] }), _jsx("p", { className: "text-sm text-text-secondary", children: "Manage blacklisted subtitles for movies." })] }), _jsx(Button, { variant: "danger", onClick: () => setShowClearModal(true), disabled: totalCount === 0, children: "Remove All" })] }), _jsx(QueryPanel, { isLoading: blacklistQuery.isPending, isError: blacklistQuery.isError, isEmpty: blacklistQuery.isResolvedEmpty, errorMessage: blacklistQuery.error?.message, onRetry: () => void blacklistQuery.refetch(), emptyTitle: "No blacklisted subtitles found", emptyBody: "Subtitles are automatically blacklisted when they fail validation checks.", children: _jsx(DataTable, { data: blacklistQuery.data?.items ?? [], columns: columns, getRowId: row => row.id, rowActions: row => (_jsx(Button, { variant: "secondary", onClick: () => setItemToRemove(row.id), children: "Remove" })), pagination: data
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
                        : undefined }) }), _jsx(ConfirmModal, { isOpen: showClearModal, title: "Clear All Blacklisted Subtitles", description: `This will permanently remove all ${totalCount} blacklisted movie subtitles. This action cannot be undone.`, onCancel: () => setShowClearModal(false), onConfirm: () => clearBlacklistMutation.mutate(), cancelLabel: "Cancel", confirmLabel: "Remove All", confirmVariant: "danger", isConfirming: clearBlacklistMutation.isPending }), _jsx(ConfirmModal, { isOpen: itemToRemove !== null, title: "Remove from Blacklist", description: "This subtitle will be removed from the blacklist. It may be downloaded again in the future.", onCancel: () => setItemToRemove(null), onConfirm: () => itemToRemove && removeItemMutation.mutate(itemToRemove), cancelLabel: "Cancel", confirmLabel: "Remove", confirmVariant: "danger", isConfirming: removeItemMutation.isPending })] }));
}
//# sourceMappingURL=page.js.map