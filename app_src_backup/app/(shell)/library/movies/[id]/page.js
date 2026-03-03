'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useMemo, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Alert } from '@/components/primitives/Alert';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { formatFileSize } from '@/types/movie';
import { getRuntimeDisplay } from '@/types/movie';
import { MovieDetailHeader } from '@/components/movie';
import { MovieActionsToolbar } from '@/components/movie';
import { MovieFileTable } from '@/components/movie';
import { AlternateTitleTable } from '@/components/movie';
import { CastCard } from '@/components/movie';
import { MovieHistory } from '@/components/movie';
import { OrganizePreviewModal } from '@/components/movie';
import { Icon } from '@/components/primitives/Icon';
import { EditMovieModal } from '@/components/movie/EditMovieModal';
import { MovieInteractiveSearchModal } from '@/components/movie/MovieInteractiveSearchModal';
// Helper to convert Movie API response to MovieDetail
function convertToMovieDetail(movie) {
    return {
        id: movie.id,
        title: movie.title,
        year: movie.year,
        overview: movie.overview,
        runtime: movie.runtime,
        certification: movie.certification,
        posterUrl: movie.posterUrl,
        backdropUrl: movie.posterUrl, // Using posterUrl as fallback
        status: movie.status || 'unknown',
        monitored: movie.monitored,
        qualityProfileId: movie.qualityProfileId,
        qualityProfileName: 'Default',
        sizeOnDisk: movie.sizeOnDisk,
        path: movie.path,
        genres: movie.genres,
        studio: movie.studio,
        collection: movie.collection?.title,
        ratings: {
            tmdb: 0,
            imdb: 0,
            rottenTomatoes: 0,
        },
        files: [], // Will be populated from API when available
        cast: [], // Will be populated from API when available
        crew: [], // Will be populated from API when available
        alternateTitles: [], // Will be populated from API when available
    };
}
export default function MovieDetailPage({ params }) {
    const unwrappedParams = React.use(params);
    const movieId = Number(unwrappedParams.id);
    const api = useMemo(() => getApiClients(), []);
    const queryClient = useQueryClient();
    const router = useRouter();
    const { pushToast } = useToast();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [releaseCount, setReleaseCount] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isInteractiveSearchModalOpen, setIsInteractiveSearchModalOpen] = useState(false);
    const [isOrganizeModalOpen, setIsOrganizeModalOpen] = useState(false);
    // Query for movie detail using real API
    const movieDetailQuery = useApiQuery({
        queryKey: queryKeys.movieDetail(movieId),
        queryFn: async () => {
            return api.movieApi.getById(movieId);
        },
        staleTimeKind: 'detail',
    });
    // Convert Movie to MovieDetail for the UI components
    const movieDetail = movieDetailQuery.data ? convertToMovieDetail(movieDetailQuery.data) : null;
    // Mutation for toggling monitored status
    const toggleMonitoredMutation = useMutation({
        mutationFn: (monitored) => api.mediaApi.setMovieMonitored(movieId, monitored),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.movieDetail(movieId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.moviesList({}) });
            pushToast({
                title: 'Movie updated',
                message: `Monitored status changed successfully.`,
                variant: 'success',
            });
        },
    });
    // Mutation for searching releases
    const searchMutation = useMutation({
        mutationFn: async () => {
            const candidates = await api.releaseApi.searchCandidates({
                type: 'movie',
                title: movieDetail?.title || '',
                tmdbId: movieDetailQuery.data?.tmdbId,
                imdbId: movieDetailQuery.data?.imdbId,
                year: movieDetail?.year,
            });
            return candidates.meta.totalCount;
        },
        onSuccess: count => {
            setReleaseCount(count);
            pushToast({
                title: 'Search complete',
                message: `${count} candidate releases found.`,
                variant: 'success',
            });
        },
    });
    // Mutation for deleting movie
    const deleteMovieMutation = useMutation({
        mutationFn: (deleteFiles) => api.mediaApi.deleteMovie(movieId, deleteFiles),
        onSuccess: () => {
            pushToast({
                title: 'Movie deleted',
                variant: 'success',
            });
            router.push('/library/movies');
        },
    });
    // Mutation for deleting a file
    const deleteFileMutation = useMutation({
        mutationFn: (fileId) => api.movieApi.deleteFile(movieId, fileId),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.movieDetail(movieId) });
            pushToast({
                title: 'File deleted',
                variant: 'success',
            });
        },
    });
    const handleMonitoredChange = useCallback((monitored) => {
        toggleMonitoredMutation.mutate(monitored);
    }, [toggleMonitoredMutation]);
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await api.movieApi.refresh(movieId);
            void queryClient.invalidateQueries({ queryKey: queryKeys.movieDetail(movieId) });
            pushToast({
                title: 'Refresh complete',
                message: 'Movie metadata has been refreshed.',
                variant: 'success',
            });
        }
        catch (error) {
            pushToast({
                title: 'Refresh failed',
                message: error instanceof Error ? error.message : 'Failed to refresh movie metadata',
                variant: 'error',
            });
        }
        finally {
            setIsRefreshing(false);
        }
    }, [api, movieId, queryClient, pushToast]);
    const handleSearch = useCallback(() => {
        setIsSearching(true);
        void searchMutation.mutate();
    }, [searchMutation]);
    const handleInteractiveSearch = useCallback(() => {
        setIsInteractiveSearchModalOpen(true);
    }, []);
    const handlePreviewRename = useCallback(() => {
        setIsOrganizeModalOpen(true);
    }, []);
    const handleManageFiles = useCallback(() => {
        pushToast({
            title: 'Manage Files',
            message: 'File management not yet available',
            variant: 'info',
        });
    }, [pushToast]);
    const handleHistory = useCallback(() => {
        router.push('/activity/history');
    }, [router]);
    const handleEdit = useCallback(() => {
        setIsEditModalOpen(true);
    }, []);
    const handleDelete = useCallback(() => {
        const deleteFiles = window.confirm('Delete files from disk?');
        deleteMovieMutation.mutate(deleteFiles);
    }, [deleteMovieMutation]);
    const handleEditFile = useCallback((file) => {
        pushToast({
            title: 'Edit File',
            message: 'File editing not yet available',
            variant: 'info',
        });
    }, [pushToast]);
    const handleDeleteFile = useCallback((file) => {
        if (window.confirm('Are you sure you want to delete this file?')) {
            deleteFileMutation.mutate(file.id);
        }
    }, [deleteFileMutation]);
    if (!movieDetail) {
        return (_jsx("section", { className: "space-y-5", children: _jsx(QueryPanel, { isLoading: movieDetailQuery.isPending, isError: movieDetailQuery.isError, isEmpty: movieDetailQuery.isResolvedEmpty, errorMessage: movieDetailQuery.error?.message, onRetry: () => void movieDetailQuery.refetch(), emptyTitle: "Movie not found", emptyBody: "The movie you're looking for doesn't exist or has been deleted.", children: _jsx("div", {}) }) }));
    }
    const movie = movieDetail;
    return (_jsxs(_Fragment, { children: [_jsxs("section", { className: "space-y-5", children: [_jsx(MovieDetailHeader, { movie: movie, onMonitoredChange: handleMonitoredChange }), _jsx(MovieActionsToolbar, { onRefresh: handleRefresh, onSearch: handleSearch, onInteractiveSearch: handleInteractiveSearch, onPreviewRename: handlePreviewRename, onManageFiles: handleManageFiles, onHistory: handleHistory, onEdit: handleEdit, onDelete: handleDelete, isRefreshing: isRefreshing, isSearching: searchMutation.isPending }), _jsxs("section", { className: "space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Files" }), _jsx(MovieFileTable, { files: movie.files, onEdit: handleEditFile, onDelete: handleDeleteFile }), movie.files.length === 0 && (_jsx(Alert, { variant: "warning", children: "No movie files found. Click \"Search Movie\" to find releases." }))] }), movie.cast.length > 0 && (_jsxs("section", { className: "space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Cast" }), _jsx("div", { className: "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6", children: movie.cast.map(cast => (_jsx(CastCard, { cast: cast }, cast.id))) })] })), movie.crew.length > 0 && (_jsxs("section", { className: "space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Crew" }), _jsx("div", { className: "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6", children: movie.crew.map(crew => (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("div", { className: "aspect-[2/3] overflow-hidden rounded-lg bg-surface-2 shadow-elevation-1", children: crew.profileUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            _jsx("img", { src: crew.profileUrl, alt: crew.name, className: "h-full w-full object-cover" })) : (_jsx("div", { className: "flex h-full w-full items-center justify-center text-text-muted", children: _jsx(Icon, { name: "user" }) })) }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-sm font-medium text-text-primary", children: crew.name }), _jsx("p", { className: "truncate text-xs text-text-secondary", children: crew.role })] })] }, crew.id))) })] })), movie.alternateTitles.length > 0 && (_jsxs("section", { className: "space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Alternate Titles" }), _jsx(AlternateTitleTable, { titles: movie.alternateTitles })] })), _jsx(MovieHistory, { movieId: movie.id })] }), movieDetailQuery.data && (_jsx(EditMovieModal, { isOpen: isEditModalOpen, onClose: () => setIsEditModalOpen(false), movie: movieDetailQuery.data, onSave: () => void movieDetailQuery.refetch() })), movieDetailQuery.data && (_jsx(MovieInteractiveSearchModal, { isOpen: isInteractiveSearchModalOpen, onClose: () => setIsInteractiveSearchModalOpen(false), movieId: movie.id, movieTitle: movie.title, movieYear: movie.year, imdbId: movieDetailQuery.data.imdbId, tmdbId: movieDetailQuery.data.tmdbId })), _jsx(OrganizePreviewModal, { isOpen: isOrganizeModalOpen, onClose: () => setIsOrganizeModalOpen(false), movieIds: [movieId], onComplete: () => void movieDetailQuery.refetch() })] }));
}
//# sourceMappingURL=page.js.map