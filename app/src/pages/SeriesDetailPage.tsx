import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { ManualSearchModal } from '@/components/subtitles/ManualSearchModal';
import { LanguageBadge } from '@/components/subtitles/LanguageBadge';
import { SeriesInteractiveSearchModal, type SearchLevel } from '@/components/series/SeriesInteractiveSearchModal';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import type { QualityProfileItem } from '@/lib/api/qualityProfileApi';
import { formatBytes } from '@/lib/format';
import {
  type SubtitleCoverageStatus,
  type SubtitleCoverageSummary,
  summarizeSubtitleCoverage,
  subtitleStatusLabel,
  subtitleStatusBadgeClass,
} from '@/lib/subtitles/coverage';

type EpisodeItem = {
  id: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  airDateUtc?: string | null;
  monitored: boolean;
  hasFile?: boolean;
  isDownloading?: boolean;
};

type SeasonItem = {
  id: number;
  seasonNumber: number;
  monitored: boolean;
  episodes: EpisodeItem[];
  statistics?: {
    totalEpisodes: number;
    episodesOnDisk: number;
    episodesMissing: number;
    episodesDownloading: number;
  };
};

type SeriesDetail = {
  id: number;
  title: string;
  year?: number;
  status?: string;
  overview?: string;
  network?: string;
  posterUrl?: string;
  tvdbId?: number;
  monitored: boolean;
  qualityProfileId?: number;
  path?: string;
  sizeOnDisk?: number;
  seasons: SeasonItem[];
  statistics?: {
    totalEpisodes: number;
    episodesOnDisk: number;
    episodesMissing: number;
    episodesDownloading: number;
  };
};

