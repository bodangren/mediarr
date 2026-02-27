'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import type { MissingEpisode, CutoffUnmetEpisode, MissingMovie, CutoffUnmetMovie, ContentType } from '@/types/wanted';
import { MissingTab } from './MissingTab';
import { CutoffUnmetTab } from './CutoffUnmetTab';
import { MovieMissingTab } from './MovieMissingTab';
import { MovieCutoffUnmetTab } from './MovieCutoffUnmetTab';
import type { ReleaseCandidate } from '@/lib/api/releaseApi';

type ReleaseRow = {
  indexer: string;
  title: string;
  size: number;
  seeders: number;
  quality?: string;
  age?: number;
  magnetUrl?: string;
  downloadUrl?: string;
};

function qualityStatus(quality?: string): 'completed' | 'downloading' | 'wanted' {
  if (!quality) {
    return 'wanted';
  }

  if (quality.includes('2160')) {
    return 'completed';
  }

  if (quality.includes('1080')) {
    return 'downloading';
  }

  return 'wanted';
}

export default function WantedPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { pushToast } = useToast();

  const [contentType, setContentType] = useState<ContentType>(() => {
    // Try to load from localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem('mediarr.wanted.state');
        if (stored) {
          const parsed = JSON.parse(stored) as { contentType?: string; activeTab: string };
          if (parsed.contentType === 'tv' || parsed.contentType === 'movies') {
            return parsed.contentType as ContentType;
          }
        }
      } catch {
        // Fall through to default
      }
    }
    return 'tv';
  });

  const [activeTab, setActiveTab] = useState<'missing' | 'cutoffUnmet'>(() => {
    // Try to load from localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem('mediarr.wanted.state');
        if (stored) {
          const parsed = JSON.parse(stored) as { activeTab: string };
          if (parsed.activeTab === 'missing' || parsed.activeTab === 'cutoffUnmet') {
            return parsed.activeTab;
          }
        }
      } catch {
        // Fall through to default
      }
    }
    return 'missing';
  });

  // Persist state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('mediarr.wanted.state', JSON.stringify({ contentType, activeTab }));
    }
  }, [contentType, activeTab]);

  const [selectedEpisode, setSelectedEpisode] = useState<MissingEpisode | CutoffUnmetEpisode | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<MissingMovie | CutoffUnmetMovie | null>(null);
  const [releaseSort, setReleaseSort] = useState<'seeders' | 'size' | 'age'>('seeders');

  const releaseRequest = selectedEpisode
    ? {
        title: `${selectedEpisode.seriesTitle} S${String(selectedEpisode.seasonNumber).padStart(2, '0')}E${String(selectedEpisode.episodeNumber).padStart(2, '0')}`,
        episodeId: selectedEpisode.id,
        type: 'episode' as const,
      }
    : selectedMovie
      ? {
          title: `${selectedMovie.title} (${selectedMovie.year})`,
          movieId: selectedMovie.movieId,
          type: 'movie' as const,
        }
      : null;

  const releasesQuery = useMemo(() => {
    if (!releaseRequest) {
      return { data: [], isPending: false, isError: false, error: null, refetch: () => Promise.resolve() };
    }

    return {
      data: [] as ReleaseRow[],
      isPending: false,
      isError: false,
      error: null as Error | null,
      refetch: () => api.releaseApi.searchCandidates(releaseRequest).then(data => data as unknown as ReleaseRow[]),
    };
  }, [releaseRequest, api]);

  const grabMutation = useMutation({
    mutationFn: (candidate: ReleaseRow) => api.releaseApi.grabRelease(candidate as unknown as ReleaseCandidate),
    onSuccess: () => {
      pushToast({
        title: 'Release grabbed',
        message: 'Queued for download.',
        variant: 'success',
        action: {
          label: 'Open queue',
          onClick: () => router.push('/queue'),
        },
      });

      void queryClient.invalidateQueries({ queryKey: ['torrents'] });
      void queryClient.invalidateQueries({ queryKey: ['media', 'wanted'] });
      void queryClient.invalidateQueries({ queryKey: ['episodes', 'missing'] });
      void queryClient.invalidateQueries({ queryKey: ['episodes', 'cutoff-unmet'] });
      void queryClient.invalidateQueries({ queryKey: ['movies', 'missing'] });
      void queryClient.invalidateQueries({ queryKey: ['movies', 'cutoff-unmet'] });
      router.push('/queue');
    },
    onError: (error: Error, candidate) => {
      pushToast({
        title: 'Grab failed',
        message: error.message,
        variant: 'error',
        action: {
          label: 'Retry',
          onClick: () => {
            grabMutation.mutate(candidate);
          },
        },
      });
    },
  });

  const handleSearchEpisode = useCallback((episode: MissingEpisode | CutoffUnmetEpisode) => {
    setSelectedEpisode(episode);
    setSelectedMovie(null);
  }, []);

  const handleSearchMovie = useCallback((movie: MissingMovie | CutoffUnmetMovie) => {
    setSelectedMovie(movie);
    setSelectedEpisode(null);
  }, []);

  const handleBulkSearchEpisodes = useCallback((episodes: (MissingEpisode | CutoffUnmetEpisode)[]) => {
    // For bulk search, we'll trigger searches for each episode
    // In a real implementation, this might be a batch API call
    episodes.forEach(episode => {
      void api.releaseApi.searchCandidates({
        title: `${episode.seriesTitle} S${String(episode.seasonNumber).padStart(2, '0')}E${String(episode.episodeNumber).padStart(2, '0')}`,
        episodeId: episode.id,
        type: 'episode',
      });
    });

    pushToast({
      title: 'Bulk search initiated',
      message: `Searching for ${episodes.length} episode(s).`,
      variant: 'success',
    });
  }, [api, pushToast]);

  const handleBulkSearchMovies = useCallback((movies: (MissingMovie | CutoffUnmetMovie)[]) => {
    // For bulk search, we'll trigger searches for each movie
    // In a real implementation, this might be a batch API call
    movies.forEach(movie => {
      void api.releaseApi.searchCandidates({
        title: `${movie.title} (${movie.year})`,
        movieId: movie.movieId,
        type: 'movie',
      });
    });

    pushToast({
      title: 'Bulk search initiated',
      message: `Searching for ${movies.length} movie(s).`,
      variant: 'success',
    });
  }, [api, pushToast]);

  const sortedCandidates = [...(releasesQuery.data ?? [])].sort((left, right) => {
    if (releaseSort === 'size') {
      return right.size - left.size;
    }

    if (releaseSort === 'age') {
      return (left.age ?? 0) - (right.age ?? 0);
    }

    return right.seeders - left.seeders;
  });

  const selectedItem = selectedEpisode ?? selectedMovie;
  const itemLabel = selectedEpisode
    ? `${selectedEpisode.seriesTitle} · S${String(selectedEpisode.seasonNumber).padStart(2, '0')}E${String(selectedEpisode.episodeNumber).padStart(2, '0')}`
    : selectedMovie
      ? `${selectedMovie.title} (${selectedMovie.year})`
      : null;

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Wanted</h1>
        <p className="text-sm text-text-secondary">
          {contentType === 'tv' 
            ? 'Track missing episodes, search for releases, and upgrade quality cutoffs.' 
            : 'Track missing movies, search for releases, and upgrade quality cutoffs.'}
        </p>
      </header>

      {/* Content Type Toggle */}
      <div className="flex items-center gap-2 border-b border-border-subtle pb-1">
        <button
          type="button"
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            contentType === 'tv'
              ? 'text-accent-primary border-b-2 border-accent-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
          onClick={() => setContentType('tv')}
        >
          TV Series
        </button>
        <button
          type="button"
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            contentType === 'movies'
              ? 'text-accent-primary border-b-2 border-accent-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
          onClick={() => setContentType('movies')}
        >
          Movies
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border-subtle pb-1">
        <button
          type="button"
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'missing'
              ? 'text-accent-primary border-b-2 border-accent-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
          onClick={() => setActiveTab('missing')}
        >
          Missing
        </button>
        <button
          type="button"
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'cutoffUnmet'
              ? 'text-accent-primary border-b-2 border-accent-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
          onClick={() => setActiveTab('cutoffUnmet')}
        >
          Cutoff Unmet
        </button>
      </div>

      {/* Tab Content */}
      {contentType === 'tv' ? (
        activeTab === 'missing' ? (
          <MissingTab
            onSearchEpisode={handleSearchEpisode}
            onBulkSearch={handleBulkSearchEpisodes}
          />
        ) : (
          <CutoffUnmetTab
            onSearchEpisode={handleSearchEpisode}
            onBulkSearch={handleBulkSearchEpisodes}
          />
        )
      ) : (
        activeTab === 'missing' ? (
          <MovieMissingTab
            onSearchMovie={handleSearchMovie}
            onBulkSearch={handleBulkSearchMovies}
          />
        ) : (
          <MovieCutoffUnmetTab
            onSearchMovie={handleSearchMovie}
            onBulkSearch={handleBulkSearchMovies}
          />
        )
      )}

      {/* Release Candidates Panel */}
      {selectedItem ? (
        <section className="space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Release Candidates</h2>
              <p className="text-sm text-text-secondary">{itemLabel}</p>
            </div>

            <label className="text-sm">
              Sort by{' '}
              <select
                value={releaseSort}
                className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1"
                onChange={event => setReleaseSort(event.currentTarget.value as 'seeders' | 'size' | 'age')}
              >
                <option value="seeders">Seeders</option>
                <option value="size">Size</option>
                <option value="age">Age</option>
              </select>
            </label>
          </div>

          <QueryPanel
            isLoading={releasesQuery.isPending}
            isError={releasesQuery.isError}
            isEmpty={releasesQuery.data?.length === 0}
            errorMessage={releasesQuery.error?.message}
            onRetry={() => void releasesQuery.refetch()}
            emptyTitle="No candidate releases"
            emptyBody="Try broader terms or a different indexer profile."
          >
            <div className="overflow-x-auto rounded-md border border-border-subtle">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-surface-2 text-text-secondary">
                  <tr>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Indexer</th>
                    <th className="px-3 py-2">Size</th>
                    <th className="px-3 py-2">Seeders</th>
                    <th className="px-3 py-2">Age</th>
                    <th className="px-3 py-2">Quality</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-surface-1">
                  {sortedCandidates.map(candidate => (
                    <tr key={`${candidate.indexer}-${candidate.title}`}>
                      <td className="px-3 py-2">{candidate.title}</td>
                      <td className="px-3 py-2">{candidate.indexer}</td>
                      <td className="px-3 py-2">{(candidate.size / (1024 * 1024 * 1024)).toFixed(1)} GB</td>
                      <td className="px-3 py-2">{candidate.seeders}</td>
                      <td className="px-3 py-2">{candidate.age ?? '-'} d</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={qualityStatus(candidate.quality)} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                          onClick={() => grabMutation.mutate(candidate)}
                        >
                          Grab
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </QueryPanel>
        </section>
      ) : null}
    </section>
  );
}
