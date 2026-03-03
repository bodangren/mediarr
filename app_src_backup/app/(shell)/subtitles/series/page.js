'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { useApiQuery } from '@/lib/query/useApiQuery';
export default function SeriesSubtitleListPage() {
    const api = useMemo(() => getApiClients(), []);
    const queryClient = useQueryClient();
    const { pushToast } = useToast();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [filterMissing, setFilterMissing] = useState(false);
    const queryInput = {
        page,
        pageSize: 25,
        search: search.trim() || undefined,
    };
    const seriesQuery = useApiQuery({
        queryKey: ['series', 'subtitles', 'list', queryInput],
        queryFn: async () => {
            const result = await api.mediaApi.listSeries(queryInput);
            // Transform series data to include subtitle status
            const items = await Promise.all(result.items.map(async (series) => {
                try {
                    const variants = await api.subtitleApi.listSeriesVariants(series.id);
                    const allEpisodes = variants.flatMap(v => v.episodes);
                    const totalEpisodes = allEpisodes.length;
                    const episodesWithSubs = allEpisodes.filter(e => e.subtitleTracks.length > 0);
                    const missingLanguages = new Set();
                    allEpisodes.forEach(e => e.missingSubtitles.forEach(l => missingLanguages.add(l)));
                    return {
                        ...series,
                        seasonCount: variants.length,
                        episodeProgress: { completed: episodesWithSubs.length, total: totalEpisodes },
                        missingSubtitles: Array.from(missingLanguages),
                    };
                }
                catch {
                    return {
                        ...series,
                        seasonCount: 0,
                        episodeProgress: { completed: 0, total: 0 },
                        missingSubtitles: [],
                    };
                }
            }));
            return { ...result, items };
        },
        staleTimeKind: 'list',
        isEmpty: data => data.items.length === 0,
    });
    const filteredItems = useMemo(() => {
        if (!seriesQuery.data)
            return [];
        if (!filterMissing)
            return seriesQuery.data.items;
        return seriesQuery.data.items.filter(item => (item.missingSubtitles?.length ?? 0) > 0);
    }, [seriesQuery.data, filterMissing]);
    const columns = [
        {
            key: 'title',
            header: 'Series',
            render: row => (_jsx(Link, { href: `/subtitles/series/${row.id}`, className: "font-medium hover:underline", children: row.title })),
        },
        {
            key: 'year',
            header: 'Year',
            render: row => row.year ?? '-',
        },
        {
            key: 'seasonCount',
            header: 'Seasons',
            render: row => row.seasonCount ?? 0,
        },
        {
            key: 'episodeProgress',
            header: 'Progress',
            render: row => {
                const progress = row.episodeProgress;
                if (!progress || progress.total === 0)
                    return '-';
                const percent = Math.round((progress.completed / progress.total) * 100);
                return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "h-2 w-16 rounded-full bg-surface-2", children: _jsx("div", { className: "h-2 rounded-full bg-accent-success", style: { width: `${percent}%` } }) }), _jsxs("span", { className: "text-xs text-text-secondary", children: [progress.completed, "/", progress.total] })] }));
            },
        },
        {
            key: 'missingSubtitles',
            header: 'Missing Languages',
            render: row => {
                const missing = row.missingSubtitles ?? [];
                if (missing.length === 0)
                    return _jsx("span", { className: "text-xs text-text-muted", children: "None" });
                return (_jsxs("div", { className: "flex flex-wrap gap-1", children: [missing.slice(0, 3).map(lang => (_jsx("span", { className: "rounded-sm bg-accent-danger/20 px-1.5 py-0.5 text-xs text-text-primary", children: lang }, lang))), missing.length > 3 && (_jsxs("span", { className: "text-xs text-text-muted", children: ["+", missing.length - 3] }))] }));
            },
        },
        {
            key: 'languageProfile',
            header: 'Language Profile',
            render: row => row.languageProfile ?? _jsx("span", { className: "text-xs text-text-muted", children: "-" }),
        },
    ];
    const data = seriesQuery.data;
    return (_jsxs("section", { className: "space-y-4", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Series Subtitles" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Manage subtitle tracks for your TV series." })] }), _jsxs("label", { className: "block space-y-1 text-sm", children: [_jsx("span", { children: "Search by name" }), _jsx("input", { value: search, onChange: event => {
                            setPage(1);
                            setSearch(event.currentTarget.value);
                        }, className: "w-full rounded-sm border border-border-subtle bg-surface-1 px-3 py-2", placeholder: "Search series..." })] }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: filterMissing, onChange: event => setFilterMissing(event.currentTarget.checked), className: "rounded-sm border border-border-subtle" }), _jsx("span", { children: "Only show series with missing subtitles" })] }), _jsx(QueryPanel, { isLoading: seriesQuery.isPending, isError: seriesQuery.isError, isEmpty: seriesQuery.isResolvedEmpty || filteredItems.length === 0, errorMessage: seriesQuery.error?.message, onRetry: () => void seriesQuery.refetch(), emptyTitle: "No series found", emptyBody: filterMissing
                    ? 'No series with missing subtitles. Adjust filters or add series to your library.'
                    : 'Add series to your library to manage subtitles.', children: _jsx(DataTable, { data: filteredItems, columns: columns, getRowId: row => row.id, pagination: data
                        ? {
                            page,
                            totalPages: Math.ceil(data.meta.totalCount / (queryInput.pageSize ?? 25)),
                            onPrev: () => setPage(current => Math.max(1, current - 1)),
                            onNext: () => setPage(current => Math.min(Math.ceil(data.meta.totalCount / (queryInput.pageSize ?? 25)), current + 1)),
                        }
                        : undefined }) })] }));
}
//# sourceMappingURL=page.js.map