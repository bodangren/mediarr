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
import { Icon } from '@/components/primitives/Icon';

// Mock data for now - will be replaced with API calls
const mockMovieDetail: MovieDetail = {
  id: 1,
  title: 'Inception',
  year: 2010,
  overview:
    'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O., but his tragic past may doom the project and his team to disaster.',
  runtime: 148,
  certification: 'PG-13',
  posterUrl: '/posters/inception.jpg',
  backdropUrl: '/backdrops/inception.jpg',
  status: 'downloaded',
  monitored: true,
  qualityProfileId: 1,
  qualityProfileName: 'HD - 1080p',
  sizeOnDisk: 4_294_967_296,
  path: '/Movies/Inception (2010)',
  genres: ['Action', 'Adventure', 'Sci-Fi'],
  studio: 'Warner Bros. Pictures',
  collection: 'Christopher Nolan Collection',
  ratings: {
    tmdb: 8.4,
    imdb: 8.8,
    rottenTomatoes: 87,
  },
  files: [
    {
      id: 1,
      path: '/Movies/Inception (2010)/Inception.2010.1080p.BluRay.x264.mkv',
      quality: 'Bluray-1080p',
      size: 4_294_967_296,
      language: 'English',
    },
  ],
  cast: [
    {
      id: 1,
      name: 'Leonardo DiCaprio',
      character: 'Dom Cobb',
      profileUrl: '/cast/dicaprio.jpg',
    },
    {
      id: 2,
      name: 'Joseph Gordon-Levitt',
      character: 'Arthur',
      profileUrl: '/cast/gordon-levitt.jpg',
    },
    {
      id: 3,
      name: 'Ellen Page',
      character: 'Ariadne',
      profileUrl: '/cast/page.jpg',
    },
    {
      id: 4,
      name: 'Tom Hardy',
      character: 'Eames',
      profileUrl: '/cast/hardy.jpg',
    },
    {
      id: 5,
      name: 'Ken Watanabe',
      character: 'Saito',
      profileUrl: '/cast/watanabe.jpg',
    },
    {
      id: 6,
      name: 'Marion Cotillard',
      character: 'Mal',
      profileUrl: '/cast/cotillard.jpg',
    },
  ],
  crew: [
    {
      id: 1,
      name: 'Christopher Nolan',
      role: 'Director',
      profileUrl: '/crew/nolan.jpg',
    },
    {
      id: 2,
      name: 'Christopher Nolan',
      role: 'Writer',
      profileUrl: '/crew/nolan.jpg',
    },
    {
      id: 3,
      name: 'Emma Thomas',
      role: 'Producer',
      profileUrl: '/crew/thomas.jpg',
    },
    {
      id: 4,
      name: 'Hans Zimmer',
      role: 'Music',
      profileUrl: '/crew/zimmer.jpg',
    },
  ],
  alternateTitles: [
    {
      title: 'Origen',
      source: 'Spain',
    },
    {
      title: 'Начало',
      source: 'Russia',
    },
    {
      title: 'Yi Meng',
      source: 'Taiwan',
    },
  ],
};

export default function MovieDetailPage({ params }: { params: { id: string } }) {
  const movieId = Number(params.id);
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { pushToast } = useToast();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [releaseCount, setReleaseCount] = useState<number | null>(null);

  // TODO: Replace with actual API call when backend supports movie detail
  const movieDetailQuery = useApiQuery<MovieDetail>({
    queryKey: queryKeys.movieDetail(movieId),
    queryFn: async () => {
      // Temporary: Return mock data. In production, this will call api.mediaApi.getMovieDetail(movieId)
      return mockMovieDetail;
    },
    staleTimeKind: 'detail',
  });

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
        movieId: mockMovieDetail.id,
        title: mockMovieDetail.title,
      });

      return candidates.length;
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

  const handleMonitoredChange = useCallback(
    (monitored: boolean) => {
      toggleMonitoredMutation.mutate(monitored);
    },
    [toggleMonitoredMutation],
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // TODO: Call refresh API
    setTimeout(() => {
      setIsRefreshing(false);
      void movieDetailQuery.refetch();
    }, 500);
  }, [movieDetailQuery]);

  const handleSearch = useCallback(() => {
    setIsSearching(true);
    void searchMutation.mutate();
  }, [searchMutation]);

  const handleInteractiveSearch = useCallback(() => {
    // TODO: Open interactive search modal
    pushToast({
      title: 'Interactive Search',
      message: 'This feature is coming soon.',
      variant: 'info',
    });
  }, [pushToast]);

  const handlePreviewRename = useCallback(() => {
    // TODO: Open preview rename modal
    pushToast({
      title: 'Preview Rename',
      message: 'This feature is coming soon.',
      variant: 'info',
    });
  }, [pushToast]);

  const handleManageFiles = useCallback(() => {
    // TODO: Open manage files modal
    pushToast({
      title: 'Manage Files',
      message: 'This feature is coming soon.',
      variant: 'info',
    });
  }, [pushToast]);

  const handleHistory = useCallback(() => {
    router.push('/activity/history');
  }, [router]);

  const handleEdit = useCallback(() => {
    // TODO: Open edit movie modal
    pushToast({
      title: 'Edit Movie',
      message: 'This feature is coming soon.',
      variant: 'info',
    });
  }, [pushToast]);

  const handleDelete = useCallback(() => {
    const deleteFiles = window.confirm('Delete files from disk?');
    deleteMovieMutation.mutate(deleteFiles);
  }, [deleteMovieMutation]);

  const handleEditFile = useCallback((file: any) => {
    // TODO: Open edit file modal
    pushToast({
      title: 'Edit File',
      message: 'This feature is coming soon.',
      variant: 'info',
    });
  }, [pushToast]);

  const handleDeleteFile = useCallback((file: any) => {
    // TODO: Delete file
    pushToast({
      title: 'Delete File',
      message: 'This feature is coming soon.',
      variant: 'info',
    });
  }, [pushToast]);

  if (!movieDetailQuery.data) {
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

  const movie = movieDetailQuery.data;

  return (
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
    </section>
  );
}
