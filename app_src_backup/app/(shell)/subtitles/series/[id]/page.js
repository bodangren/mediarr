'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { ChevronDown, ChevronRight, Search, Upload } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { ManualSearchModal } from '@/components/subtitles/ManualSearchModal';
import { SubtitleUpload } from '@/components/subtitles/SubtitleUpload';
import { SyncButton } from '@/components/subtitles/SyncButton';
import { ScanButton } from '@/components/subtitles/ScanButton';
import { SearchButton } from '@/components/subtitles/SearchButton';
import { getApiClients } from '@/lib/api/client';
import { useApiQuery } from '@/lib/query/useApiQuery';
export default function SeriesSubtitleDetailPage() {
    const api = useMemo(() => getApiClients(), []);
    const queryClient = useQueryClient();
    const params = useParams();
    const id = Number.parseInt(params.id, 10);
    const [expandedSeasons, setExpandedSeasons] = useState(new Set());
    const [manualSearchModal, setManualSearchModal] = useState({ isOpen: false, episodeId: 0 });
    const [uploadModal, setUploadModal] = useState({ isOpen: false, episodeId: 0 });
    const seriesQuery = useApiQuery({
        queryKey: ['series', 'subtitles', 'detail', id],
        queryFn: async () => {
            const series = await api.mediaApi.getSeries(id);
            const variants = await api.subtitleApi.listSeriesVariants(id);
            // Transform variants into seasons with episodes
            const seasons = variants.map(variant => ({
                seasonNumber: variant.seasonNumber,
                episodes: variant.episodes,
            }));
            return { series, seasons };
        },
        staleTimeKind: 'detail',
    });
    const toggleSeason = (seasonNumber) => {
        setExpandedSeasons(prev => {
            const next = new Set(prev);
            if (next.has(seasonNumber)) {
                next.delete(seasonNumber);
            }
            else {
                next.add(seasonNumber);
            }
            return next;
        });
    };
    const openManualSearch = (episodeId) => {
        setManualSearchModal({ isOpen: true, episodeId });
    };
    const closeManualSearch = () => {
        setManualSearchModal({ isOpen: false, episodeId: 0 });
    };
    const openUpload = (episodeId) => {
        setUploadModal({ isOpen: true, episodeId });
    };
    const closeUpload = () => {
        setUploadModal({ isOpen: false, episodeId: 0 });
    };
    const handleUploadSuccess = () => {
        closeUpload();
        queryClient.invalidateQueries({ queryKey: ['series', 'subtitles', 'detail', id] });
    };
    const series = seriesQuery.data?.series;
    const seasons = seriesQuery.data?.seasons ?? [];
    return (_jsxs("section", { className: "space-y-4", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Series Subtitles" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Manage subtitle tracks for each episode." })] }), _jsx(QueryPanel, { isLoading: seriesQuery.isPending, isError: seriesQuery.isError, isEmpty: seriesQuery.isResolvedEmpty, errorMessage: seriesQuery.error?.message, onRetry: () => void seriesQuery.refetch(), emptyTitle: "Series not found", emptyBody: "The series you're looking for doesn't exist or has been deleted.", children: series && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex gap-4 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx("div", { className: "h-32 w-24 flex-shrink-0", children: series.poster ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    _jsx("img", { src: series.poster, alt: series.title, className: "h-full w-full rounded-sm object-cover" })) : (_jsx("div", { className: "flex h-full w-full items-center justify-center rounded-sm bg-surface-2 text-text-muted", children: "No Poster" })) }), _jsxs("div", { className: "flex flex-col justify-center space-y-2", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-semibold", children: series.title }), _jsxs("p", { className: "text-sm text-text-secondary", children: [series.year, " \u2022 ", seasons.length, " ", seasons.length === 1 ? 'Season' : 'Seasons'] })] }), series.overview && (_jsx("p", { className: "text-sm text-text-secondary line-clamp-3", children: series.overview })), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-text-muted", children: "Monitored:" }), _jsx("span", { className: series.monitored ? 'text-accent-success' : 'text-text-muted', children: series.monitored ? 'Yes' : 'No' })] })] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx(SyncButton, { seriesId: id }), _jsx(ScanButton, { seriesId: id }), _jsx(SearchButton, { seriesId: id })] }), _jsxs("div", { className: "space-y-2", children: [seasons.map(season => (_jsxs("div", { className: "rounded-md border border-border-subtle bg-surface-1 overflow-hidden", children: [_jsxs("button", { type: "button", className: "flex w-full items-center justify-between px-4 py-3 hover:bg-surface-2", onClick: () => toggleSeason(season.seasonNumber), children: [_jsxs("span", { className: "font-medium", children: ["Season ", season.seasonNumber, _jsxs("span", { className: "ml-2 text-sm text-text-muted", children: ["(", season.episodes.length, " episodes)"] })] }), expandedSeasons.has(season.seasonNumber) ? (_jsx(ChevronDown, { className: "h-4 w-4 text-text-muted" })) : (_jsx(ChevronRight, { className: "h-4 w-4 text-text-muted" }))] }), expandedSeasons.has(season.seasonNumber) && (_jsx("div", { className: "border-t border-border-subtle", children: season.episodes.map(episode => (_jsxs("div", { className: "flex items-center justify-between gap-4 px-4 py-3 even:bg-surface-2/50", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-baseline gap-2", children: [_jsxs("span", { className: "font-medium", children: ["S", episode.seasonNumber, "E", episode.episodeNumber] }), _jsx("span", { className: "text-sm text-text-muted", children: episode.title || `Episode ${episode.episodeNumber}` })] }), _jsxs("div", { className: "flex flex-wrap gap-1.5 mt-2", children: [episode.subtitleTracks.map((track, idx) => (_jsxs("span", { className: "rounded-sm bg-accent-success/20 px-2 py-0.5 text-xs text-text-primary", children: [track.languageCode, track.isForced && ' (F)', track.isHi && ' (HI)'] }, idx))), episode.missingSubtitles.map((lang, idx) => (_jsxs("span", { className: "rounded-sm bg-accent-danger/20 px-2 py-0.5 text-xs text-text-primary", children: [lang, " (Missing)"] }, `missing-${idx}`))), episode.subtitleTracks.length === 0 &&
                                                                        episode.missingSubtitles.length === 0 && (_jsx("span", { className: "text-xs text-text-muted", children: "No subtitles" }))] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Button, { variant: "secondary", className: "px-2 py-1 text-xs", onClick: () => openManualSearch(episode.episodeId), children: [_jsx(Search, { className: "mr-1 h-3 w-3" }), "Search"] }), _jsxs(Button, { variant: "secondary", className: "px-2 py-1 text-xs", onClick: () => openUpload(episode.episodeId), children: [_jsx(Upload, { className: "mr-1 h-3 w-3" }), "Upload"] })] })] }, episode.episodeId))) }))] }, season.seasonNumber))), seasons.length === 0 && (_jsx("div", { className: "rounded-md border border-border-subtle bg-surface-1 p-8 text-center", children: _jsx("p", { className: "text-text-muted", children: "No seasons found for this series." }) }))] })] })) }), _jsx(ManualSearchModal, { isOpen: manualSearchModal.isOpen, episodeId: manualSearchModal.episodeId, onClose: closeManualSearch }), uploadModal.isOpen && (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4", children: [_jsx("button", { type: "button", className: "absolute inset-0 bg-surface-3/70", onClick: closeUpload, "aria-label": "Close upload modal" }), _jsx("div", { className: "relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-md border border-border-subtle bg-surface-1 shadow-elevation-3 p-4", children: _jsx(SubtitleUpload, { episodeId: uploadModal.episodeId, onSuccess: handleUploadSuccess, onCancel: closeUpload }) })] }))] }));
}
//# sourceMappingURL=page.js.map