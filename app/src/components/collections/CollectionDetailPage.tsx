
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useToast } from '@/components/providers/ToastProvider';

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const collectionId = Number(id);
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const { data: collection, isLoading } = useQuery({
    queryKey: queryKeys.collectionDetail(collectionId),
    queryFn: () => api.collectionApi.getById(collectionId),
    enabled: !Number.isNaN(collectionId),
  });

  const searchMutation = useMutation({
    mutationFn: () => api.collectionApi.search(collectionId),
    onSuccess: result => {
      pushToast({ variant: 'success', message: `Searching for ${result.missing} missing movies.` });
    },
    onError: () => {
      pushToast({ variant: 'error', message: 'Search failed.' });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => api.collectionApi.sync(collectionId),
    onSuccess: result => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.collectionDetail(collectionId) });
      pushToast({ variant: 'success', message: `Synced: ${result.added} added, ${result.updated} updated.` });
    },
    onError: () => {
      pushToast({ variant: 'error', message: 'Sync failed.' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-text-secondary">
        Loading…
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex items-center justify-center py-12 text-text-secondary">
        Collection not found.
      </div>
    );
  }

  const backdropUrl = collection.backdropUrl ?? null;
  const posterUrl = collection.posterUrl ?? '/images/placeholder-poster.png';

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {backdropUrl && (
          <img
            src={backdropUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        )}
        <div className="relative z-10 flex gap-6 p-6">
          <img
            src={posterUrl}
            alt={collection.name}
            className="w-32 flex-shrink-0 rounded-md object-cover shadow-elevation-2"
            onError={event => {
              event.currentTarget.src = '/images/placeholder-poster.png';
            }}
          />
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-text-primary">{collection.name}</h1>
            {collection.overview && (
              <p className="text-sm text-text-secondary">{collection.overview}</p>
            )}
            <span className="w-fit rounded-full bg-accent-primary/20 px-2 py-0.5 text-xs font-medium text-accent-primary">
              {collection.moviesInLibrary} of {collection.movieCount} in library
            </span>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => searchMutation.mutate()}
                disabled={searchMutation.isPending}
                className="rounded-md border border-border-subtle bg-surface-1 px-3 py-1.5 text-sm hover:bg-surface-2 disabled:opacity-50"
              >
                Search for Missing
              </button>
              <button
                type="button"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="rounded-md border border-border-subtle bg-surface-1 px-3 py-1.5 text-sm hover:bg-surface-2 disabled:opacity-50"
              >
                Sync from TMDB
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Movie List */}
      <div className="flex flex-col gap-1 p-6">
        {(collection.movies ?? []).map(movie => (
          <Link
            key={movie.id}
            to={`/library/movies/${movie.id}`}
            className="flex items-center gap-3 rounded-md border border-border-subtle bg-surface-1 p-3 hover:bg-surface-2 transition-colors"
          >
            {movie.posterUrl ? (
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="h-12 w-8 flex-shrink-0 rounded object-cover"
                onError={event => { event.currentTarget.src = '/images/placeholder-poster.png'; }}
              />
            ) : (
              <div className="h-12 w-8 flex-shrink-0 rounded bg-surface-2" />
            )}
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-sm font-medium text-text-primary">{movie.title}</span>
              {movie.year && (
                <span className="text-xs text-text-secondary">{movie.year}</span>
              )}
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                movie.inLibrary
                  ? 'bg-status-completed/20 text-status-completed'
                  : 'bg-status-error/20 text-status-error'
              }`}
            >
              {movie.inLibrary ? 'In Library' : 'Missing'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
