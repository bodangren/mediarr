'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { DataTable } from '@/components/primitives/DataTable';
import { LanguageBadge } from '@/components/subtitles/LanguageBadge';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { Icon } from '@/components/primitives/Icon';
import { StatusBadge } from '@/components/primitives/StatusBadge';
export default function MovieSubtitlesListPage() {
    const api = useMemo(() => getApiClients(), []);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterMissing, setFilterMissing] = useState(false);
    // Query for movies
    const moviesQuery = useQuery({
        queryKey: ['movies-subtitles-list', searchQuery, filterMissing],
        queryFn: async () => {
            const result = await api.mediaApi.listMovies({ search: searchQuery, pageSize: 100 });
            return result.items.map((movie) => ({
                id: movie.id,
                title: movie.title,
                year: movie.year,
                monitored: movie.monitored,
                audioLanguages: movie.audioLanguages ?? undefined,
                languageProfile: movie.languageProfile ?? undefined,
                missingSubtitles: movie.missingSubtitles ?? [],
            }));
        },
    });
    const filteredMovies = useMemo(() => {
        if (!filterMissing) {
            return moviesQuery.data ?? [];
        }
        return (moviesQuery.data ?? []).filter(movie => movie.missingSubtitles.length > 0);
    }, [moviesQuery.data, filterMissing]);
    const handleSearchChange = useCallback((e) => {
        setSearchQuery(e.target.value);
    }, []);
    const handleFilterToggle = useCallback(() => {
        setFilterMissing(prev => !prev);
    }, []);
    const columns = [
        {
            key: 'monitored',
            header: 'Status',
            render: row => row.monitored !== undefined ? (_jsx(StatusBadge, { status: row.monitored ? 'monitored' : 'paused' })) : null,
        },
        {
            key: 'title',
            header: 'Title',
            render: row => (_jsx(Link, { href: `/subtitles/movies/${row.id}`, className: "font-medium text-text-primary hover:text-accent-primary", children: row.title })),
        },
        {
            key: 'year',
            header: 'Year',
            render: row => _jsx("span", { className: "text-sm text-text-secondary", children: row.year ?? '-' }),
        },
        {
            key: 'audioLanguages',
            header: 'Audio Languages',
            render: row => (_jsx("div", { className: "flex flex-wrap gap-1", children: row.audioLanguages && row.audioLanguages.length > 0 ? (row.audioLanguages.map(lang => (_jsx("span", { className: "inline-flex rounded-md bg-surface-2 px-2 py-0.5 text-xs text-text-primary", children: lang }, lang)))) : (_jsx("span", { className: "text-xs text-text-muted", children: "Unavailable" })) })),
        },
        {
            key: 'languageProfile',
            header: 'Language Profile',
            render: row => (row.languageProfile ? (_jsx("span", { className: "inline-flex rounded-md bg-surface-2 px-2 py-1 text-xs text-text-primary", children: row.languageProfile })) : (_jsx("span", { className: "inline-flex rounded-md bg-surface-2 px-2 py-1 text-xs text-text-muted", children: "Unavailable" }))),
        },
        {
            key: 'missingSubtitles',
            header: 'Missing Subtitles',
            render: row => (_jsx("div", { className: "flex flex-wrap gap-1", children: row.missingSubtitles.length > 0 ? (row.missingSubtitles.map(lang => (_jsx(LanguageBadge, { languageCode: lang, variant: "missing" }, lang)))) : (_jsx("span", { className: "text-xs text-text-muted", children: "None" })) })),
        },
    ];
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Movies" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Manage subtitles for your movie library." })] }), _jsxs(Link, { href: "/subtitles/movies/edit", className: "inline-flex items-center gap-2 rounded-sm border border-border-subtle bg-surface-1 px-3 py-1.5 text-sm text-text-primary transition-colors hover:bg-surface-2", children: [_jsx(Icon, { name: "edit", size: 16 }), _jsx("span", { children: "Mass Edit" })] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-surface-1 p-4", children: [_jsxs("div", { className: "flex-1 min-w-[200px]", children: [_jsx("label", { htmlFor: "search-input", className: "mb-1 block text-sm font-medium text-text-primary", children: "Search" }), _jsx("input", { id: "search-input", type: "text", value: searchQuery, onChange: handleSearchChange, placeholder: "Search movies...", className: "w-full rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { id: "filter-missing", type: "checkbox", checked: filterMissing, onChange: handleFilterToggle, className: "h-4 w-4 rounded border-border-subtle bg-surface-1 text-accent-primary focus:ring-2 focus:ring-accent-primary/50" }), _jsx("label", { htmlFor: "filter-missing", className: "text-sm font-medium text-text-primary cursor-pointer", children: "Show only missing subtitles" })] }), _jsxs("div", { className: "text-sm text-text-muted", children: [filteredMovies.length, " movie", filteredMovies.length !== 1 ? 's' : ''] })] }), _jsx(QueryPanel, { isLoading: moviesQuery.isPending, isError: moviesQuery.isError, isEmpty: filteredMovies.length === 0, errorMessage: moviesQuery.error?.message, onRetry: () => void moviesQuery.refetch(), emptyTitle: "No movies found", emptyBody: "Add some movies to your library to manage subtitles.", children: _jsx(DataTable, { data: filteredMovies, columns: columns, getRowId: row => row.id }) })] }));
}
//# sourceMappingURL=page.js.map