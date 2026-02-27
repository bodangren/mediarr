'use client';

import { useMemo, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import type { MovieCollection } from '@/lib/api/collectionApi';

interface CollectionMovie {
  id: number;
  tmdbId: number;
  title: string;
  year: number;
  overview: string | null;
  status: string;
  monitored: boolean;
  inLibrary: boolean;
  quality: string | null;
}

interface CollectionDetail extends MovieCollection {
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  movies: CollectionMovie[];
  movieCount: number;
  moviesInLibrary: number;
  qualityProfileId: number | null;
  qualityProfile: { id: number; name: string } | null;
  minimumAvailability: string;
}

export default function CollectionDetailPage() {
  const params = useParams();
  const collectionId = Number(params.id);
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { pushToast } = useToast();

  const [isSearching, setIsSearching] = useState(false);

  const collectionQuery = useApiQuery<CollectionDetail>({
    queryKey: queryKeys.collectionDetail(collectionId),
    queryFn: async () => {
      const response = await fetch(`/api/collections/${collectionId}`);
      if (!response.ok) throw new Error('Failed to fetch collection');
      const envelope = await response.json();
      return envelope.data;
    },
    staleTimeKind: 'detail',
  });

  const monitoredMutation = useMutation({
    mutationFn: (monitored: boolean) =>
      api.collectionApi.update(collectionId, { monitored }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.collectionDetail(collectionId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.collections() });
      pushToast({
        title: 'Collection updated',
        message: 'Monitored status changed successfully.',
        variant: 'success',
      });
    },
  });

  const searchMutation = useMutation({
    mutationFn: () => api.collectionApi.search(collectionId),
    onSuccess: (result) => {
      setIsSearching(false);
      pushToast({
        title: 'Search triggered',
        message: result.message,
        variant: 'success',
      });
    },
    onError: () => {
      setIsSearching(false);
      pushToast({
        title: 'Search failed',
        message: 'Could not trigger search for missing movies.',
        variant: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.collectionApi.delete(collectionId),
    onSuccess: () => {
      pushToast({
        title: 'Collection deleted',
        variant: 'success',
      });
      router.push('/library/collections');
    },
  });

  const handleSearch = useCallback(() => {
    setIsSearching(true);
    searchMutation.mutate();
  }, [searchMutation]);

  const handleDelete = useCallback(() => {
    const confirmed = window.confirm('Delete this collection? Movies will be kept in your library.');
    if (confirmed) {
      deleteMutation.mutate();
    }
  }, [deleteMutation]);

  const collection = collectionQuery.data;

  if (!collection) {
    return (
      <section className="space-y-5">
        <QueryPanel
          isLoading={collectionQuery.isPending}
          isError={collectionQuery.isError}
          isEmpty={collectionQuery.isResolvedEmpty}
          errorMessage={collectionQuery.error?.message}
          onRetry={() => void collectionQuery.refetch()}
          emptyTitle="Collection not found"
          emptyBody="The collection you're looking for doesn't exist or has been deleted."
        >
          <div />
        </QueryPanel>
      </section>
    );
  }

  const completion = collection.movieCount > 0
    ? Math.round((collection.moviesInLibrary / collection.movieCount) * 100)
    : 0;

  return (
    <section className="space-y-5">
      {/* Header with backdrop */}
      <div className="relative overflow-hidden rounded-lg">
        {collection.backdropUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${collection.backdropUrl})` }}
          />
        )}
        <div className="relative bg-surface-1/80 backdrop-blur-sm p-6">
          <div className="flex gap-6">
            {/* Poster */}
            <div className="w-32 shrink-0">
              {collection.posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={collection.posterUrl}
                  alt={collection.name}
                  className="aspect-[2/3] w-full rounded-lg object-cover shadow-elevation-2"
                />
              ) : (
                <div className="aspect-[2/3] w-full rounded-lg bg-surface-2 flex items-center justify-center text-4xl">
                  🎬
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold">{collection.name}</h1>
                  <p className="text-sm text-text-secondary">
                    {collection.movieCount} movies · {collection.moviesInLibrary} in library
                  </p>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={collection.monitored}
                    onChange={event => monitoredMutation.mutate(event.currentTarget.checked)}
                    disabled={monitoredMutation.isPending}
                  />
                  Monitored
                </label>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>Completion</span>
                  <span>{completion}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full bg-status-success transition-all"
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>

              {collection.overview && (
                <p className="text-sm text-text-secondary line-clamp-3">
                  {collection.overview}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-sm border border-border-subtle bg-surface-2 px-4 py-2 text-sm transition-colors hover:bg-surface-3 disabled:opacity-50"
                  onClick={handleSearch}
                  disabled={isSearching}
                >
                  {isSearching ? 'Searching...' : 'Search Missing Movies'}
                </button>
                <button
                  type="button"
                  className="rounded-sm border border-status-error/60 px-4 py-2 text-sm text-status-error transition-colors hover:bg-status-error/10"
                  onClick={handleDelete}
                >
                  Delete Collection
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Movie List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Movies</h2>

        {collection.movies.length === 0 ? (
          <p className="text-sm text-text-secondary">No movies in this collection.</p>
        ) : (
          <div className="space-y-2">
            {collection.movies.map(movie => (
              <div
                key={movie.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border-subtle bg-surface-1 p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <a
                      href={`/library/movies/${movie.id}`}
                      className="font-medium hover:underline truncate"
                    >
                      {movie.title}
                    </a>
                    <span className="text-sm text-text-secondary shrink-0">
                      ({movie.year})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={movie.inLibrary ? 'downloaded' : 'missing'} />
                    {movie.quality && (
                      <span className="text-xs text-text-secondary">{movie.quality}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!movie.inLibrary && (
                    <button
                      type="button"
                      className="rounded-sm border border-border-subtle px-3 py-1 text-xs transition-colors hover:bg-surface-2"
                      onClick={() => {
                        // Navigate to movie page for search
                        window.location.href = `/library/movies/${movie.id}`;
                      }}
                    >
                      Search
                    </button>
                  )}
                  <a
                    href={`/library/movies/${movie.id}`}
                    className="rounded-sm border border-border-subtle px-3 py-1 text-xs transition-colors hover:bg-surface-2"
                  >
                    Open
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
