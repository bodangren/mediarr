'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';

type MovieDetail = {
  id: number;
  title: string;
  year?: number;
  status?: string;
  monitored?: boolean;
  tmdbId?: number;
  fileVariants?: Array<{ id: number; path: string }>;
};

export default function MovieDetailPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number.parseInt(params.id, 10);

  const [releaseCount, setReleaseCount] = useState<number | null>(null);

  const movieQuery = useApiQuery({
    queryKey: queryKeys.movieDetail(id),
    queryFn: () => api.mediaApi.getMovie(id) as Promise<MovieDetail>,
    staleTimeKind: 'detail',
  });

  const searchMutation = useMutation({
    mutationFn: async () => {
      if (!movieQuery.data) {
        return 0;
      }

      const candidates = await api.releaseApi.searchCandidates({
        movieId: movieQuery.data.id,
        title: movieQuery.data.title,
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

  const deleteMutation = useMutation({
    mutationFn: () => api.mediaApi.deleteMovie(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['movies'] });
      pushToast({
        title: 'Movie deleted',
        variant: 'success',
      });
      router.push('/library/movies');
    },
  });

  const movie = movieQuery.data;
  const hasFile = Boolean(movie?.fileVariants && movie.fileVariants.length > 0);

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{movie?.title ?? 'Movie Detail'}</h1>
        <p className="text-sm text-text-secondary">
          Year: {movie?.year ?? '-'} · TMDB: {movie?.tmdbId ?? '-'}
        </p>
      </header>

      <QueryPanel
        isLoading={movieQuery.isPending}
        isError={movieQuery.isError}
        isEmpty={Boolean(movieQuery.isSuccess && !movie)}
        errorMessage={movieQuery.error?.message}
        onRetry={() => void movieQuery.refetch()}
        emptyTitle="Movie not found"
        emptyBody="The selected movie no longer exists."
      >
        <div className="grid gap-3 md:grid-cols-[1fr_280px]">
          <section className="rounded-lg border border-border-subtle bg-surface-1 p-4">
            <h2 className="text-lg font-semibold">Metadata</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">Status</dt>
                <dd><StatusBadge status={movie?.status ?? 'unknown'} /></dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">File</dt>
                <dd><StatusBadge status={hasFile ? 'completed' : 'wanted'} /></dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">Monitored</dt>
                <dd>{movie?.monitored ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
            <div className="mt-3 rounded-sm bg-surface-0 p-2 text-xs text-text-secondary">
              {hasFile ? movie?.fileVariants?.[0]?.path : 'No imported file variant.'}
            </div>
          </section>

          <aside className="space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
            <h2 className="text-lg font-semibold">Actions</h2>
            <button
              type="button"
              className="w-full rounded-sm border border-border-subtle px-3 py-2 text-sm"
              onClick={() => searchMutation.mutate()}
            >
              Search Releases
            </button>
            <button
              type="button"
              className="w-full rounded-sm border border-status-error/60 px-3 py-2 text-sm text-status-error"
              onClick={() => {
                const confirmed = window.confirm(`Delete ${movie?.title ?? 'this movie'}?`);
                if (!confirmed) {
                  return;
                }

                deleteMutation.mutate();
              }}
            >
              Delete Movie
            </button>
            {releaseCount !== null ? (
              <p className="text-xs text-text-secondary">Latest search found {releaseCount} candidates.</p>
            ) : null}
          </aside>
        </div>
      </QueryPanel>

      <Link href="/library/movies" className="inline-flex rounded-sm border border-border-subtle px-3 py-1 text-sm">
        Back to Movies
      </Link>
    </section>
  );
}
