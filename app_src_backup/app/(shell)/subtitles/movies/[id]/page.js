'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Alert } from '@/components/primitives/Alert';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { LanguageBadge } from '@/components/subtitles/LanguageBadge';
import { SubtitleTrackList } from '@/components/subtitles/SubtitleTrackList';
import { SubtitleUpload } from '@/components/subtitles/SubtitleUpload';
import { ManualSearchModal } from '@/components/subtitles/ManualSearchModal';
import { MovieActionsToolbar } from '@/components/subtitles/MovieActionsToolbar';
import { Icon } from '@/components/primitives/Icon';
export default function MovieSubtitleDetailPage({ params }) {
    const movieId = Number(params.id);
    const api = useMemo(() => getApiClients(), []);
    const queryClient = useQueryClient();
    const router = useRouter();
    const { pushToast } = useToast();
    const [isSyncing, setIsSyncing] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    // Query for movie details
    const movieQuery = useQuery({
        queryKey: queryKeys.movieDetail(movieId),
        queryFn: () => api.mediaApi.getMovie(movieId),
    });
    // Query for subtitle variants
    const variantsQuery = useQuery({
        queryKey: ['movie-subtitle-variants', movieId],
        queryFn: async () => {
            const variants = await api.subtitleApi.listMovieVariants(movieId);
            // Enrich variants with track and missing language data
            return variants.map((variant) => ({
                variantId: variant.variantId,
                path: variant.path,
                subtitleTracks: variant.subtitleTracks ?? [],
                missingSubtitles: variant.missingSubtitles ?? [],
            }));
        },
        enabled: movieQuery.data !== undefined,
    });
    // Mutation for sync
    const syncMutation = useMutation({
        mutationFn: () => api.subtitleApi.syncMovie(movieId),
        onSuccess: data => {
            pushToast({
                title: 'Sync Complete',
                message: `Synced ${data.episodesUpdated} items`,
                variant: 'success',
            });
            queryClient.invalidateQueries({ queryKey: ['movie-subtitle-variants', movieId] });
        },
    });
    // Mutation for scan
    const scanMutation = useMutation({
        mutationFn: () => api.subtitleApi.scanMovieDisk(movieId),
        onSuccess: data => {
            pushToast({
                title: 'Scan Complete',
                message: `Found ${data.newSubtitles} new subtitles`,
                variant: 'success',
            });
            queryClient.invalidateQueries({ queryKey: ['movie-subtitle-variants', movieId] });
        },
    });
    // Mutation for search all
    const searchMutation = useMutation({
        mutationFn: () => api.subtitleApi.searchMovieSubtitles(movieId),
        onSuccess: data => {
            pushToast({
                title: 'Search Complete',
                message: `Downloaded ${data.subtitlesDownloaded} subtitles`,
                variant: 'success',
            });
            queryClient.invalidateQueries({ queryKey: ['movie-subtitle-variants', movieId] });
        },
    });
    const handleSync = useCallback(() => {
        setIsSyncing(true);
        syncMutation.mutate(undefined, {
            onSettled: () => setIsSyncing(false),
        });
    }, [syncMutation]);
    const handleScan = useCallback(() => {
        setIsScanning(true);
        scanMutation.mutate(undefined, {
            onSettled: () => setIsScanning(false),
        });
    }, [scanMutation]);
    const handleSearch = useCallback(() => {
        setIsSearching(true);
        searchMutation.mutate(undefined, {
            onSettled: () => setIsSearching(false),
        });
    }, [searchMutation]);
    const handleManualSearch = useCallback(() => {
        setIsSearchModalOpen(true);
    }, []);
    const handleUpload = useCallback(() => {
        setIsUploadModalOpen(true);
    }, []);
    const handleHistory = useCallback(() => {
        router.push('/subtitles/history/movies');
    }, [router]);
    const handleSearchLanguage = useCallback((languageCode) => {
        pushToast({
            title: 'Searching',
            message: `Searching for ${languageCode} subtitles`,
            variant: 'info',
        });
    }, [pushToast]);
    const handleUploadSuccess = useCallback(() => {
        setIsUploadModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['movie-subtitle-variants', movieId] });
    }, [movieId, queryClient]);
    if (!movieQuery.data) {
        return (_jsx("section", { className: "space-y-5", children: _jsx(QueryPanel, { isLoading: movieQuery.isPending, isError: movieQuery.isError, isEmpty: movieQuery.data === undefined, errorMessage: movieQuery.error?.message, onRetry: () => void movieQuery.refetch(), emptyTitle: "Movie not found", emptyBody: "The movie you're looking for doesn't exist or has been deleted.", children: _jsx("div", {}) }) }));
    }
    const movie = movieQuery.data;
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("div", { className: "flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface-1 p-4 sm:flex-row", children: [_jsx("div", { className: "aspect-[2/3] w-32 shrink-0 overflow-hidden rounded-md bg-surface-2 sm:w-40", children: _jsx(Icon, { name: "play", size: 48, className: "h-full w-full text-text-muted" }) }), _jsxs("div", { className: "flex-1 space-y-2", children: [_jsxs("div", { className: "flex flex-wrap items-start gap-2", children: [_jsx("h1", { className: "text-2xl font-semibold", children: movie.title }), movie.year && (_jsxs("span", { className: "text-lg text-text-muted", children: ["(", movie.year, ")"] }))] }), _jsx("div", { className: "flex flex-wrap items-center gap-2", children: movie.monitored !== undefined && (_jsx(StatusBadge, { status: movie.monitored ? 'monitored' : 'paused' })) }), movie.languageProfile ? (_jsxs("div", { className: "inline-flex items-center gap-2 rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-xs", children: [_jsx("span", { className: "text-text-muted", children: "Language Profile:" }), _jsx("span", { className: "text-text-primary", children: movie.languageProfile })] })) : (_jsxs("div", { className: "inline-flex items-center gap-2 rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-xs", children: [_jsx("span", { className: "text-text-muted", children: "Language Profile:" }), _jsx("span", { className: "text-text-muted", children: "Unavailable" })] }))] })] }), _jsx(MovieActionsToolbar, { onSync: handleSync, onScan: handleScan, onSearch: handleSearch, onManualSearch: handleManualSearch, onUpload: handleUpload, onHistory: handleHistory, isSyncing: isSyncing || syncMutation.isPending, isScanning: isScanning || scanMutation.isPending, isSearching: isSearching || searchMutation.isPending }), _jsxs("section", { className: "space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Subtitle Files" }), _jsx(QueryPanel, { isLoading: variantsQuery.isPending, isError: variantsQuery.isError, isEmpty: variantsQuery.data?.length === 0, errorMessage: variantsQuery.error?.message, onRetry: () => void variantsQuery.refetch(), emptyTitle: "No subtitle files found", emptyBody: "This movie doesn't have any video files tracked yet. Click 'Sync' to scan for files.", children: variantsQuery.data?.map(variant => (_jsxs("div", { className: "space-y-3 rounded-lg border border-border-subtle bg-surface-2 p-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Icon, { name: "folder", size: 16, className: "text-text-muted shrink-0" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "truncate text-sm font-medium text-text-primary", title: variant.path, children: variant.path }), _jsxs("p", { className: "text-xs text-text-muted", children: ["File Variant #", variant.variantId] })] })] }), _jsx(SubtitleTrackList, { tracks: variant.subtitleTracks, missingLanguages: variant.missingSubtitles, onSearch: handleSearchLanguage })] }, variant.variantId))) })] }), _jsx(ManualSearchModal, { isOpen: isSearchModalOpen, movieId: movieId, onClose: () => setIsSearchModalOpen(false) }), isUploadModalOpen && (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4", children: [_jsx("button", { type: "button", className: "absolute inset-0 bg-surface-3/70", onClick: () => setIsUploadModalOpen(false), "aria-label": "Close modal" }), _jsx("div", { className: "relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-md border border-border-subtle bg-surface-1 shadow-elevation-3 p-4", children: _jsx(SubtitleUpload, { movieId: movieId, onSuccess: handleUploadSuccess, onCancel: () => setIsUploadModalOpen(false) }) })] }))] }));
}
//# sourceMappingURL=page.js.map