'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { EmptyPanel } from '@/components/primitives/EmptyPanel';
import { ErrorPanel } from '@/components/primitives/ErrorPanel';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { useToast } from '@/components/providers/ToastProvider';
import { ApiClientError } from '@/lib/api';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { SearchResultCard } from '@/components/add/SearchResultCard';
import { SeriesMonitoringOptionsPopover, } from '@/components/add/SeriesMonitoringOptionsPopover';
import { SeriesTypePopover } from '@/components/add/SeriesTypePopover';
function asRecord(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return {};
    }
    return input;
}
export default function AddMediaPage() {
    const api = useMemo(() => getApiClients(), []);
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const { pushToast } = useToast();
    const [mediaType, setMediaType] = useState('TV');
    const [term, setTerm] = useState(() => searchParams.get('q') ?? '');
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const [selected, setSelected] = useState(null);
    const [conflict, setConflict] = useState(null);
    const [config, setConfig] = useState({
        qualityProfileId: 1,
        monitored: true,
        searchNow: true,
        rootFolder: '/tv',
        monitor: 'all',
        seriesType: 'standard',
        seasonFolder: true,
    });
    // Fetch quality profiles dynamically
    const qualityProfilesQuery = useApiQuery({
        queryKey: ['quality-profiles'],
        queryFn: () => api.qualityProfileApi.list(),
        staleTimeKind: 'list',
    });
    const qualityProfiles = qualityProfilesQuery.data ?? [];
    // Set default quality profile when profiles are loaded
    useEffect(() => {
        if (qualityProfiles.length > 0 && !qualityProfiles.find(p => p.id === config.qualityProfileId)) {
            setConfig(current => ({
                ...current,
                qualityProfileId: qualityProfiles[0].id,
            }));
        }
    }, [qualityProfiles, config.qualityProfileId]);
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedTerm(term.trim());
        }, 300);
        return () => clearTimeout(timer);
    }, [term]);
    const searchQuery = useApiQuery({
        queryKey: ['add', 'search', mediaType, debouncedTerm],
        queryFn: () => api.mediaApi.searchMetadata({ term: debouncedTerm, mediaType }),
        enabled: debouncedTerm.length > 1,
        staleTimeKind: 'list',
        isEmpty: data => data.length === 0,
    });
    const existingMoviesQuery = useApiQuery({
        queryKey: queryKeys.moviesList({ page: 1, pageSize: 100, search: debouncedTerm }),
        queryFn: () => api.mediaApi.listMovies({ page: 1, pageSize: 100, search: debouncedTerm }),
        enabled: mediaType === 'MOVIE' && debouncedTerm.length > 1,
        staleTimeKind: 'list',
    });
    const existingSeriesQuery = useApiQuery({
        queryKey: queryKeys.seriesList({ page: 1, pageSize: 100, search: debouncedTerm }),
        queryFn: () => api.mediaApi.listSeries({ page: 1, pageSize: 100, search: debouncedTerm }),
        enabled: mediaType === 'TV' && debouncedTerm.length > 1,
        staleTimeKind: 'list',
    });
    const addMutation = useMutation({
        mutationFn: async () => {
            if (!selected) {
                throw new Error('Select a metadata result first.');
            }
            const payload = asRecord(selected);
            const body = {
                mediaType,
                qualityProfileId: config.qualityProfileId,
                monitored: config.monitored,
                searchNow: config.searchNow,
                rootFolder: config.rootFolder,
                monitor: mediaType === 'TV' ? config.monitor : undefined,
                seriesType: mediaType === 'TV' ? config.seriesType : undefined,
                seasonFolder: mediaType === 'TV' ? config.seasonFolder : undefined,
                title: String(payload.title ?? ''),
                year: Number(payload.year ?? 0),
                status: typeof payload.status === 'string' ? payload.status : undefined,
                overview: typeof payload.overview === 'string' ? payload.overview : undefined,
                network: typeof payload.network === 'string' ? payload.network : undefined,
                tmdbId: typeof payload.tmdbId === 'number' ? payload.tmdbId : undefined,
                tvdbId: typeof payload.tvdbId === 'number' ? payload.tvdbId : undefined,
                imdbId: typeof payload.imdbId === 'string' ? payload.imdbId : undefined,
                posterUrl: typeof payload.posterUrl === 'string' ? payload.posterUrl : undefined,
            };
            return api.mediaApi.addMedia(body);
        },
        onSuccess: created => {
            pushToast({
                title: 'Media added',
                message: config.searchNow ? 'Search on add triggered.' : 'Added without immediate search.',
                variant: 'success',
            });
            setConflict(null);
            setSelected(null);
            void queryClient.invalidateQueries({ queryKey: ['movies'] });
            void queryClient.invalidateQueries({ queryKey: ['series'] });
            void queryClient.invalidateQueries({ queryKey: ['media', 'wanted'] });
            const id = created.id;
            if (mediaType === 'MOVIE') {
                router.push(`/library/movies/${id}`);
            }
            else {
                router.push(`/library/series/${id}`);
            }
        },
        onError: (error) => {
            if (error instanceof ApiClientError && error.code === 'CONFLICT') {
                const details = asRecord(error.details);
                setConflict({
                    existingId: typeof details.existingId === 'number' ? details.existingId : undefined,
                    message: error.message,
                });
                pushToast({
                    title: 'Duplicate detected',
                    message: error.message,
                    variant: 'error',
                });
                return;
            }
            pushToast({
                title: 'Add failed',
                message: error.message,
                variant: 'error',
            });
        },
    });
    const existingIds = new Set();
    if (mediaType === 'MOVIE') {
        for (const row of existingMoviesQuery.data?.items ?? []) {
            existingIds.add(row.tmdbId ?? -1);
        }
    }
    else {
        for (const row of existingSeriesQuery.data?.items ?? []) {
            const candidate = row;
            const tvdbId = candidate.tvdbId;
            if (typeof tvdbId === 'number') {
                existingIds.add(tvdbId);
            }
        }
    }
    const getSelectedKey = () => {
        if (!selected)
            return null;
        return mediaType === 'MOVIE' ? asRecord(selected).tmdbId : asRecord(selected).tvdbId;
    };
    const selectedKey = getSelectedKey();
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("header", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Add Media" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Search metadata, review details, and add movies or series with monitor defaults." })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", onClick: () => router.push('/add/import'), className: "rounded-sm border border-accent-primary bg-accent-primary/10 px-3 py-1.5 text-sm font-medium text-accent-primary hover:bg-accent-primary/20", children: "Import Series" }), _jsx("button", { type: "button", onClick: () => router.push('/add/import/episodes'), className: "rounded-sm border border-accent-primary bg-accent-primary/10 px-3 py-1.5 text-sm font-medium text-accent-primary hover:bg-accent-primary/20", children: "Import Episodes" }), _jsx("button", { type: "button", onClick: () => router.push('/add/import/movies'), className: "rounded-sm border border-accent-primary bg-accent-primary/10 px-3 py-1.5 text-sm font-medium text-accent-primary hover:bg-accent-primary/20", children: "Import Movies" })] })] }), _jsx("div", { className: "flex flex-wrap items-center gap-2", children: ['TV', 'MOVIE'].map(type => (_jsx("button", { type: "button", className: `rounded-sm border px-3 py-1 text-sm ${mediaType === type ? 'border-accent-primary bg-accent-primary/20' : 'border-border-subtle'}`, onClick: () => {
                        setMediaType(type);
                        setSelected(null);
                        setConflict(null);
                    }, children: type === 'MOVIE' ? 'Movies' : 'Series' }, type))) }), _jsxs("label", { className: "block space-y-1 text-sm", children: [_jsx("span", { children: "Search" }), _jsx("input", { value: term, onChange: event => setTerm(event.currentTarget.value), placeholder: `Search for a ${mediaType === 'TV' ? 'series' : 'movie'}...`, className: "w-full rounded-sm border border-border-subtle bg-surface-1 px-3 py-2" })] }), conflict ? (_jsxs("div", { className: "rounded-md border border-status-warning/60 bg-status-warning/10 p-3 text-sm", children: [_jsx("p", { className: "font-semibold text-text-primary", children: "Duplicate found" }), _jsx("p", { className: "text-text-secondary", children: conflict.message }), _jsxs("div", { className: "mt-2 flex gap-2", children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1", onClick: () => {
                                    if (!conflict.existingId) {
                                        return;
                                    }
                                    if (mediaType === 'MOVIE') {
                                        router.push(`/library/movies/${conflict.existingId}`);
                                    }
                                    else {
                                        router.push(`/library/series/${conflict.existingId}`);
                                    }
                                }, children: "Go to existing" }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1", onClick: () => {
                                    pushToast({
                                        title: 'Force add unavailable',
                                        message: 'Backend duplicate constraints rejected this item. Adjust metadata and retry.',
                                        variant: 'info',
                                    });
                                }, children: "Add anyway" })] })] })) : null, _jsx(QueryPanel, { isLoading: searchQuery.isPending, isError: searchQuery.isError, isEmpty: Boolean(searchQuery.isSuccess && searchQuery.data && searchQuery.data.length === 0), errorMessage: searchQuery.error?.message, onRetry: () => void searchQuery.refetch(), emptyTitle: "No results", emptyBody: "Try a broader term or switch media type.", children: _jsx("div", { className: "grid gap-3 lg:grid-cols-2", children: (searchQuery.data ?? []).map(raw => {
                        const item = asRecord(raw);
                        const title = String(item.title ?? 'Unknown title');
                        const year = typeof item.year === 'number' ? item.year : undefined;
                        const keyId = mediaType === 'MOVIE' ? item.tmdbId : item.tvdbId;
                        const alreadyAdded = typeof keyId === 'number' && existingIds.has(keyId);
                        const posterUrl = typeof item.posterUrl === 'string' ? item.posterUrl : undefined;
                        const overview = typeof item.overview === 'string' ? item.overview : undefined;
                        const network = typeof item.network === 'string' ? item.network : undefined;
                        const status = typeof item.status === 'string' ? item.status : undefined;
                        return (_jsx(SearchResultCard, { title: title, year: year, overview: overview, network: network, status: status, posterUrl: posterUrl, tmdbId: typeof item.tmdbId === 'number' ? item.tmdbId : undefined, tvdbId: typeof item.tvdbId === 'number' ? item.tvdbId : undefined, mediaType: mediaType, isSelected: selectedKey === keyId, alreadyAdded: alreadyAdded, onSelect: () => {
                                setSelected(item);
                                setConflict(null);
                            } }, `${mediaType}-${String(keyId ?? title)}`));
                    }) }) }), selected ? (_jsxs("section", { className: "rounded-lg border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Add Configuration" }), _jsxs("div", { className: "mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: [_jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium", children: "Quality Profile" }), _jsx("select", { value: config.qualityProfileId, onChange: event => {
                                            const qualityProfileId = Number.parseInt(event.currentTarget.value, 10);
                                            setConfig(current => ({
                                                ...current,
                                                qualityProfileId,
                                            }));
                                        }, className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-2", disabled: qualityProfilesQuery.isLoading, children: qualityProfilesQuery.isLoading ? (_jsx("option", { value: "", children: "Loading..." })) : qualityProfiles.length === 0 ? (_jsx("option", { value: "", children: "No profiles available" })) : (qualityProfiles.map(profile => (_jsx("option", { value: profile.id, children: profile.name }, profile.id)))) })] }), _jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium", children: "Root Folder" }), _jsx("input", { type: "text", value: config.rootFolder, onChange: event => {
                                            const rootFolder = event.currentTarget.value;
                                            setConfig(current => ({
                                                ...current,
                                                rootFolder,
                                            }));
                                        }, placeholder: "/path/to/media", className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-2" }), _jsx("p", { className: "text-xs text-text-secondary", children: "Path where media files will be stored" })] }), mediaType === 'TV' && (_jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium", children: "Monitor" }), _jsx(SeriesMonitoringOptionsPopover, { value: config.monitor, onChange: monitor => setConfig(current => ({ ...current, monitor })) })] })), mediaType === 'TV' && (_jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium", children: "Series Type" }), _jsx(SeriesTypePopover, { value: config.seriesType, onChange: seriesType => setConfig(current => ({ ...current, seriesType })) })] }))] }), _jsxs("div", { className: "mt-4 flex flex-wrap gap-4", children: [_jsxs("label", { className: "inline-flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: config.monitored, onChange: event => {
                                            const monitored = event.currentTarget.checked;
                                            setConfig(current => ({
                                                ...current,
                                                monitored,
                                            }));
                                        } }), _jsx("span", { children: "Monitored" })] }), _jsxs("label", { className: "inline-flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: config.searchNow, onChange: event => {
                                            const searchNow = event.currentTarget.checked;
                                            setConfig(current => ({
                                                ...current,
                                                searchNow,
                                            }));
                                        } }), _jsx("span", { children: "Start search for missing episodes" })] }), mediaType === 'TV' && (_jsxs("label", { className: "inline-flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: config.seasonFolder, onChange: event => {
                                            const seasonFolder = event.currentTarget.checked;
                                            setConfig(current => ({
                                                ...current,
                                                seasonFolder,
                                            }));
                                        } }), _jsx("span", { children: "Use season folders" })] }))] }), _jsxs("div", { className: "mt-4 flex gap-2", children: [_jsx("button", { type: "button", className: "rounded-sm bg-accent-primary px-4 py-2 text-sm font-medium text-text-on-accent hover:bg-accent-primary/90 disabled:cursor-not-allowed disabled:opacity-50", onClick: () => addMutation.mutate(), disabled: addMutation.isPending, children: addMutation.isPending ? 'Adding...' : `Add ${mediaType === 'TV' ? 'Series' : 'Movie'}` }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-2 text-sm", onClick: () => setSelected(null), children: "Cancel" })] })] })) : (_jsx(EmptyPanel, { title: "Select a result", body: "Choose a metadata card to configure add settings." })), addMutation.isError && !(addMutation.error instanceof ApiClientError) ? (_jsx(ErrorPanel, { title: "Add failed", body: addMutation.error.message, onRetry: () => addMutation.mutate() })) : null] }));
}
//# sourceMappingURL=page.js.map