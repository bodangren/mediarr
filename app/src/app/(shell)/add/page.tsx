'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { EmptyPanel } from '@/components/primitives/EmptyPanel';
import { ErrorPanel } from '@/components/primitives/ErrorPanel';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { useToast } from '@/components/providers/ToastProvider';
import { ApiClientError } from '@/lib/api';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { SearchResultCard } from '@/components/add/SearchResultCard';
import {
  SeriesMonitoringOptionsPopover,
  type MonitoringOption,
} from '@/components/add/SeriesMonitoringOptionsPopover';
import { SeriesTypePopover, type SeriesType } from '@/components/add/SeriesTypePopover';

type MediaType = 'MOVIE' | 'TV';

interface AddConfig {
  qualityProfileId: number;
  monitored: boolean;
  searchNow: boolean;
  rootFolder: string;
  monitor: MonitoringOption;
  seriesType: SeriesType;
  seasonFolder: boolean;
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

  const [mediaType, setMediaType] = useState<MediaType>('TV');
  const [term, setTerm] = useState(() => searchParams.get('q') ?? '');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [conflict, setConflict] = useState<{ existingId?: number; message: string } | null>(null);
  const [config, setConfig] = useState<AddConfig>({
    qualityProfileId: 1,
    monitored: true,
    searchNow: true,
    rootFolder: '/tv',
    monitor: 'all',
    seriesType: 'standard',
    seasonFolder: true,
  });

  // Fetch quality profiles dynamically
  const qualityProfilesQuery = useApiQuery({
    queryKey: ['quality-profiles'],
    queryFn: () => api.qualityProfileApi.list(),
    staleTimeKind: 'list',
  });

  const qualityProfiles = qualityProfilesQuery.data ?? [];

  // Set default quality profile when profiles are loaded
  useEffect(() => {
    if (qualityProfiles.length > 0 && !qualityProfiles.find(p => p.id === config.qualityProfileId)) {
      setConfig(current => ({
        ...current,
        qualityProfileId: qualityProfiles[0].id,
      }));
    }
  }, [qualityProfiles, config.qualityProfileId]);

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
        rootFolder: config.rootFolder,
        monitor: mediaType === 'TV' ? config.monitor : undefined,
        seriesType: mediaType === 'TV' ? config.seriesType : undefined,
        seasonFolder: mediaType === 'TV' ? config.seasonFolder : undefined,
        title: String(payload.title ?? ''),
        year: Number(payload.year ?? 0),
        status: typeof payload.status === 'string' ? payload.status : undefined,
        overview: typeof payload.overview === 'string' ? payload.overview : undefined,
        network: typeof payload.network === 'string' ? payload.network : undefined,
        tmdbId: typeof payload.tmdbId === 'number' ? payload.tmdbId : undefined,
        tvdbId: typeof payload.tvdbId === 'number' ? payload.tvdbId : undefined,
        imdbId: typeof payload.imdbId === 'string' ? payload.imdbId : undefined,
        posterUrl: typeof payload.posterUrl === 'string' ? payload.posterUrl : undefined,
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

  const getSelectedKey = () => {
    if (!selected) return null;
    return mediaType === 'MOVIE' ? asRecord(selected).tmdbId : asRecord(selected).tvdbId;
  };

  const selectedKey = getSelectedKey();

