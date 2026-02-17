'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Search, Film, Calendar, ChevronDown, ChevronUp, Globe, ExternalLink, Tag, X } from 'lucide-react';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { Button } from '@/components/primitives/Button';
import { InteractiveSearchModal } from '@/components/search';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useOptimisticMutation } from '@/lib/query/useOptimisticMutation';

type SeriesDetail = {
  id: number;
  title: string;
  year?: number;
  status?: string;
  monitored?: boolean;
  network?: string;
  overview?: string;
  tvdbId?: number;
  tmdbId?: number;
  imdbId?: string;
  seasons?: Array<{
    seasonNumber: number;
    monitored?: boolean;
    episodes?: Array<{
      id: number;
      episodeNumber: number;
      title: string;
      seasonNumber: number;
      monitored?: boolean;
      path?: string | null;
      airDateUtc?: string | null;
    }>;
  }>;
};

export default function SeriesDetailPage() {
  const api = useMemo(() => getApiClients(), []);
  const params = useParams<{ id: string }>();
  const id = Number.parseInt(params.id, 10);

  // State for interactive search modal
  const [searchModal, setSearchModal] = useState<{
    isOpen: boolean;
    episodeId: number | null;
    episodeNumber?: number;
    episodeTitle?: string;
    seasonNumber: number;
  }>({
    isOpen: false,
    episodeId: null,
    episodeNumber: undefined,
    episodeTitle: undefined,
    seasonNumber: 0,
  });

  // State for collapsible sections
  const [alternateTitlesOpen, setAlternateTitlesOpen] = useState(false);

  const openSearchModal = (seasonNumber: number, episode?: {
    id: number;
    episodeNumber: number;
    title: string;
  }) => {
    setSearchModal({
      isOpen: true,
      episodeId: episode?.id ?? null,
      episodeNumber: episode?.episodeNumber,
      episodeTitle: episode?.title,
      seasonNumber,
    });
  };

  const closeSearchModal = () => {
    setSearchModal(prev => ({ ...prev, isOpen: false }));
  };

  const seriesQuery = useApiQuery({
    queryKey: queryKeys.seriesDetail(id),
    queryFn: () => api.mediaApi.getSeries(id) as Promise<SeriesDetail>,
    staleTimeKind: 'detail',
  });

  const episodeMonitoredMutation = useOptimisticMutation<SeriesDetail, { id: number; monitored: boolean }, any>({
    queryKey: queryKeys.seriesDetail(id),
    mutationFn: variables => api.mediaApi.setEpisodeMonitored(variables.id, variables.monitored),
    updater: (current, variables) => {
      return {
        ...current,
        seasons: current.seasons?.map(season => ({
          ...season,
          episodes: season.episodes?.map(episode => {
            if (episode.id !== variables.id) {
              return episode;
            }
            return { ...episode, monitored: variables.monitored };
          }),
        })),
      };
    },
    errorMessage: 'Could not update episode monitored state.',
  });

  const series = seriesQuery.data;

  // Format date for display
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <section className="space-y-4">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{series?.title ?? 'Series Detail'}</h1>
        <p className="text-sm text-text-secondary">
          Year: {series?.year ?? '-'} · Status: {series?.status ?? 'unknown'}
          {series?.network && ` · Network: ${series.network}`}
        </p>
      </header>

      {/* External Links */}
      {series && (series.tmdbId || series.imdbId || series.tvdbId) && (
        <div className="flex gap-2">
          {series.imdbId && (
            <a
              href={`https://www.imdb.com/title/${series.imdbId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
              aria-label="View on IMDb"
            >
              <Film size={14} />
              IMDb
            </a>
          )}
          {series.tvdbId && (
            <a
              href={`https://thetvdb.com/series/${series.tvdbId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
              aria-label="View on TheTVDB"
            >
              <ExternalLink size={14} />
              TVDB
            </a>
          )}
          {series.tmdbId && (
            <a
              href={`https://www.themoviedb.org/tv/${series.tmdbId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
              aria-label="View on TMDB"
            >
              <Globe size={14} />
              TMDB
            </a>
          )}
        </div>
      )}

      {/* Overview */}
      {series?.overview && (
        <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="text-sm font-semibold text-text-primary mb-2">Overview</h2>
          <p className="text-sm text-text-secondary leading-relaxed">{series.overview}</p>
        </div>
      )}

      <QueryPanel
        isLoading={seriesQuery.isPending}
        isError={seriesQuery.isError}
        isEmpty={Boolean(seriesQuery.isSuccess && !series)}
        errorMessage={seriesQuery.error?.message}
        onRetry={() => void seriesQuery.refetch()}
        emptyTitle="Series not found"
        emptyBody="The selected series no longer exists."
      >
        <div className="space-y-3">
          {(series?.seasons ?? []).map(season => (
            <details key={season.seasonNumber} className="rounded-md border border-border-subtle bg-surface-1" open>
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-text-primary flex items-center justify-between">
                <span>Season {season.seasonNumber}</span>
                <Button
                  variant="primary"
                  onClick={(e) => {
                    e.preventDefault();
                    openSearchModal(season.seasonNumber);
                  }}
                  className="text-xs"
                >
                  <Search size={12} className="mr-1" />
                  Search Season
                </Button>
              </summary>
              <div className="space-y-2 border-t border-border-subtle px-4 py-3">
                {(season.episodes ?? []).map(episode => {
                  const monitored = Boolean(episode.monitored);
                  const hasFile = Boolean(episode.path);

                  return (
                    <div key={episode.id} className="flex items-center gap-3 rounded-sm bg-surface-0 px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          E{episode.episodeNumber}: {episode.title}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {episode.airDateUtc ? (
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {formatDate(episode.airDateUtc)}
                            </span>
                          ) : (
                            <span>TBA</span>
                          )}
                          {' · '}
                          {hasFile ? episode.path : 'File missing'}
                        </p>
                      </div>
                      <StatusBadge status={hasFile ? 'completed' : 'wanted'} />
                      <button
                        type="button"
                        className="p-1.5 rounded-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
                        onClick={() => openSearchModal(season.seasonNumber, {
                          id: episode.id,
                          episodeNumber: episode.episodeNumber,
                          title: episode.title,
                        })}
                        title="Interactive Search"
                      >
                        <Search size={16} />
                      </button>
                      <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
                        <input
                          type="checkbox"
                          checked={monitored}
                          onChange={event => {
                            episodeMonitoredMutation.mutate({
                              id: episode.id,
                              monitored: event.currentTarget.checked,
                            });
                          }}
                        />
                        Monitored
                      </label>
                    </div>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      </QueryPanel>

      {/* Alternate Titles Section */}
      <div className="rounded-md border border-border-subtle bg-surface-1">
        <button
          type="button"
          onClick={() => setAlternateTitlesOpen(!alternateTitlesOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-text-primary"
        >
          <span>Alternate Titles</span>
          {alternateTitlesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {alternateTitlesOpen && (
          <div className="border-t border-border-subtle px-4 py-3">
            <p className="text-sm text-text-secondary">No alternate titles available.</p>
          </div>
        )}
      </div>

      {/* Tags Section */}
      <div className="rounded-md border border-border-subtle bg-surface-1">
        <div className="px-4 py-3 flex items-center gap-2">
          <Tag size={14} className="text-text-secondary" />
          <span className="text-sm font-semibold text-text-primary">Tags</span>
        </div>
        <div className="border-t border-border-subtle px-4 py-3">
          <p className="text-sm text-text-secondary">No tags assigned.</p>
        </div>
      </div>

      <Link href="/library/series" className="inline-flex rounded-sm border border-border-subtle px-3 py-1 text-sm">
        Back to Series
      </Link>

      {/* Interactive Search Modal */}
      {series && (
        <InteractiveSearchModal
          isOpen={searchModal.isOpen}
          onClose={closeSearchModal}
          seriesId={series.id}
          tvdbId={series.tvdbId}
          episodeId={searchModal.episodeId}
          seriesTitle={series.title}
          seasonNumber={searchModal.seasonNumber}
          episodeNumber={searchModal.episodeNumber}
          episodeTitle={searchModal.episodeTitle}
        />
      )}
    </section>
  );
}

