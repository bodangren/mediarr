'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Search, Film, Calendar, ChevronDown, ChevronUp, Globe, ExternalLink, Tag, X, FolderSync } from 'lucide-react';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { Button } from '@/components/primitives/Button';
import { InteractiveSearchModal } from '@/components/search';
import { OrganizePreviewModal } from '@/components/series/OrganizePreviewModal';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useOptimisticMutation } from '@/lib/query/useOptimisticMutation';
export default function SeriesDetailPage() {
    const api = useMemo(() => getApiClients(), []);
    const params = useParams();
    const id = Number.parseInt(params.id, 10);
    // State for interactive search modal
    const [searchModal, setSearchModal] = useState({
        isOpen: false,
        episodeId: null,
        episodeNumber: undefined,
        episodeTitle: undefined,
        seasonNumber: 0,
    });
    // State for collapsible sections
    const [alternateTitlesOpen, setAlternateTitlesOpen] = useState(false);
    // State for organize preview modal
    const [organizeModalOpen, setOrganizeModalOpen] = useState(false);
    const openSearchModal = (seasonNumber, episode) => {
        setSearchModal({
            isOpen: true,
            episodeId: episode?.id ?? null,
            episodeNumber: episode?.episodeNumber,
            episodeTitle: episode?.title,
            seasonNumber,
        });
    };
    const closeSearchModal = () => {
        setSearchModal(prev => ({ ...prev, isOpen: false }));
    };
    const seriesQuery = useApiQuery({
        queryKey: queryKeys.seriesDetail(id),
        queryFn: () => api.mediaApi.getSeries(id),
        staleTimeKind: 'detail',
    });
    const episodeMonitoredMutation = useOptimisticMutation({
        queryKey: queryKeys.seriesDetail(id),
        mutationFn: variables => api.mediaApi.setEpisodeMonitored(variables.id, variables.monitored),
        updater: (current, variables) => {
            return {
                ...current,
                seasons: current.seasons?.map(season => ({
                    ...season,
                    episodes: season.episodes?.map(episode => {
                        if (episode.id !== variables.id) {
                            return episode;
                        }
                        return { ...episode, monitored: variables.monitored };
                    }),
                })),
            };
        },
        errorMessage: 'Could not update episode monitored state.',
    });
    const series = seriesQuery.data;
    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString)
            return 'TBA';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };
    return (_jsxs("section", { className: "space-y-4", children: [_jsx("header", { className: "space-y-2", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-semibold", children: series?.title ?? 'Series Detail' }), _jsxs("p", { className: "text-sm text-text-secondary", children: ["Year: ", series?.year ?? '-', " \u00B7 Status: ", series?.status ?? 'unknown', series?.network && ` · Network: ${series.network}`] })] }), series && (_jsxs(Button, { variant: "secondary", onClick: () => setOrganizeModalOpen(true), children: [_jsx(FolderSync, { size: 16, className: "mr-1" }), "Preview Rename"] }))] }) }), series && (series.tmdbId || series.imdbId || series.tvdbId) && (_jsxs("div", { className: "flex gap-2", children: [series.imdbId && (_jsxs("a", { href: `https://www.imdb.com/title/${series.imdbId}`, target: "_blank", rel: "noopener noreferrer", className: "inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary", "aria-label": "View on IMDb", children: [_jsx(Film, { size: 14 }), "IMDb"] })), series.tvdbId && (_jsxs("a", { href: `https://thetvdb.com/series/${series.tvdbId}`, target: "_blank", rel: "noopener noreferrer", className: "inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary", "aria-label": "View on TheTVDB", children: [_jsx(ExternalLink, { size: 14 }), "TVDB"] })), series.tmdbId && (_jsxs("a", { href: `https://www.themoviedb.org/tv/${series.tmdbId}`, target: "_blank", rel: "noopener noreferrer", className: "inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary", "aria-label": "View on TMDB", children: [_jsx(Globe, { size: 14 }), "TMDB"] }))] })), series?.overview && (_jsxs("div", { className: "rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-sm font-semibold text-text-primary mb-2", children: "Overview" }), _jsx("p", { className: "text-sm text-text-secondary leading-relaxed", children: series.overview })] })), _jsx(QueryPanel, { isLoading: seriesQuery.isPending, isError: seriesQuery.isError, isEmpty: Boolean(seriesQuery.isSuccess && !series), errorMessage: seriesQuery.error?.message, onRetry: () => void seriesQuery.refetch(), emptyTitle: "Series not found", emptyBody: "The selected series no longer exists.", children: _jsx("div", { className: "space-y-3", children: (series?.seasons ?? []).map(season => (_jsxs("details", { className: "rounded-md border border-border-subtle bg-surface-1", open: true, children: [_jsxs("summary", { className: "cursor-pointer px-4 py-3 text-sm font-semibold text-text-primary flex items-center justify-between", children: [_jsxs("span", { children: ["Season ", season.seasonNumber] }), _jsxs(Button, { variant: "primary", onClick: (e) => {
                                            e.preventDefault();
                                            openSearchModal(season.seasonNumber);
                                        }, className: "text-xs", children: [_jsx(Search, { size: 12, className: "mr-1" }), "Search Season"] })] }), _jsx("div", { className: "space-y-2 border-t border-border-subtle px-4 py-3", children: (season.episodes ?? []).map(episode => {
                                    const monitored = Boolean(episode.monitored);
                                    const hasFile = Boolean(episode.path);
                                    return (_jsxs("div", { className: "flex items-center gap-3 rounded-sm bg-surface-0 px-3 py-2", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("p", { className: "text-sm font-medium", children: ["E", episode.episodeNumber, ": ", episode.title] }), _jsxs("p", { className: "text-xs text-text-secondary", children: [episode.airDateUtc ? (_jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Calendar, { size: 12 }), formatDate(episode.airDateUtc)] })) : (_jsx("span", { children: "TBA" })), ' · ', hasFile ? episode.path : 'File missing'] })] }), _jsx(StatusBadge, { status: hasFile ? 'completed' : 'wanted' }), _jsx("button", { type: "button", className: "p-1.5 rounded-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors", onClick: () => openSearchModal(season.seasonNumber, {
                                                    id: episode.id,
                                                    episodeNumber: episode.episodeNumber,
                                                    title: episode.title,
                                                }), title: "Interactive Search", children: _jsx(Search, { size: 16 }) }), _jsxs("label", { className: "inline-flex items-center gap-2 text-xs text-text-secondary", children: [_jsx("input", { type: "checkbox", checked: monitored, onChange: event => {
                                                            episodeMonitoredMutation.mutate({
                                                                id: episode.id,
                                                                monitored: event.currentTarget.checked,
                                                            });
                                                        } }), "Monitored"] })] }, episode.id));
                                }) })] }, season.seasonNumber))) }) }), _jsxs("div", { className: "rounded-md border border-border-subtle bg-surface-1", children: [_jsxs("button", { type: "button", onClick: () => setAlternateTitlesOpen(!alternateTitlesOpen), className: "w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-text-primary", children: [_jsx("span", { children: "Alternate Titles" }), alternateTitlesOpen ? _jsx(ChevronUp, { size: 16 }) : _jsx(ChevronDown, { size: 16 })] }), alternateTitlesOpen && (_jsx("div", { className: "border-t border-border-subtle px-4 py-3", children: _jsx("p", { className: "text-sm text-text-secondary", children: "No alternate titles available." }) }))] }), _jsxs("div", { className: "rounded-md border border-border-subtle bg-surface-1", children: [_jsxs("div", { className: "px-4 py-3 flex items-center gap-2", children: [_jsx(Tag, { size: 14, className: "text-text-secondary" }), _jsx("span", { className: "text-sm font-semibold text-text-primary", children: "Tags" })] }), _jsx("div", { className: "border-t border-border-subtle px-4 py-3", children: _jsx("p", { className: "text-sm text-text-secondary", children: "No tags assigned." }) })] }), _jsx(Link, { href: "/library/series", className: "inline-flex rounded-sm border border-border-subtle px-3 py-1 text-sm", children: "Back to Series" }), series && (_jsx(InteractiveSearchModal, { isOpen: searchModal.isOpen, onClose: closeSearchModal, seriesId: series.id, tvdbId: series.tvdbId, episodeId: searchModal.episodeId, seriesTitle: series.title, seasonNumber: searchModal.seasonNumber, episodeNumber: searchModal.episodeNumber, episodeTitle: searchModal.episodeTitle })), series && (_jsx(OrganizePreviewModal, { isOpen: organizeModalOpen, onClose: () => setOrganizeModalOpen(false), seriesIds: [series.id], onComplete: () => void seriesQuery.refetch() }))] }));
}
//# sourceMappingURL=page.js.map