  return (
    <section className="space-y-5">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Add Media</h1>
          <p className="text-sm text-text-secondary">
            Search metadata, review details, and add movies or series with monitor defaults.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push('/add/import')}
            className="rounded-sm border border-accent-primary bg-accent-primary/10 px-3 py-1.5 text-sm font-medium text-accent-primary hover:bg-accent-primary/20"
          >
            Import Series
          </button>
          <button
            type="button"
            onClick={() => router.push('/add/import/episodes')}
            className="rounded-sm border border-accent-primary bg-accent-primary/10 px-3 py-1.5 text-sm font-medium text-accent-primary hover:bg-accent-primary/20"
          >
            Import Episodes
          </button>
          <button
            type="button"
            onClick={() => router.push('/add/import/movies')}
            className="rounded-sm border border-accent-primary bg-accent-primary/10 px-3 py-1.5 text-sm font-medium text-accent-primary hover:bg-accent-primary/20"
          >
            Import Movies
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {(['TV', 'MOVIE'] as const).map(type => (
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
          placeholder={`Search for a ${mediaType === 'TV' ? 'series' : 'movie'}...`}
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
        <div className="grid gap-3 lg:grid-cols-2">
          {(searchQuery.data ?? []).map(raw => {
            const item = asRecord(raw);
            const title = String(item.title ?? 'Unknown title');
            const year = typeof item.year === 'number' ? item.year : undefined;
            const keyId = mediaType === 'MOVIE' ? item.tmdbId : item.tvdbId;
            const alreadyAdded = typeof keyId === 'number' && existingIds.has(keyId);
            const posterUrl = typeof item.posterUrl === 'string' ? item.posterUrl : undefined;
            const overview = typeof item.overview === 'string' ? item.overview : undefined;
            const network = typeof item.network === 'string' ? item.network : undefined;
            const status = typeof item.status === 'string' ? item.status : undefined;

            return (
              <SearchResultCard
                key={`${mediaType}-${String(keyId ?? title)}`}
                title={title}
                year={year}
                overview={overview}
                network={network}
                status={status}
                posterUrl={posterUrl}
                tmdbId={typeof item.tmdbId === 'number' ? item.tmdbId : undefined}
                tvdbId={typeof item.tvdbId === 'number' ? item.tvdbId : undefined}
                mediaType={mediaType}
                isSelected={selectedKey === keyId}
                alreadyAdded={alreadyAdded}
                onSelect={() => {
                  setSelected(item);
                  setConflict(null);
                }}
              />
            );
          })}
        </div>
      </QueryPanel>

      {selected ? (
        <section className="rounded-lg border border-border-subtle bg-surface-1 p-4">
          <h2 className="text-lg font-semibold">Add Configuration</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Quality Profile Selection */}
            <label className="space-y-1 text-sm">
              <span className="font-medium">Quality Profile</span>
              <select
                value={config.qualityProfileId}
                onChange={event => {
                  const qualityProfileId = Number.parseInt(event.currentTarget.value, 10);
                  setConfig(current => ({
                    ...current,
                    qualityProfileId,
                  }));
                }}
                className="w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-2"
                disabled={qualityProfilesQuery.isLoading}
              >
                {qualityProfilesQuery.isLoading ? (
                  <option value="">Loading...</option>
                ) : qualityProfiles.length === 0 ? (
                  <option value="">No profiles available</option>
                ) : (
                  qualityProfiles.map(profile => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))
                )}
              </select>
            </label>

            {/* Root Folder Selection */}
            <label className="space-y-1 text-sm">
              <span className="font-medium">Root Folder</span>
              <input
                type="text"
                value={config.rootFolder}
                onChange={event => {
                  const rootFolder = event.currentTarget.value;
                  setConfig(current => ({
                    ...current,
                    rootFolder,
                  }));
                }}
                placeholder="/path/to/media"
                className="w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-2"
              />
              <p className="text-xs text-text-secondary">Path where media files will be stored</p>
            </label>

            {/* Monitoring Options (TV only) */}
            {mediaType === 'TV' && (
              <label className="space-y-1 text-sm">
                <span className="font-medium">Monitor</span>
                <SeriesMonitoringOptionsPopover
                  value={config.monitor}
                  onChange={monitor => setConfig(current => ({ ...current, monitor }))}
                />
              </label>
            )}

            {/* Series Type (TV only) */}
            {mediaType === 'TV' && (
              <label className="space-y-1 text-sm">
                <span className="font-medium">Series Type</span>
                <SeriesTypePopover
                  value={config.seriesType}
                  onChange={seriesType => setConfig(current => ({ ...current, seriesType }))}
                />
              </label>
            )}
          </div>

          {/* Checkboxes */}
          <div className="mt-4 flex flex-wrap gap-4">
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
              <span>Monitored</span>
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
              <span>Start search for missing episodes</span>
            </label>

            {mediaType === 'TV' && (
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.seasonFolder}
                  onChange={event => {
                    const seasonFolder = event.currentTarget.checked;
                    setConfig(current => ({
                      ...current,
                      seasonFolder,
                    }));
                  }}
                />
                <span>Use season folders</span>
              </label>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="rounded-sm bg-accent-primary px-4 py-2 text-sm font-medium text-text-on-accent hover:bg-accent-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? 'Adding...' : `Add ${mediaType === 'TV' ? 'Series' : 'Movie'}`}
            </button>
            <button
              type="button"
              className="rounded-sm border border-border-subtle px-3 py-2 text-sm"
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