export function SeriesDetailPage() {
  const api = useMemo(() => getApiClients(), []);
  const params = useParams();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const seriesId = Number(params.id);
  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [qualityProfiles, setQualityProfiles] = useState<QualityProfileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set());
  const [searchModal, setSearchModal] = useState<{
    level: SearchLevel;
    season?: number;
    episode?: number;
  } | null>(null);
  const [episodeSubtitleSummaries, setEpisodeSubtitleSummaries] = useState<Record<number, SubtitleCoverageSummary>>({});
  const [seasonSubtitleStatuses, setSeasonSubtitleStatuses] = useState<Record<number, SubtitleCoverageStatus>>({});
  const [seriesSubtitleStatus, setSeriesSubtitleStatus] = useState<SubtitleCoverageStatus>('none');
  const [selectedSubtitleEpisodeId, setSelectedSubtitleEpisodeId] = useState<number | null>(null);
  const [editingPath, setEditingPath] = useState(false);
  const [pathInput, setPathInput] = useState('');
  const [searchingSubtitlesSeason, setSearchingSubtitlesSeason] = useState<number | null>(null);

  const loadSeriesSubtitleSummaries = useCallback(async (targetSeriesId: number) => {
    try {
      const seasons = await api.subtitleApi.listSeriesVariants(targetSeriesId);
      const nextEpisodeSummaries: Record<number, SubtitleCoverageSummary> = {};
      const nextSeasonStatuses: Record<number, SubtitleCoverageStatus> = {};
      const aggregateSeasonStatuses: SubtitleCoverageStatus[] = [];

      for (const season of seasons) {
        const episodeStatuses: SubtitleCoverageStatus[] = [];

        for (const episode of season.episodes ?? []) {
          const available = (episode.subtitleTracks ?? [])
            .map(track => String(track.languageCode ?? '').toLowerCase())
            .filter(Boolean);
          const missing = (episode.missingSubtitles ?? [])
            .map(code => String(code ?? '').toLowerCase())
            .filter(Boolean);
          const summary = summarizeSubtitleCoverage(available, missing);
          nextEpisodeSummaries[episode.episodeId] = summary;
          episodeStatuses.push(summary.status);
        }

        let seasonStatus: SubtitleCoverageStatus = 'none';
        if (episodeStatuses.some(status => status === 'partial')
          || (episodeStatuses.includes('complete') && episodeStatuses.includes('missing'))) {
          seasonStatus = 'partial';
        } else if (episodeStatuses.includes('missing')) {
          seasonStatus = 'missing';
        } else if (episodeStatuses.includes('complete')) {
          seasonStatus = 'complete';
        }

        nextSeasonStatuses[season.seasonNumber] = seasonStatus;
        if (seasonStatus !== 'none') {
          aggregateSeasonStatuses.push(seasonStatus);
        }
      }

      let nextSeriesStatus: SubtitleCoverageStatus = 'none';
      if (aggregateSeasonStatuses.some(status => status === 'partial')
        || (aggregateSeasonStatuses.includes('complete') && aggregateSeasonStatuses.includes('missing'))) {
        nextSeriesStatus = 'partial';
      } else if (aggregateSeasonStatuses.includes('missing')) {
        nextSeriesStatus = 'missing';
      } else if (aggregateSeasonStatuses.includes('complete')) {
        nextSeriesStatus = 'complete';
      }

      setEpisodeSubtitleSummaries(nextEpisodeSummaries);
      setSeasonSubtitleStatuses(nextSeasonStatuses);
      setSeriesSubtitleStatus(nextSeriesStatus);
    } catch {
      setEpisodeSubtitleSummaries({});
      setSeasonSubtitleStatuses({});
      setSeriesSubtitleStatus('none');
    }
  }, [api]);

  const load = useCallback(async () => {
    if (!Number.isFinite(seriesId)) {
      setError('Invalid series id');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [item, profiles] = await Promise.all([
        api.seriesApi.getSeriesWithEpisodes(seriesId),
        api.qualityProfileApi.list(),
      ]);
      const raw = item as any;
      setSeries({
        id: item.id,
        title: item.title,
        year: raw.year,
        status: raw.status,
        overview: raw.overview,
        network: raw.network,
        posterUrl: raw.posterUrl,
        tvdbId: raw.tvdbId,
        monitored: raw.monitored ?? false,
        qualityProfileId: raw.qualityProfileId,
        path: raw.path,
        sizeOnDisk: raw.sizeOnDisk,
        statistics: raw.statistics,
        seasons: (item.seasons as any[]).map((s: any) => ({
          id: s.id,
          seasonNumber: s.seasonNumber,
          monitored: s.monitored ?? false,
          statistics: s.statistics,
          episodes: (s.episodes ?? []).map((ep: any) => ({
            id: ep.id,
            seasonNumber: ep.seasonNumber ?? s.seasonNumber,
            episodeNumber: ep.episodeNumber,
            title: ep.title ?? '',
            airDateUtc: ep.airDateUtc ?? null,
            monitored: ep.monitored ?? false,
            hasFile: ep.hasFile ?? false,
            isDownloading: ep.isDownloading ?? false,
          })),
        })),
      });
      setQualityProfiles(profiles);
      await loadSeriesSubtitleSummaries(item.id);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load series details');
    } finally {
      setIsLoading(false);
    }
  }, [api, seriesId, loadSeriesSubtitleSummaries]);

  useEffect(() => { void load(); }, [load]);

  const handleToggleSeriesMonitored = async () => {
    if (!series) return;
    const newMonitored = !series.monitored;
    try {
      await api.mediaApi.setSeriesMonitored(series.id, newMonitored);
      setSeries(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          monitored: newMonitored,
          seasons: prev.seasons.map(s => ({ ...s, monitored: newMonitored })),
        };
      });
    } catch {
      pushToast({ title: 'Error', variant: 'error', message: 'Failed to update series monitoring' });
    }
  };

  const handleToggleSeasonMonitored = async (seasonNumber: number, currentMonitored: boolean) => {
    if (!series) return;
    try {
      await api.mediaApi.setSeasonMonitored(series.id, seasonNumber, !currentMonitored);
      setSeries(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          seasons: prev.seasons.map(s =>
            s.seasonNumber === seasonNumber ? { ...s, monitored: !currentMonitored } : s,
          ),
        };
      });
    } catch {
      pushToast({ title: 'Error', variant: 'error', message: 'Failed to update season monitoring' });
    }
  };

  const handleToggleEpisodeMonitored = async (episodeId: number, seasonNumber: number, currentMonitored: boolean) => {
    if (!series) return;
    try {
      await api.mediaApi.setEpisodeMonitored(episodeId, !currentMonitored);
      setSeries(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          seasons: prev.seasons.map(s =>
            s.seasonNumber === seasonNumber
              ? {
                ...s,
                episodes: s.episodes.map(ep =>
                  ep.id === episodeId ? { ...ep, monitored: !currentMonitored } : ep,
                ),
              }
              : s,
          ),
        };
      });
    } catch {
      pushToast({ title: 'Error', variant: 'error', message: 'Failed to update episode monitoring' });
    }
  };

  const handleQualityProfileChange = async (profileId: number) => {
    if (!series) return;
    try {
      await api.seriesApi.bulkUpdate([series.id], { qualityProfileId: profileId });
      setSeries(prev => prev ? { ...prev, qualityProfileId: profileId } : prev);
    } catch {
      pushToast({ title: 'Error', variant: 'error', message: 'Failed to update quality profile' });
    }
  };

  const handleRemove = async () => {
    if (!series) return;
    if (!window.confirm(`Remove "${series.title}" from library?`)) return;
    const deleteFiles = window.confirm('Also delete files from disk? This cannot be undone.');
    try {
      await api.mediaApi.deleteSeries(series.id, deleteFiles);
      const msg = deleteFiles ? `"${series.title}" removed from library and deleted from disk` : `"${series.title}" removed from library`;
      pushToast({ title: 'Success', variant: 'success', message: msg });
      navigate('/library/tv');
    } catch {
      pushToast({ title: 'Error', variant: 'error', message: 'Failed to remove series' });
    }
  };

  const toggleSeasonExpanded = (seasonNumber: number) => {
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

  // Auto-expand the first season when series data loads
  useEffect(() => {
    if (series && series.seasons.length > 0) {
      setExpandedSeasons(new Set([series.seasons[0].seasonNumber]));
    }
  }, [series?.id]);

  const handleRescan = async (folderPath?: string) => {
    if (!series) return;
    try {
      const result = await api.seriesApi.rescan(series.id, folderPath);
      const parts = [`${result.episodeCount} episodes synced`];
      if (result.filesLinked > 0) parts.push(`${result.filesLinked} files linked`);
      pushToast({ title: 'Rescan complete', variant: 'success', message: parts.join(', ') });
      setEditingPath(false);
      void load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Rescan] error:', err);
      pushToast({ title: 'Rescan failed', variant: 'error', message: msg });
    }
  };

  const handleSavePathAndRescan = () => {
    void handleRescan(pathInput.trim() || undefined);
  };

  const handleAutoSearch = async () => {
    if (!series) return;
    try {
      pushToast({ title: 'Searching', message: `Automated search started for all missing episodes in ${series.title}`, variant: 'info' });
      const data = await api.mediaApi.triggerAutoSearch(series.id, 'series');
      if (!data.success) {
        pushToast({ title: 'Search Failed', variant: 'error', message: data.error || 'Failed to start automated search' });
      } else {
        pushToast({ title: 'Success', variant: 'success', message: `Automated search started in background` });
      }
    } catch (err) {
      pushToast({ title: 'Error', variant: 'error', message: 'Failed to execute automated search' });
    }
  };

  const handleSearchSeasonSubtitles = async (seasonNumber: number) => {
    if (!series) return;
    setSearchingSubtitlesSeason(seasonNumber);
    try {
      pushToast({ title: 'Searching', message: `Searching subtitles for Season ${seasonNumber}...`, variant: 'info' });
      const result = await api.subtitleApi.searchSeasonSubtitles(series.id, seasonNumber);
      pushToast({
        title: 'Subtitles',
        variant: 'success',
        message: `Season ${seasonNumber}: ${result.subtitlesDownloaded} subtitle(s) downloaded`,
      });
      await loadSeriesSubtitleSummaries(series.id);
    } catch {
      pushToast({ title: 'Error', variant: 'error', message: `Subtitle search for Season ${seasonNumber} failed` });
    } finally {
      setSearchingSubtitlesSeason(null);
    }
  };

  const allSeasonsMonitored = Boolean(series && series.seasons.length > 0 && series.seasons.every(s => s.monitored));
  const someSeasonsMonitored = Boolean(series && series.seasons.some(s => s.monitored));
  const seriesMonitoredIndeterminate = !allSeasonsMonitored && someSeasonsMonitored;
  const seriesMonitoredRef = (el: HTMLInputElement | null) => {
    if (el) el.indeterminate = seriesMonitoredIndeterminate;
  };

  return (
    <RouteScaffold title="Series Details" description="Details and interactive search for the selected series.">
      {isLoading ? <p className="text-sm text-text-secondary">Loading series...</p> : null}
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      {series ? (
        <>
          {/* Header: poster + metadata */}
          <section className="flex gap-6 rounded-md border border-border-subtle bg-surface-1 p-4">
            <div className="flex-shrink-0 w-32">
              {series.posterUrl ? (
                <img src={series.posterUrl} alt={series.title} className="w-full rounded-md object-cover" />
              ) : (
                <div className="flex h-48 w-32 items-center justify-center rounded-md bg-surface-2 text-xs text-text-secondary">No Poster</div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="text-xl font-semibold">{series.title}</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                {series.year ? <span>{series.year}</span> : null}
                {series.network ? <span>{series.network}</span> : null}
                {series.status ? <span className="rounded-sm bg-surface-2 px-2 py-0.5 text-xs">{series.status}</span> : null}
                {seriesSubtitleStatus !== 'none' ? (
                  <span className={`rounded-sm px-2 py-0.5 text-xs ${subtitleStatusBadgeClass(seriesSubtitleStatus)}`}>
                    {subtitleStatusLabel(seriesSubtitleStatus)}
                  </span>
                ) : null}
                {series.statistics && series.statistics.totalEpisodes > 0 ? (
                  <span className="flex items-center gap-1.5 ml-2 text-xs">
                    <span className="w-24 h-1.5 bg-surface-2 rounded-full overflow-hidden flex">
                      <span style={{ width: `${(series.statistics.episodesOnDisk / series.statistics.totalEpisodes) * 100}%` }} className="bg-status-completed h-full"></span>
                      <span style={{ width: `${(series.statistics.episodesDownloading / series.statistics.totalEpisodes) * 100}%` }} className="bg-accent-primary h-full"></span>
                      <span style={{ width: `${(series.statistics.episodesMissing / series.statistics.totalEpisodes) * 100}%` }} className="bg-status-error h-full"></span>
                    </span>
                    <span>{series.statistics.episodesOnDisk} / {series.statistics.totalEpisodes}</span>
                  </span>
                ) : null}
              </div>
              {series.overview ? <p className="text-sm text-text-secondary">{series.overview}</p> : null}
              {series.path ? (
                <p className="text-xs text-text-secondary font-mono truncate" title={series.path}>{series.path}</p>
              ) : null}
              {series.sizeOnDisk != null && series.sizeOnDisk > 0 ? (
                <p className="text-xs text-text-muted">{formatBytes(series.sizeOnDisk)} on disk</p>
              ) : null}
            </div>
          </section>

          {/* Controls */}
          <section className="flex flex-wrap items-center gap-4 rounded-md border border-border-subtle bg-surface-1 p-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                ref={seriesMonitoredRef}
                checked={series.monitored}
                aria-label="Series Monitored"
                onChange={() => { void handleToggleSeriesMonitored(); }}
              />
              Monitored
            </label>

            <label className="flex items-center gap-2 text-sm" htmlFor="series-quality-profile">
              Quality Profile
              <select
                id="series-quality-profile"
                aria-label="Quality Profile"
                value={series.qualityProfileId ?? ''}
                onChange={event => { void handleQualityProfileChange(Number(event.target.value)); }}
                className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm"
              >
                {qualityProfiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="rounded-sm border border-accent px-3 py-2 text-sm text-accent"
              onClick={handleAutoSearch}
            >
              Auto-Search
            </button>

            <button
              type="button"
              className="rounded-sm border border-accent px-3 py-2 text-sm text-accent"
              aria-label="Search"
              onClick={() => setSearchModal({ level: 'series' })}
            >
              Search
            </button>

            {editingPath ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm font-mono w-80"
                  value={pathInput}
                  onChange={e => setPathInput(e.target.value)}
                  placeholder="Folder path on disk"
                  aria-label="Folder path"
                  onKeyDown={e => { if (e.key === 'Enter') handleSavePathAndRescan(); if (e.key === 'Escape') setEditingPath(false); }}
                  autoFocus
                />
                <button type="button" className="rounded-sm border border-accent px-3 py-1.5 text-sm text-accent" onClick={handleSavePathAndRescan}>Save & Rescan</button>
                <button type="button" className="rounded-sm border border-border-subtle px-3 py-1.5 text-sm" onClick={() => setEditingPath(false)}>Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-sm border border-border-subtle px-3 py-2 text-sm"
                  aria-label="Rescan Episodes"
                  onClick={() => { void handleRescan(); }}
                >
                  Rescan Episodes
                </button>
                <button
                  type="button"
                  className="rounded-sm border border-border-subtle px-2 py-2 text-sm"
                  aria-label="Change folder path"
                  title="Change folder path"
                  onClick={() => { setPathInput(series.path ?? ''); setEditingPath(true); }}
                >
                  ✎
                </button>
              </div>
            )}

            <button
              type="button"
              className="rounded-sm border border-status-error/60 px-3 py-2 text-sm text-status-error"
              aria-label="Remove from Library"
              onClick={() => { void handleRemove(); }}
            >
              Remove from Library
            </button>
          </section>

          {/* Season list */}
          <section className="rounded-md border border-border-subtle bg-surface-1">
            {series.seasons.map(season => (
              <div key={season.seasonNumber} className="border-b border-border-subtle last:border-b-0">
                {/* Season row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    aria-label={`Expand Season ${season.seasonNumber}`}
                    className="flex items-center gap-2 flex-1 text-left text-sm font-medium"
                    onClick={() => toggleSeasonExpanded(season.seasonNumber)}
                  >
                    <span>{expandedSeasons.has(season.seasonNumber) ? '▼' : '▶'}</span>
                    Season {season.seasonNumber}
                    <span className="text-xs text-text-secondary ml-2 flex items-center gap-3">
                      ({season.episodes.length} episodes)
                      {seasonSubtitleStatuses[season.seasonNumber] && seasonSubtitleStatuses[season.seasonNumber] !== 'none' ? (
                        <span className={`rounded-sm px-1.5 py-0.5 text-[10px] ${subtitleStatusBadgeClass(seasonSubtitleStatuses[season.seasonNumber]!)}`}>
                          {subtitleStatusLabel(seasonSubtitleStatuses[season.seasonNumber]!)}
                        </span>
                      ) : null}
                      {season.statistics && season.statistics.totalEpisodes > 0 ? (
                        <span className="w-16 h-1.5 bg-surface-2 rounded-full overflow-hidden flex">
                          <span style={{ width: `${(season.statistics.episodesOnDisk / season.statistics.totalEpisodes) * 100}%` }} className="bg-status-completed h-full"></span>
                          <span style={{ width: `${(season.statistics.episodesDownloading / season.statistics.totalEpisodes) * 100}%` }} className="bg-accent-primary h-full"></span>
                          <span style={{ width: `${(season.statistics.episodesMissing / season.statistics.totalEpisodes) * 100}%` }} className="bg-status-error h-full"></span>
                        </span>
                      ) : null}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary"
                    aria-label={`Search Season ${season.seasonNumber}`}
                    onClick={() => setSearchModal({ level: 'season', season: season.seasonNumber })}
                  >
                    Search
                  </button>
                  <button
                    type="button"
                    className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary disabled:opacity-50"
                    aria-label={`Search Subtitles Season ${season.seasonNumber}`}
                    disabled={searchingSubtitlesSeason === season.seasonNumber}
                    onClick={() => { void handleSearchSeasonSubtitles(season.seasonNumber); }}
                  >
                    {searchingSubtitlesSeason === season.seasonNumber ? 'Searching...' : 'Sub Search'}
                  </button>
                  <label className="flex items-center gap-1 text-xs text-text-secondary">
                    <input
                      type="checkbox"
                      checked={season.monitored ?? false}
                      aria-label={`Season ${season.seasonNumber} Monitored`}
                      onChange={() => { void handleToggleSeasonMonitored(season.seasonNumber, season.monitored ?? false); }}
                    />
                    Monitored
                  </label>
                </div>

                {/* Episode list (expanded) */}
                {expandedSeasons.has(season.seasonNumber) && (
                  <ul className="bg-surface-0 py-2">
                    {season.episodes.map(ep => {
                      const episodeSummary = episodeSubtitleSummaries[ep.id];

                      return (
                        <li key={ep.id} className="flex items-center gap-3 px-6 py-2 text-sm">
                          <span className="w-16 flex-shrink-0 text-xs text-text-secondary font-mono">
                            S{String(ep.seasonNumber).padStart(2, '0')}E{String(ep.episodeNumber).padStart(2, '0')}
                          </span>
                          <span className="flex-1 truncate flex items-center gap-2">
                            {ep.title}
                            {ep.isDownloading ? (
                              <span className="rounded-sm bg-accent-primary/20 px-1.5 py-0.5 text-[10px] text-accent-primary font-medium tracking-wide">Downloading</span>
                            ) : ep.hasFile ? (
                              <span className="rounded-sm bg-status-completed/20 px-1.5 py-0.5 text-[10px] text-status-completed font-medium tracking-wide">Available</span>
                            ) : ep.monitored ? (
                              <span className="rounded-sm bg-status-error/20 px-1.5 py-0.5 text-[10px] text-status-error font-medium tracking-wide">Missing</span>
                            ) : (
                              <span className="rounded-sm bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-secondary font-medium tracking-wide">Unmonitored</span>
                            )}
                            {episodeSummary ? (
                              <span className={`rounded-sm px-1.5 py-0.5 text-[10px] ${subtitleStatusBadgeClass(episodeSummary.status)}`}>
                                {subtitleStatusLabel(episodeSummary.status)}
                              </span>
                            ) : null}
                            {episodeSummary?.availableLanguages.slice(0, 3).map(code => (
                              <LanguageBadge key={`episode-${ep.id}-available-${code}`} languageCode={code} variant="available" />
                            ))}
                            {episodeSummary?.missingLanguages.slice(0, 3).map(code => (
                              <LanguageBadge key={`episode-${ep.id}-missing-${code}`} languageCode={code} variant="missing" />
                            ))}
                          </span>
                          {ep.airDateUtc ? (
                            <span className="text-xs text-text-secondary">
                              {new Date(ep.airDateUtc).toLocaleDateString()}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            className="rounded-sm border border-border-subtle px-2 py-0.5 text-xs text-text-secondary flex-shrink-0"
                            aria-label={`Search S${String(ep.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}`}
                            onClick={() => setSearchModal({
                              level: 'episode',
                              season: ep.seasonNumber,
                              episode: ep.episodeNumber,
                            })}
                          >
                            Search
                          </button>
                          <button
                            type="button"
                            className="rounded-sm border border-border-subtle px-2 py-0.5 text-xs text-text-secondary flex-shrink-0"
                            aria-label={`Manual subtitles S${String(ep.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}`}
                            onClick={() => setSelectedSubtitleEpisodeId(ep.id)}
                          >
                            Subtitles
                          </button>
                          <label className="flex items-center gap-1 text-xs text-text-secondary flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={ep.monitored}
                              aria-label={`S${String(ep.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')} Monitored`}
                              onChange={() => { void handleToggleEpisodeMonitored(ep.id, ep.seasonNumber, ep.monitored); }}
                            />
                            Monitored
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </section>
        </>
      ) : null}

      {searchModal && series && (
        <SeriesInteractiveSearchModal
          isOpen
          onClose={() => setSearchModal(null)}
          seriesId={series.id}
          seriesTitle={series.title}
          initialLevel={searchModal.level}
          initialSeason={searchModal.season}
          initialEpisode={searchModal.episode}
        />
      )}
      {selectedSubtitleEpisodeId !== null ? (
        <ManualSearchModal
          isOpen
          episodeId={selectedSubtitleEpisodeId}
          onClose={() => {
            setSelectedSubtitleEpisodeId(null);
            if (series) {
              void loadSeriesSubtitleSummaries(series.id);
            }
          }}
        />
      ) : null}
    </RouteScaffold>
  );
}
