'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { DataTable } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { Button } from '@/components/primitives/Button';
import { LanguageBadge } from '@/components/subtitles/LanguageBadge';
import { SearchProgressIndicator } from '@/components/subtitles/SearchProgressIndicator';
import { WantedCountBadge } from '@/components/subtitles/WantedCountBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { queryKeys } from '@/lib/query/queryKeys';
export default function WantedMoviesPage() {
    const api = getApiClients();
    const queryClient = useQueryClient();
    const { pushToast } = useToast();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [languageFilter, setLanguageFilter] = useState('');
    const queryInput = useMemo(() => {
        const params = { page, pageSize: 25 };
        if (languageFilter)
            params.languageCode = languageFilter;
        return params;
    }, [page, languageFilter]);
    const wantedQuery = useApiQuery({
        queryKey: queryKeys.subtitleWantedMovies(queryInput),
        queryFn: () => api.subtitleWantedApi.listWantedMovies(queryInput),
        staleTimeKind: 'list',
        isEmpty: data => data.items.length === 0,
    });
    const countQuery = useApiQuery({
        queryKey: queryKeys.subtitleWantedCount(),
        queryFn: () => api.subtitleWantedApi.getWantedCount(),
        staleTimeKind: 'list',
    });
    // Filter by search term client-side (API doesn't support search yet)
    const filteredItems = useMemo(() => {
        if (!wantedQuery.data)
            return [];
        if (!search.trim())
            return wantedQuery.data.items;
        const searchTerm = search.toLowerCase();
        return wantedQuery.data.items.filter(item => item.movieTitle.toLowerCase().includes(searchTerm));
    }, [wantedQuery.data, search]);
    // Search all mutation
    const searchAllMutation = useMutation({
        mutationFn: () => api.subtitleWantedApi.searchAllMovies(),
        onSuccess: result => {
            pushToast({
                title: 'Search started',
                message: `Searching for ${result.count ?? 0} missing subtitles...`,
                variant: 'success',
            });
            // Refetch data after a delay to show progress
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: queryKeys.subtitleWantedMovies(queryInput) });
                queryClient.invalidateQueries({ queryKey: queryKeys.subtitleWantedCount() });
            }, 1000);
        },
        onError: () => {
            pushToast({
                title: 'Search failed',
                message: 'Could not start search for missing subtitles',
                variant: 'error',
            });
        },
    });
    // Individual search mutation
    const searchItemMutation = useMutation({
        mutationFn: ({ movieId, languageCode }) => api.subtitleWantedApi.searchMovieItem(movieId, languageCode),
        onSuccess: () => {
            pushToast({
                title: 'Search started',
                message: 'Searching for subtitles...',
                variant: 'success',
            });
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: queryKeys.subtitleWantedMovies(queryInput) });
            }, 1000);
        },
        onError: () => {
            pushToast({
                title: 'Search failed',
                message: 'Could not start search',
                variant: 'error',
            });
        },
    });
    const columns = [
        {
            key: 'movieTitle',
            header: 'Movie',
            render: row => (_jsx(Link, { href: `/library/movies/${row.movieId}`, className: "font-medium text-text-primary hover:text-accent-primary hover:underline", children: row.movieTitle })),
        },
        {
            key: 'year',
            header: 'Year',
            render: row => _jsx("span", { className: "text-sm text-text-secondary", children: row.year ?? '-' }),
        },
        {
            key: 'missingLanguages',
            header: 'Missing Languages',
            render: row => (_jsx("div", { className: "flex flex-wrap gap-1", children: row.missingLanguages.map(lang => (_jsx(LanguageBadge, { languageCode: lang, variant: "missing", onClick: () => searchItemMutation.mutate({ movieId: row.movieId, languageCode: lang }) }, lang))) })),
        },
    ];
    const data = wantedQuery.data;
    return (_jsxs("section", { className: "space-y-4", children: [_jsxs("header", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h1", { className: "text-2xl font-semibold text-text-primary", children: "Wanted Movies" }), _jsx(WantedCountBadge, {})] }), _jsx("p", { className: "text-sm text-text-secondary", children: "Movies with missing subtitle tracks" })] }), _jsxs(Button, { variant: "primary", onClick: () => searchAllMutation.mutate(), disabled: searchAllMutation.isPending || countQuery.data?.moviesCount === 0, className: "gap-2", children: [_jsx(Search, { className: "h-4 w-4" }), searchAllMutation.isPending ? 'Searching...' : 'Search All'] })] }), searchAllMutation.isPending && (_jsx(SearchProgressIndicator, { isSearching: searchAllMutation.isPending, progress: {
                    total: countQuery.data?.moviesCount ?? 0,
                    completed: 0,
                    failed: 0,
                } })), _jsxs("div", { className: "flex flex-col gap-4 sm:flex-row", children: [_jsxs("label", { className: "flex-1 space-y-1 text-sm", children: [_jsx("span", { className: "text-text-secondary", children: "Search by movie title" }), _jsx("input", { value: search, onChange: event => {
                                    setPage(1);
                                    setSearch(event.currentTarget.value);
                                }, className: "w-full rounded-sm border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary", placeholder: "Search movie title..." })] }), _jsxs("label", { className: "sm:w-48 space-y-1 text-sm", children: [_jsx("span", { className: "text-text-secondary", children: "Filter by language" }), _jsx("input", { value: languageFilter, onChange: event => {
                                    setPage(1);
                                    setLanguageFilter(event.currentTarget.value);
                                }, className: "w-full rounded-sm border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary", placeholder: "e.g. en, es, fr" })] })] }), _jsx(QueryPanel, { isLoading: wantedQuery.isPending, isError: wantedQuery.isError, isEmpty: wantedQuery.isResolvedEmpty || filteredItems.length === 0, errorMessage: wantedQuery.error?.message, onRetry: () => void wantedQuery.refetch(), emptyTitle: "No missing subtitles", emptyBody: search || languageFilter
                    ? 'No missing subtitles match your filters'
                    : 'All movies have their required subtitles!', children: _jsx(DataTable, { data: filteredItems, columns: columns, getRowId: row => String(row.movieId), pagination: data
                        ? {
                            page,
                            totalPages: Math.ceil(data.meta.totalCount / queryInput.pageSize),
                            onPrev: () => setPage(p => Math.max(1, p - 1)),
                            onNext: () => setPage(p => Math.min(Math.ceil(data.meta.totalCount / queryInput.pageSize), p + 1)),
                        }
                        : undefined }) })] }));
}
//# sourceMappingURL=page.js.map