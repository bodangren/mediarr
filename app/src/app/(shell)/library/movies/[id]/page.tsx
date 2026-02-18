'use client';

import { useMemo, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Alert } from '@/components/primitives/Alert';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import type { MovieDetail } from '@/types/movie';
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
import type { Movie } from '@/lib/api/movieApi';

// Helper to convert Movie API response to MovieDetail
function convertToMovieDetail(movie: Movie): MovieDetail {
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

export default function MovieDetailPage({ params }: { params: { id: string } }) {
  const movieId = Number(params.id);
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { pushToast } = useToast();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [releaseCount, setReleaseCount] = useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInteractiveSearchModalOpen, setIsInteractiveSearchModalOpen] = useState(false);
  const [isOrganizeModalOpen, setIsOrganizeModalOpen] = useState(false);

  // Query for movie detail using real API
  const movieDetailQuery = useApiQuery<Movie>({
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
    mutationFn: (monitored: boolean) => api.mediaApi.setMovieMonitored(movieId, monitored),
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
    mutationFn: (deleteFiles: boolean) => api.mediaApi.deleteMovie(movieId, deleteFiles),
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
    mutationFn: (fileId: number) => api.movieApi.deleteFile(movieId, fileId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.movieDetail(movieId) });
      pushToast({
        title: 'File deleted',
        variant: 'success',
      });
    },
  });

  const handleMonitoredChange = useCallback(
    (monitored: boolean) => {
      toggleMonitoredMutation.mutate(monitored);
    },
    [toggleMonitoredMutation],
  );

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
    } catch (error) {
      pushToast({
        title: 'Refresh failed',
        message: error instanceof Error ? error.message : 'Failed to refresh movie metadata',
        variant: 'error',
      });
    } finally {
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

  const handleEditFile = useCallback((file: any) => {
    pushToast({
      title: 'Edit File',
      message: 'File editing not yet available',
      variant: 'info',
    });
  }, [pushToast]);

  const handleDeleteFile = useCallback((file: any) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      deleteFileMutation.mutate(file.id);
    }
  }, [deleteFileMutation]);

  if (!movieDetail) {
    return (
      <section className="space-y-5">
        <QueryPanel
          isLoading={movieDetailQuery.isPending}
          isError={movieDetailQuery.isError}
          isEmpty={movieDetailQuery.isResolvedEmpty}
          errorMessage={movieDetailQuery.error?.message}
          onRetry={() => void movieDetailQuery.refetch()}
          emptyTitle="Movie not found"
          emptyBody="The movie you're looking for doesn't exist or has been deleted."
        >
          <div />
        </QueryPanel>
      </section>
    );
  }

  const movie = movieDetail;

  return (
    <>
      <section className="space-y-5">
        {/* Header */}
        <MovieDetailHeader
          movie={movie}
          onMonitoredChange={handleMonitoredChange}
        />

        {/* Actions Toolbar */}
        <MovieActionsToolbar
          onRefresh={handleRefresh}
          onSearch={handleSearch}
          onInteractiveSearch={handleInteractiveSearch}
          onPreviewRename={handlePreviewRename}
          onManageFiles={handleManageFiles}
          onHistory={handleHistory}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isRefreshing={isRefreshing}
          isSearching={searchMutation.isPending}
        />

        {/* Files Section */}
        <section className="space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
          <h2 className="text-lg font-semibold">Files</h2>
          <MovieFileTable
            files={movie.files}
            onEdit={handleEditFile}
            onDelete={handleDeleteFile}
          />
          {movie.files.length === 0 && (
            <Alert variant="warning">No movie files found. Click "Search Movie" to find releases.</Alert>
          )}
        </section>

      {/* Cast Section */}
      {movie.cast.length > 0 && (
        <section className="space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
          <h2 className="text-lg font-semibold">Cast</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {movie.cast.map(cast => (
              <CastCard key={cast.id} cast={cast} />
            ))}
          </div>
        </section>
      )}

      {/* Crew Section */}
      {movie.crew.length > 0 && (
        <section className="space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
          <h2 className="text-lg font-semibold">Crew</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {movie.crew.map(crew => (
              <div key={crew.id} className="flex flex-col gap-2">
                <div className="aspect-[2/3] overflow-hidden rounded-lg bg-surface-2 shadow-elevation-1">
                  {crew.profileUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={crew.profileUrl}
                      alt={crew.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-text-muted">
                      <Icon name="user" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{crew.name}</p>
                  <p className="truncate text-xs text-text-secondary">{crew.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Alternate Titles Section */}
      {movie.alternateTitles.length > 0 && (
        <section className="space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
          <h2 className="text-lg font-semibold">Alternate Titles</h2>
          <AlternateTitleTable titles={movie.alternateTitles} />
        </section>
      )}

      {/* History Timeline Section */}
      <MovieHistory movieId={movie.id} />
      </section>

      {/* Edit Movie Modal */}
      {movieDetailQuery.data && (
        <EditMovieModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          movie={movieDetailQuery.data}
          onSave={() => void movieDetailQuery.refetch()}
        />
      )}

      {/* Interactive Search Modal */}
      {movieDetailQuery.data && (
        <MovieInteractiveSearchModal
          isOpen={isInteractiveSearchModalOpen}
          onClose={() => setIsInteractiveSearchModalOpen(false)}
          movieId={movie.id}
          movieTitle={movie.title}
          movieYear={movie.year}
          imdbId={movieDetailQuery.data.imdbId}
          tmdbId={movieDetailQuery.data.tmdbId}
        />
      )}

      {/* Organize/Rename Preview Modal */}
      <OrganizePreviewModal
        isOpen={isOrganizeModalOpen}
        onClose={() => setIsOrganizeModalOpen(false)}
        movieIds={[movieId]}
        onComplete={() => void movieDetailQuery.refetch()}
      />
    </>
  );
}
