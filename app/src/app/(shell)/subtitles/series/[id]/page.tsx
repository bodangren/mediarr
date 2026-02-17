'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ChevronDown, ChevronRight, Search, Upload } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { ManualSearchModal } from '@/components/subtitles/ManualSearchModal';
import { SyncButton } from '@/components/subtitles/SyncButton';
import { ScanButton } from '@/components/subtitles/ScanButton';
import { SearchButton } from '@/components/subtitles/SearchButton';
import { getApiClients } from '@/lib/api/client';
import { useApiQuery } from '@/lib/query/useApiQuery';

type SeriesDetail = {
  id: number;
  title: string;
  year?: number;
  overview?: string;
  poster?: string;
  monitored?: boolean;
};

type EpisodeSubtitle = {
  episodeId: number;
  seasonNumber: number;
  episodeNumber: number;
  title?: string;
  subtitleTracks: Array<{
    languageCode: string;
    isForced: boolean;
    isHi: boolean;
    path: string;
    provider: string;
  }>;
  missingSubtitles: string[];
};

type SeasonRow = {
  seasonNumber: number;
  episodes: EpisodeSubtitle[];
};

export default function SeriesSubtitleDetailPage() {
  const api = useMemo(() => getApiClients(), []);
  const params = useParams<{ id: string }>();
  const id = Number.parseInt(params.id, 10);

  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set());
  const [manualSearchModal, setManualSearchModal] = useState<{
    isOpen: boolean;
    episodeId: number;
  }>({ isOpen: false, episodeId: 0 });

  const seriesQuery = useApiQuery({
    queryKey: ['series', 'subtitles', 'detail', id],
    queryFn: async () => {
      const series = await api.mediaApi.getSeries(id) as SeriesDetail;
      const variants = await api.subtitleApi.listSeriesVariants(id);
      
      // Transform variants into seasons with episodes
      const seasons: SeasonRow[] = variants.map(variant => ({
        seasonNumber: variant.seasonNumber,
        episodes: variant.episodes,
      }));

      return { series, seasons };
    },
    staleTimeKind: 'detail',
  });

  const toggleSeason = (seasonNumber: number) => {
    setExpandedSeasons(prev => {
      const next = new Set(prev);
      if (next.has(seasonNumber)) {
        next.delete(seasonNumber);
      } else {
        next.add(seasonNumber);
      }
      return next;
    });
  };

  const openManualSearch = (episodeId: number) => {
    setManualSearchModal({ isOpen: true, episodeId });
  };

  const closeManualSearch = () => {
    setManualSearchModal({ isOpen: false, episodeId: 0 });
  };

  const series = seriesQuery.data?.series;
  const seasons = seriesQuery.data?.seasons ?? [];

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Series Subtitles</h1>
        <p className="text-sm text-text-secondary">Manage subtitle tracks for each episode.</p>
      </header>

      <QueryPanel
        isLoading={seriesQuery.isPending}
        isError={seriesQuery.isError}
        isEmpty={seriesQuery.isResolvedEmpty}
        errorMessage={seriesQuery.error?.message}
        onRetry={() => void seriesQuery.refetch()}
        emptyTitle="Series not found"
        emptyBody="The series you're looking for doesn't exist or has been deleted."
      >
        {series && (
          <>
            {/* Series Overview Header */}
            <div className="flex gap-4 rounded-md border border-border-subtle bg-surface-1 p-4">
              <div className="h-32 w-24 flex-shrink-0">
                {series.poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={series.poster}
                    alt={series.title}
                    className="h-full w-full rounded-sm object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-sm bg-surface-2 text-text-muted">
                    No Poster
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center space-y-2">
                <div>
                  <h2 className="text-xl font-semibold">{series.title}</h2>
                  <p className="text-sm text-text-secondary">
                    {series.year} • {seasons.length} {seasons.length === 1 ? 'Season' : 'Seasons'}
                  </p>
                </div>
                {series.overview && (
                  <p className="text-sm text-text-secondary line-clamp-3">{series.overview}</p>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">Monitored:</span>
                  <span className={series.monitored ? 'text-accent-success' : 'text-text-muted'}>
                    {series.monitored ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-border-subtle bg-surface-1 p-4">
              <SyncButton seriesId={id} />
              <ScanButton seriesId={id} />
              <SearchButton seriesId={id} />
            </div>

            {/* Seasons List */}
            <div className="space-y-2">
              {seasons.map(season => (
                <div
                  key={season.seasonNumber}
                  className="rounded-md border border-border-subtle bg-surface-1 overflow-hidden"
                >
                  {/* Season Header */}
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 hover:bg-surface-2"
                    onClick={() => toggleSeason(season.seasonNumber)}
                  >
                    <span className="font-medium">
                      Season {season.seasonNumber}
                      <span className="ml-2 text-sm text-text-muted">
                        ({season.episodes.length} episodes)
                      </span>
                    </span>
                    {expandedSeasons.has(season.seasonNumber) ? (
                      <ChevronDown className="h-4 w-4 text-text-muted" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-text-muted" />
                    )}
                  </button>

                  {/* Episodes (expanded) */}
                  {expandedSeasons.has(season.seasonNumber) && (
                    <div className="border-t border-border-subtle">
                      {season.episodes.map(episode => (
                        <div
                          key={episode.episodeId}
                          className="flex items-center justify-between gap-4 px-4 py-3 even:bg-surface-2/50"
                        >
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="font-medium">
                                S{episode.seasonNumber}E{episode.episodeNumber}
                              </span>
                              <span className="text-sm text-text-muted">
                                {episode.title || `Episode ${episode.episodeNumber}`}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {episode.subtitleTracks.map((track, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-sm bg-accent-success/20 px-2 py-0.5 text-xs text-text-primary"
                                >
                                  {track.languageCode}
                                  {track.isForced && ' (F)'}
                                  {track.isHi && ' (HI)'}
                                </span>
                              ))}
                              {episode.missingSubtitles.map((lang, idx) => (
                                <span
                                  key={`missing-${idx}`}
                                  className="rounded-sm bg-accent-danger/20 px-2 py-0.5 text-xs text-text-primary"
                                >
                                  {lang} (Missing)
                                </span>
                              ))}
                              {episode.subtitleTracks.length === 0 &&
                                episode.missingSubtitles.length === 0 && (
                                  <span className="text-xs text-text-muted">No subtitles</span>
                                )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="secondary"
                              className="px-2 py-1 text-xs"
                              onClick={() => openManualSearch(episode.episodeId)}
                            >
                              <Search className="mr-1 h-3 w-3" />
                              Search
                            </Button>
                            <Button
                              variant="secondary"
                              className="px-2 py-1 text-xs"
                              disabled
                              title="Subtitle upload requires backend support"
                            >
                              <Upload className="mr-1 h-3 w-3" />
                              Upload
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {seasons.length === 0 && (
                <div className="rounded-md border border-border-subtle bg-surface-1 p-8 text-center">
                  <p className="text-text-muted">No seasons found for this series.</p>
                </div>
              )}
            </div>
          </>
        )}
      </QueryPanel>

      {/* Manual Search Modal */}
      <ManualSearchModal
        isOpen={manualSearchModal.isOpen}
        episodeId={manualSearchModal.episodeId}
        onClose={closeManualSearch}
      />
    </section>
  );
}
