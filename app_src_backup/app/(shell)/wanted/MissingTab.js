'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { Button } from '@/components/primitives/Button';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/providers/ToastProvider';
export function MissingTab({ onSearchEpisode, onBulkSearch }) {
    const api = useMemo(() => getApiClients(), []);
    const queryClient = useQueryClient();
    const router = useRouter();
    const { pushToast } = useToast();
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState('airDate');
    const [sortDir, setSortDir] = useState('desc');
    const [selectedEpisodes, setSelectedEpisodes] = useState(new Set());
    const missingQuery = useApiQuery({
        queryKey: queryKeys.missingEpisodes({
            page,
            pageSize: 25,
            sortBy,
            sortDir,
        }),
        queryFn: () => api.mediaApi.listMissingEpisodes({
            page,
            pageSize: 25,
            sortBy,
            sortDir,
        }),
        staleTimeKind: 'list',
        isEmpty: data => data.items.length === 0,
    });
    const columns = [
        {
            key: 'seriesTitle',
            header: 'Series',
            sortable: true,
            render: row => row.seriesTitle,
        },
        {
            key: 'episode',
            header: 'Episode',
            render: row => `S${String(row.seasonNumber).padStart(2, '0')}E${String(row.episodeNumber).padStart(2, '0')}`,
        },
        {
            key: 'episodeTitle',
            header: 'Title',
            render: row => row.episodeTitle,
        },
        {
            key: 'airDate',
            header: 'Air Date',
            sortable: true,
            render: row => new Date(row.airDate).toLocaleDateString(),
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: row => _jsx(StatusBadge, { status: row.status === 'missing' ? 'wanted' : 'monitored' }),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: row => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: selectedEpisodes.has(row.id), onChange: e => {
                            const newSelected = new Set(selectedEpisodes);
                            if (e.currentTarget.checked) {
                                newSelected.add(row.id);
                            }
                            else {
                                newSelected.delete(row.id);
                            }
                            setSelectedEpisodes(newSelected);
                        }, className: "rounded-sm border-border-subtle bg-surface-1" }), _jsx(Button, { variant: "secondary", onClick: () => onSearchEpisode(row), className: "px-2 py-1 text-xs", children: "Search" })] })),
        },
    ];
    const handleSort = (key) => {
        if (key === sortBy) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        }
        else {
            setSortBy(key);
            setSortDir('asc');
        }
        setPage(1);
    };
    const handleBulkSearch = () => {
        const selectedItems = missingQuery.data?.items.filter(item => selectedEpisodes.has(item.id)) ?? [];
        if (selectedItems.length > 0) {
            onBulkSearch(selectedItems);
            setSelectedEpisodes(new Set());
        }
    };
    const formatEpisodeIdentifier = (episode) => {
        return `${episode.seriesTitle} S${String(episode.seasonNumber).padStart(2, '0')}E${String(episode.episodeNumber).padStart(2, '0')}`;
    };
    return (_jsxs("section", { className: "space-y-4", children: [_jsxs("header", { className: "flex flex-wrap items-center justify-between gap-2", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold", children: "Missing Episodes" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Episodes that have aired but don't have files yet." })] }), selectedEpisodes.size > 0 && (_jsxs(Button, { variant: "primary", onClick: handleBulkSearch, children: ["Search ", selectedEpisodes.size, " selected"] }))] }), _jsx(QueryPanel, { isLoading: missingQuery.isPending, isError: missingQuery.isError, isEmpty: missingQuery.isResolvedEmpty, errorMessage: missingQuery.error?.message, onRetry: () => void missingQuery.refetch(), emptyTitle: "No missing episodes", emptyBody: "All monitored episodes have been downloaded.", children: _jsx(DataTable, { data: missingQuery.data?.items ?? [], columns: columns, getRowId: row => row.id, pagination: {
                        page,
                        totalPages: missingQuery.data?.meta.totalPages ?? 1,
                        onPrev: () => setPage(current => Math.max(1, current - 1)),
                        onNext: () => setPage(current => Math.min(missingQuery.data?.meta.totalPages ?? 1, current + 1)),
                    }, sort: { key: sortBy, direction: sortDir }, onSort: handleSort }) })] }));
}
//# sourceMappingURL=MissingTab.js.map