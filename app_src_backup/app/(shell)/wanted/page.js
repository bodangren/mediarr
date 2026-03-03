'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { MissingTab } from './MissingTab';
import { CutoffUnmetTab } from './CutoffUnmetTab';
import { MovieMissingTab } from './MovieMissingTab';
import { MovieCutoffUnmetTab } from './MovieCutoffUnmetTab';
function qualityStatus(quality) {
    if (!quality) {
        return 'wanted';
    }
    if (quality.includes('2160')) {
        return 'completed';
    }
    if (quality.includes('1080')) {
        return 'downloading';
    }
    return 'wanted';
}
export default function WantedPage() {
    const api = useMemo(() => getApiClients(), []);
    const queryClient = useQueryClient();
    const router = useRouter();
    const { pushToast } = useToast();
    const [contentType, setContentType] = useState(() => {
        // Try to load from localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                const stored = window.localStorage.getItem('mediarr.wanted.state');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.contentType === 'tv' || parsed.contentType === 'movies') {
                        return parsed.contentType;
                    }
                }
            }
            catch {
                // Fall through to default
            }
        }
        return 'tv';
    });
    const [activeTab, setActiveTab] = useState(() => {
        // Try to load from localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                const stored = window.localStorage.getItem('mediarr.wanted.state');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.activeTab === 'missing' || parsed.activeTab === 'cutoffUnmet') {
                        return parsed.activeTab;
                    }
                }
            }
            catch {
                // Fall through to default
            }
        }
        return 'missing';
    });
    // Persist state to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('mediarr.wanted.state', JSON.stringify({ contentType, activeTab }));
        }
    }, [contentType, activeTab]);
    const [selectedEpisode, setSelectedEpisode] = useState(null);
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [releaseSort, setReleaseSort] = useState('seeders');
    const releaseRequest = selectedEpisode
        ? {
            title: `${selectedEpisode.seriesTitle} S${String(selectedEpisode.seasonNumber).padStart(2, '0')}E${String(selectedEpisode.episodeNumber).padStart(2, '0')}`,
            episodeId: selectedEpisode.id,
            type: 'episode',
        }
        : selectedMovie
            ? {
                title: `${selectedMovie.title} (${selectedMovie.year})`,
                movieId: selectedMovie.movieId,
                type: 'movie',
            }
            : null;
    const releasesQuery = useMemo(() => {
        if (!releaseRequest) {
            return { data: [], isPending: false, isError: false, error: null, refetch: () => Promise.resolve() };
        }
        return {
            data: [],
            isPending: false,
            isError: false,
            error: null,
            refetch: () => api.releaseApi.searchCandidates(releaseRequest).then(data => data),
        };
    }, [releaseRequest, api]);
    const grabMutation = useMutation({
        mutationFn: (candidate) => api.releaseApi.grabRelease(candidate),
        onSuccess: () => {
            pushToast({
                title: 'Release grabbed',
                message: 'Queued for download.',
                variant: 'success',
                action: {
                    label: 'Open queue',
                    onClick: () => router.push('/queue'),
                },
            });
            void queryClient.invalidateQueries({ queryKey: ['torrents'] });
            void queryClient.invalidateQueries({ queryKey: ['media', 'wanted'] });
            void queryClient.invalidateQueries({ queryKey: ['episodes', 'missing'] });
            void queryClient.invalidateQueries({ queryKey: ['episodes', 'cutoff-unmet'] });
            void queryClient.invalidateQueries({ queryKey: ['movies', 'missing'] });
            void queryClient.invalidateQueries({ queryKey: ['movies', 'cutoff-unmet'] });
            router.push('/queue');
        },
        onError: (error, candidate) => {
            pushToast({
                title: 'Grab failed',
                message: error.message,
                variant: 'error',
                action: {
                    label: 'Retry',
                    onClick: () => {
                        grabMutation.mutate(candidate);
                    },
                },
            });
        },
    });
    const handleSearchEpisode = useCallback((episode) => {
        setSelectedEpisode(episode);
        setSelectedMovie(null);
    }, []);
    const handleSearchMovie = useCallback((movie) => {
        setSelectedMovie(movie);
        setSelectedEpisode(null);
    }, []);
    const handleBulkSearchEpisodes = useCallback((episodes) => {
        // For bulk search, we'll trigger searches for each episode
        // In a real implementation, this might be a batch API call
        episodes.forEach(episode => {
            void api.releaseApi.searchCandidates({
                title: `${episode.seriesTitle} S${String(episode.seasonNumber).padStart(2, '0')}E${String(episode.episodeNumber).padStart(2, '0')}`,
                episodeId: episode.id,
                type: 'episode',
            });
        });
        pushToast({
            title: 'Bulk search initiated',
            message: `Searching for ${episodes.length} episode(s).`,
            variant: 'success',
        });
    }, [api, pushToast]);
    const handleBulkSearchMovies = useCallback((movies) => {
        // For bulk search, we'll trigger searches for each movie
        // In a real implementation, this might be a batch API call
        movies.forEach(movie => {
            void api.releaseApi.searchCandidates({
                title: `${movie.title} (${movie.year})`,
                movieId: movie.movieId,
                type: 'movie',
            });
        });
        pushToast({
            title: 'Bulk search initiated',
            message: `Searching for ${movies.length} movie(s).`,
            variant: 'success',
        });
    }, [api, pushToast]);
    const sortedCandidates = [...(releasesQuery.data ?? [])].sort((left, right) => {
        if (releaseSort === 'size') {
            return right.size - left.size;
        }
        if (releaseSort === 'age') {
            return (left.age ?? 0) - (right.age ?? 0);
        }
        return right.seeders - left.seeders;
    });
    const selectedItem = selectedEpisode ?? selectedMovie;
    const itemLabel = selectedEpisode
        ? `${selectedEpisode.seriesTitle} · S${String(selectedEpisode.seasonNumber).padStart(2, '0')}E${String(selectedEpisode.episodeNumber).padStart(2, '0')}`
        : selectedMovie
            ? `${selectedMovie.title} (${selectedMovie.year})`
            : null;
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Wanted" }), _jsx("p", { className: "text-sm text-text-secondary", children: contentType === 'tv'
                            ? 'Track missing episodes, search for releases, and upgrade quality cutoffs.'
                            : 'Track missing movies, search for releases, and upgrade quality cutoffs.' })] }), _jsxs("div", { className: "flex items-center gap-2 border-b border-border-subtle pb-1", children: [_jsx("button", { type: "button", className: `px-3 py-2 text-sm font-medium transition-colors ${contentType === 'tv'
                            ? 'text-accent-primary border-b-2 border-accent-primary'
                            : 'text-text-secondary hover:text-text-primary'}`, onClick: () => setContentType('tv'), children: "TV Series" }), _jsx("button", { type: "button", className: `px-3 py-2 text-sm font-medium transition-colors ${contentType === 'movies'
                            ? 'text-accent-primary border-b-2 border-accent-primary'
                            : 'text-text-secondary hover:text-text-primary'}`, onClick: () => setContentType('movies'), children: "Movies" })] }), _jsxs("div", { className: "flex items-center gap-2 border-b border-border-subtle pb-1", children: [_jsx("button", { type: "button", className: `px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'missing'
                            ? 'text-accent-primary border-b-2 border-accent-primary'
                            : 'text-text-secondary hover:text-text-primary'}`, onClick: () => setActiveTab('missing'), children: "Missing" }), _jsx("button", { type: "button", className: `px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'cutoffUnmet'
                            ? 'text-accent-primary border-b-2 border-accent-primary'
                            : 'text-text-secondary hover:text-text-primary'}`, onClick: () => setActiveTab('cutoffUnmet'), children: "Cutoff Unmet" })] }), contentType === 'tv' ? (activeTab === 'missing' ? (_jsx(MissingTab, { onSearchEpisode: handleSearchEpisode, onBulkSearch: handleBulkSearchEpisodes })) : (_jsx(CutoffUnmetTab, { onSearchEpisode: handleSearchEpisode, onBulkSearch: handleBulkSearchEpisodes }))) : (activeTab === 'missing' ? (_jsx(MovieMissingTab, { onSearchMovie: handleSearchMovie, onBulkSearch: handleBulkSearchMovies })) : (_jsx(MovieCutoffUnmetTab, { onSearchMovie: handleSearchMovie, onBulkSearch: handleBulkSearchMovies }))), selectedItem ? (_jsxs("section", { className: "space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold", children: "Release Candidates" }), _jsx("p", { className: "text-sm text-text-secondary", children: itemLabel })] }), _jsxs("label", { className: "text-sm", children: ["Sort by", ' ', _jsxs("select", { value: releaseSort, className: "rounded-sm border border-border-subtle bg-surface-0 px-2 py-1", onChange: event => setReleaseSort(event.currentTarget.value), children: [_jsx("option", { value: "seeders", children: "Seeders" }), _jsx("option", { value: "size", children: "Size" }), _jsx("option", { value: "age", children: "Age" })] })] })] }), _jsx(QueryPanel, { isLoading: releasesQuery.isPending, isError: releasesQuery.isError, isEmpty: releasesQuery.data?.length === 0, errorMessage: releasesQuery.error?.message, onRetry: () => void releasesQuery.refetch(), emptyTitle: "No candidate releases", emptyBody: "Try broader terms or a different indexer profile.", children: _jsx("div", { className: "overflow-x-auto rounded-md border border-border-subtle", children: _jsxs("table", { className: "min-w-full text-left text-sm", children: [_jsx("thead", { className: "bg-surface-2 text-text-secondary", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "Title" }), _jsx("th", { className: "px-3 py-2", children: "Indexer" }), _jsx("th", { className: "px-3 py-2", children: "Size" }), _jsx("th", { className: "px-3 py-2", children: "Seeders" }), _jsx("th", { className: "px-3 py-2", children: "Age" }), _jsx("th", { className: "px-3 py-2", children: "Quality" }), _jsx("th", { className: "px-3 py-2 text-right", children: "Action" })] }) }), _jsx("tbody", { className: "divide-y divide-border-subtle bg-surface-1", children: sortedCandidates.map(candidate => (_jsxs("tr", { children: [_jsx("td", { className: "px-3 py-2", children: candidate.title }), _jsx("td", { className: "px-3 py-2", children: candidate.indexer }), _jsxs("td", { className: "px-3 py-2", children: [(candidate.size / (1024 * 1024 * 1024)).toFixed(1), " GB"] }), _jsx("td", { className: "px-3 py-2", children: candidate.seeders }), _jsxs("td", { className: "px-3 py-2", children: [candidate.age ?? '-', " d"] }), _jsx("td", { className: "px-3 py-2", children: _jsx(StatusBadge, { status: qualityStatus(candidate.quality) }) }), _jsx("td", { className: "px-3 py-2 text-right", children: _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", onClick: () => grabMutation.mutate(candidate), children: "Grab" }) })] }, `${candidate.indexer}-${candidate.title}`))) })] }) }) })] })) : null] }));
}
//# sourceMappingURL=page.js.map