'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { EmptyPanel } from '@/components/primitives/EmptyPanel';
import { ErrorPanel } from '@/components/primitives/ErrorPanel';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { ApiClientError } from '@/lib/api';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';

type MediaType = 'MOVIE' | 'TV';

interface AddConfig {
  qualityProfileId: number;
  monitored: boolean;
  searchNow: boolean;
}

function asRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  return input as Record<string, unknown>;
}

export default function AddMediaPage() {
  const api = useMemo(() => getApiClients(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [mediaType, setMediaType] = useState<MediaType>('MOVIE');
  const [term, setTerm] = useState(() => searchParams.get('q') ?? '');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [conflict, setConflict] = useState<{ existingId?: number; message: string } | null>(null);
  const [config, setConfig] = useState<AddConfig>({
    qualityProfileId: 1,
    monitored: true,
    searchNow: true,
  });

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
        title: String(payload.title ?? ''),
        year: Number(payload.year ?? 0),
        status: typeof payload.status === 'string' ? payload.status : undefined,
        overview: typeof payload.overview === 'string' ? payload.overview : undefined,
        network: typeof payload.network === 'string' ? payload.network : undefined,
        tmdbId: typeof payload.tmdbId === 'number' ? payload.tmdbId : undefined,
        tvdbId: typeof payload.tvdbId === 'number' ? payload.tvdbId : undefined,
        imdbId: typeof payload.imdbId === 'string' ? payload.imdbId : undefined,
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
      } else {
        router.push(`/library/series/${id}`);
      }
    },
    onError: (error: Error) => {
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

  const existingIds = new Set<number>();
  if (mediaType === 'MOVIE') {
    for (const row of existingMoviesQuery.data?.items ?? []) {
      existingIds.add(row.tmdbId ?? -1);
    }
  } else {
    for (const row of existingSeriesQuery.data?.items ?? []) {
      const candidate = row as Record<string, unknown>;
      const tvdbId = candidate.tvdbId;
      if (typeof tvdbId === 'number') {
        existingIds.add(tvdbId);
      }
    }
  }

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Add Media</h1>
        <p className="text-sm text-text-secondary">
          Search metadata, review details, and add movies or series with monitor defaults.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {(['MOVIE', 'TV'] as const).map(type => (
          <button
            key={type}
            type="button"
            className={`rounded-sm border px-3 py-1 text-sm ${
              mediaType === type ? 'border-accent-primary bg-accent-primary/20' : 'border-border-subtle'
            }`}
            onClick={() => {
              setMediaType(type);
              setSelected(null);
              setConflict(null);
            }}
          >
            {type === 'MOVIE' ? 'Movies' : 'Series'}
          </button>
        ))}
      </div>

      <label className="block space-y-1 text-sm">
        <span>Search</span>
        <input
          value={term}
          onChange={event => setTerm(event.currentTarget.value)}
          placeholder="Search title..."
          className="w-full rounded-sm border border-border-subtle bg-surface-1 px-3 py-2"
        />
      </label>

      {conflict ? (
        <div className="rounded-md border border-status-warning/60 bg-status-warning/10 p-3 text-sm">
          <p className="font-semibold text-text-primary">Duplicate found</p>
          <p className="text-text-secondary">{conflict.message}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="rounded-sm border border-border-subtle px-2 py-1"
              onClick={() => {
                if (!conflict.existingId) {
                  return;
                }

                if (mediaType === 'MOVIE') {
                  router.push(`/library/movies/${conflict.existingId}`);
                } else {
                  router.push(`/library/series/${conflict.existingId}`);
                }
              }}
            >
              Go to existing
            </button>
            <button
              type="button"
              className="rounded-sm border border-border-subtle px-2 py-1"
              onClick={() => {
                pushToast({
                  title: 'Force add unavailable',
                  message: 'Backend duplicate constraints rejected this item. Adjust metadata and retry.',
                  variant: 'info',
                });
              }}
            >
              Add anyway
            </button>
          </div>
        </div>
      ) : null}

      <QueryPanel
        isLoading={searchQuery.isPending}
        isError={searchQuery.isError}
        isEmpty={Boolean(searchQuery.isSuccess && searchQuery.data && searchQuery.data.length === 0)}
        errorMessage={searchQuery.error?.message}
        onRetry={() => void searchQuery.refetch()}
        emptyTitle="No results"
        emptyBody="Try a broader term or switch media type."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(searchQuery.data ?? []).map(raw => {
            const item = asRecord(raw);
            const title = String(item.title ?? 'Unknown title');
            const year = typeof item.year === 'number' ? item.year : undefined;
            const keyId = mediaType === 'MOVIE' ? item.tmdbId : item.tvdbId;
            const alreadyAdded = typeof keyId === 'number' && existingIds.has(keyId);
            const selectedKey = selected ? (mediaType === 'MOVIE' ? asRecord(selected).tmdbId : asRecord(selected).tvdbId) : null;

            return (
              <article
                key={`${mediaType}-${String(keyId ?? title)}`}
                className={`rounded-lg border p-3 ${
                  selectedKey === keyId ? 'border-accent-primary bg-accent-primary/10' : 'border-border-subtle bg-surface-1'
                }`}
              >
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-text-secondary">{year ?? 'Unknown year'}</p>
                {alreadyAdded ? <StatusBadge status="monitored" /> : null}
                <p className="mt-2 line-clamp-3 text-sm text-text-secondary">{String(item.overview ?? 'No overview available.')}</p>
                <button
                  type="button"
                  className="mt-3 rounded-sm border border-border-subtle px-2 py-1 text-xs"
                  onClick={() => {
                    setSelected(item);
                    setConflict(null);
                  }}
                >
                  {alreadyAdded ? 'Review Add Config' : 'Select'}
                </button>
              </article>
            );
          })}
        </div>
      </QueryPanel>

      {selected ? (
        <section className="rounded-lg border border-border-subtle bg-surface-1 p-4">
          <h2 className="text-lg font-semibold">Add Configuration</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span>Quality Profile</span>
              <select
                value={config.qualityProfileId}
                onChange={event => {
                  const qualityProfileId = Number.parseInt(event.currentTarget.value, 10);
                  setConfig(current => ({
                    ...current,
                    qualityProfileId,
                  }));
                }}
                className="w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1"
              >
                <option value={1}>HD-1080p</option>
                <option value={2}>UltraHD</option>
              </select>
            </label>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.monitored}
                onChange={event => {
                  const monitored = event.currentTarget.checked;
                  setConfig(current => ({
                    ...current,
                    monitored,
                  }));
                }}
              />
              Monitored
            </label>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.searchNow}
                onChange={event => {
                  const searchNow = event.currentTarget.checked;
                  setConfig(current => ({
                    ...current,
                    searchNow,
                  }));
                }}
              />
              Search on add
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="rounded-sm border border-border-subtle px-3 py-1 text-sm"
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? 'Adding...' : 'Add media'}
            </button>
            <button
              type="button"
              className="rounded-sm border border-border-subtle px-3 py-1 text-sm"
              onClick={() => setSelected(null)}
            >
              Cancel
            </button>
          </div>
        </section>
      ) : (
        <EmptyPanel title="Select a result" body="Choose a metadata card to configure add settings." />
      )}

      {addMutation.isError && !(addMutation.error instanceof ApiClientError) ? (
        <ErrorPanel title="Add failed" body={addMutation.error.message} onRetry={() => addMutation.mutate()} />
      ) : null}
    </section>
  );
}
