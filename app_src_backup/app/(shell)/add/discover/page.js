'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { EmptyPanel } from '@/components/primitives/EmptyPanel';
import { Icon } from '@/components/primitives/Icon';
import { DiscoverFilters } from '@/components/discover/DiscoverFilters';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
function DiscoverMovieCard({ movie, onAdd }) {
    const posterUrl = movie.posterUrl ?? '/images/placeholder-poster.png';
    return (_jsxs("div", { className: "group relative flex flex-col gap-2 overflow-hidden rounded-md border border-border-subtle bg-surface-1 transition-all hover:shadow-elevation-2", children: [_jsxs("div", { className: "relative aspect-[2/3] overflow-hidden bg-surface-2", children: [_jsx("img", { src: posterUrl, alt: movie.title, className: "h-full w-full object-cover transition-transform duration-300 group-hover:scale-105", loading: "lazy", onError: event => {
                            const target = event.currentTarget;
                            target.src = '/images/placeholder-poster.png';
                        } }), _jsxs("div", { className: "absolute bottom-2 left-2 rounded-full bg-surface-0/90 px-2 py-1 text-xs font-medium text-text-primary", children: ["\u2B50 ", movie.ratings.tmdb.toFixed(1)] }), movie.inLibrary && (_jsxs("div", { className: "absolute right-2 top-2 flex items-center gap-1 rounded-full bg-status-completed/20 px-2 py-1 text-xs font-medium text-status-completed", children: [_jsx(Icon, { name: "success", className: "h-3 w-3" }), _jsx("span", { children: "In Library" })] })), _jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-surface-0/80 opacity-0 transition-opacity group-hover:opacity-100", children: _jsx("button", { type: "button", onClick: () => onAdd(movie), disabled: movie.inLibrary, className: "rounded-sm bg-accent-primary px-4 py-2 text-sm font-medium text-text-on-accent transition-colors hover:bg-accent-primary/90 disabled:cursor-not-allowed disabled:opacity-50", children: movie.inLibrary ? 'Already Added' : 'Add to Library' }) })] }), _jsxs("div", { className: "flex flex-col gap-1 px-2 pb-2", children: [_jsx("h3", { className: "line-clamp-2 text-sm font-medium text-text-primary group-hover:text-accent-primary", children: movie.title }), _jsxs("div", { className: "flex items-center gap-2 text-xs text-text-secondary", children: [_jsx("span", { children: movie.year }), movie.certification && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-border-subtle", children: "\u2022" }), _jsx("span", { children: movie.certification })] }))] })] })] }));
}
export default function DiscoverMoviesPage() {
    const router = useRouter();
    const [mode, setMode] = useState('popular');
    const [filters, setFilters] = useState({
        genres: [],
    });
    const [showFilters, setShowFilters] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState(null);
    const { discoverApi } = getApiClients();
    const { data: movies = [], isPending, isError, refetch } = useQuery({
        queryKey: queryKeys.discoverMovies(mode),
        queryFn: () => discoverApi.listRecommendations({ mode }),
    });
    const filteredMovies = useMemo(() => {
        return movies.filter(movie => {
            if (filters.minYear && movie.year < filters.minYear) {
                return false;
            }
            if (filters.maxYear && movie.year > filters.maxYear) {
                return false;
            }
            if (filters.genres.length > 0) {
                const hasGenre = filters.genres.some(genre => movie.genres.includes(genre));
                if (!hasGenre) {
                    return false;
                }
            }
            if (filters.certification && movie.certification !== filters.certification) {
                return false;
            }
            return true;
        });
    }, [movies, filters]);
    const handleAddMovie = (movie) => {
        setSelectedMovie(movie);
        router.push(`/add/new?q=${encodeURIComponent(movie.title)}`);
    };
    const handleApplyFilters = () => {
        setShowFilters(false);
    };
    const handleClearFilters = () => {
        setFilters({ genres: [] });
        setShowFilters(false);
    };
    const activeFiltersCount = (filters.minYear ? 1 : 0) +
        (filters.maxYear ? 1 : 0) +
        filters.genres.length +
        (filters.certification ? 1 : 0) +
        (filters.language ? 1 : 0);
    return (_jsxs("section", { className: "space-y-4", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Discover Movies" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Browse and discover new movies to add to your library." })] }), _jsx("div", { className: "flex flex-wrap gap-2", children: ['popular', 'top-rated', 'new-releases', 'upcoming'].map(m => (_jsx("button", { type: "button", className: `rounded-sm border px-3 py-1.5 text-sm capitalize transition-colors ${mode === m
                        ? 'border-accent-primary bg-accent-primary/20 text-accent-primary'
                        : 'border-border-subtle bg-surface-1 text-text-primary hover:bg-surface-2'}`, onClick: () => setMode(m), children: m.replace('-', ' ') }, m))) }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("button", { type: "button", onClick: () => setShowFilters(!showFilters), className: `flex items-center gap-2 rounded-sm border px-3 py-1.5 text-sm transition-colors ${activeFiltersCount > 0
                            ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                            : 'border-border-subtle bg-surface-1 text-text-primary hover:bg-surface-2'}`, children: [_jsx(Icon, { name: "settings" }), _jsx("span", { children: "Filters" }), activeFiltersCount > 0 && _jsx("span", { className: "rounded-full bg-accent-primary px-1.5 text-xs text-text-on-accent", children: activeFiltersCount })] }), _jsxs("span", { className: "text-sm text-text-secondary", children: [filteredMovies.length, " results"] })] }), _jsxs("div", { className: "flex gap-4", children: [showFilters && (_jsx("div", { className: "hidden w-64 lg:block", children: _jsx(DiscoverFilters, { filters: filters, onChange: setFilters, onApply: handleApplyFilters, onClear: handleClearFilters }) })), _jsx("div", { className: "flex-1", children: _jsx(QueryPanel, { isLoading: isPending, isError: isError, isEmpty: filteredMovies.length === 0, emptyTitle: "No movies found", emptyBody: "Try adjusting your filters or switching to a different mode.", onRetry: () => refetch(), children: _jsx("div", { className: "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6", children: filteredMovies.map((movie) => (_jsx(DiscoverMovieCard, { movie: movie, onAdd: handleAddMovie }, movie.tmdbId))) }) }) })] }), showFilters && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-surface-3/70 p-4 lg:hidden", children: _jsxs("div", { className: "w-full max-w-md rounded-md bg-surface-1 p-4", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Filters" }), _jsx("button", { type: "button", onClick: () => setShowFilters(false), className: "rounded-sm border border-border-subtle px-2 py-1 text-sm", children: "Close" })] }), _jsx(DiscoverFilters, { filters: filters, onChange: setFilters, onApply: handleApplyFilters, onClear: handleClearFilters })] }) }))] }));
}
//# sourceMappingURL=page.js.map