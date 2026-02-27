'use client';

import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/components/primitives/Icon';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients, type MonitoringType } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';

type SeriesWithSeasons = {
  id: number;
  title: string;
  year?: number;
  status?: string;
  monitored?: boolean;
  seasons?: Array<{
    id?: number;
    seasonNumber: number;
    monitored: boolean;
    episodes?: Array<{
      id: number;
      episodeNumber: number;
      monitored: boolean;
      airDateUtc?: string | null;
      fileVariants?: Array<{ id: number }>;
    }>;
  }>;
};

interface SeasonRowProps {
  seriesId: number;
  season: SeriesWithSeasons['seasons'] extends (infer T)[] | undefined ? T : never;
  onToggleSeason: (seriesId: number, seasonNumber: number, monitored: boolean) => void;
  onToggleEpisode: (episodeId: number, monitored: boolean) => void;
}

function SeasonRow({ seriesId, season, onToggleSeason, onToggleEpisode }: SeasonRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const episodeCount = season.episodes?.length ?? 0;
  const monitoredCount = season.episodes?.filter(ep => ep.monitored).length ?? 0;
  const hasFiles = season.episodes?.some(ep => ep.fileVariants && ep.fileVariants.length > 0) ?? false;

  return (
    <div className="border-b border-border-subtle last:border-b-0">
      <div className="flex items-center gap-3 py-2 px-3 hover:bg-surface-2">
        {/* Expand Button */}
        <button
          type="button"
          className="flex-shrink-0 rounded p-1 hover:bg-surface-3 disabled:opacity-50"
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={episodeCount === 0}
          aria-expanded={isExpanded}
        >
          <Icon
            name={isExpanded ? 'chevron-down' : 'chevron-right'}
            className="h-4 w-4"
          />
        </button>

        {/* Season Checkbox */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={season.monitored}
            onChange={e => onToggleSeason(seriesId, season.seasonNumber, e.currentTarget.checked)}
            className="rounded border-border-subtle"
          />
          <span className="text-sm font-medium">
            Season {season.seasonNumber}
          </span>
        </label>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <span>{monitoredCount}/{episodeCount} monitored</span>
          {hasFiles && (
            <span className="flex items-center gap-1 text-status-completed">
              <Icon name="check" className="h-3 w-3" />
              Files
            </span>
          )}
        </div>
      </div>

      {/* Episode List (when expanded) */}
      {isExpanded && season.episodes && season.episodes.length > 0 && (
        <div className="ml-10 border-l border-border-subtle bg-surface-2/50 py-1">
          {season.episodes.map(episode => (
            <div
              key={episode.id}
              className="flex items-center gap-3 py-1.5 px-3 hover:bg-surface-3"
            >
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={episode.monitored}
                  onChange={e => onToggleEpisode(episode.id, e.currentTarget.checked)}
                  className="rounded border-border-subtle"
                />
                <span className="text-xs">
                  E{episode.episodeNumber.toString().padStart(2, '0')}
                </span>
              </label>
              {episode.fileVariants && episode.fileVariants.length > 0 && (
                <Icon name="download" className="h-3 w-3 text-status-completed" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SeriesPassRowProps {
  series: SeriesWithSeasons;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onApplyMonitoring: (id: number, type: MonitoringType) => void;
  onToggleSeason: (seriesId: number, seasonNumber: number, monitored: boolean) => void;
  onToggleEpisode: (episodeId: number, monitored: boolean) => void;
  isApplying: boolean;
}

function SeriesPassRow({
  series,
  isSelected,
  onToggleSelect,
  onApplyMonitoring,
  onToggleSeason,
  onToggleEpisode,
  isApplying,
}: SeriesPassRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<MonitoringType>('all');

  const seasonCount = series.seasons?.length ?? 0;
  const monitoredSeasonCount = series.seasons?.filter(s => s.monitored).length ?? 0;
  const totalEpisodes = series.seasons?.reduce((sum, s) => sum + (s.episodes?.length ?? 0), 0) ?? 0;
  const monitoredEpisodes = series.seasons?.reduce(
    (sum, s) => sum + (s.episodes?.filter(ep => ep.monitored).length ?? 0),
    0
  ) ?? 0;

  return (
    <div className="rounded-md border border-border-subtle bg-surface-1">
      {/* Header Row */}
      <div className="flex items-center gap-3 p-3">
        {/* Select Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(series.id)}
          className="rounded border-border-subtle"
          aria-label={`Select ${series.title}`}
        />

        {/* Expand Button */}
        <button
          type="button"
          className="flex-shrink-0 rounded p-1 hover:bg-surface-2"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          <Icon
            name={isExpanded ? 'chevron-down' : 'chevron-right'}
            className="h-4 w-4"
          />
        </button>

        {/* Series Title */}
        <Link
          href={`/library/series/${series.id}`}
          className="min-w-0 flex-1 font-medium hover:text-accent-primary"
        >
          {series.title}
          {series.year && <span className="ml-2 text-text-secondary">({series.year})</span>}
        </Link>

        {/* Status */}
        {series.status && <StatusBadge status={series.status} />}

        {/* Stats */}
        <div className="text-xs text-text-secondary">
          {monitoredEpisodes}/{totalEpisodes} eps
        </div>

        {/* Strategy Dropdown */}
        <select
          value={selectedStrategy}
          onChange={e => setSelectedStrategy(e.currentTarget.value as MonitoringType)}
          className="rounded border border-border-subtle bg-surface-1 px-2 py-1 text-xs"
          disabled={isApplying}
        >
          <option value="all">All Episodes</option>
          <option value="none">None</option>
          <option value="firstSeason">First Season</option>
          <option value="lastSeason">Last Season</option>
          <option value="latestSeason">Latest Season</option>
          <option value="pilotOnly">Pilot Only</option>
          <option value="existing">Existing Episodes</option>
        </select>

        {/* Apply Button */}
        <button
          type="button"
          className="rounded border border-accent-primary bg-accent-primary/10 px-3 py-1 text-xs text-accent-primary hover:bg-accent-primary/20 disabled:opacity-50"
          onClick={() => onApplyMonitoring(series.id, selectedStrategy)}
          disabled={isApplying}
        >
          Apply
        </button>
      </div>

      {/* Expanded Season List */}
      {isExpanded && series.seasons && series.seasons.length > 0 && (
        <div className="border-t border-border-subtle">
          {series.seasons
            .sort((a, b) => a.seasonNumber - b.seasonNumber)
            .map(season => (
              <SeasonRow
                key={season.seasonNumber}
                seriesId={series.id}
                season={season}
                onToggleSeason={onToggleSeason}
                onToggleEpisode={onToggleEpisode}
              />
            ))}
        </div>
      )}
    </div>
  );
}

const MONITORING_STRATEGIES: Array<{ value: MonitoringType; label: string }> = [
  { value: 'all', label: 'Monitor All Episodes' },
  { value: 'none', label: 'Unmonitor All' },
  { value: 'firstSeason', label: 'Monitor First Season' },
  { value: 'lastSeason', label: 'Monitor Last Season' },
  { value: 'latestSeason', label: 'Monitor Latest Season' },
  { value: 'pilotOnly', label: 'Monitor Pilot Only' },
  { value: 'existing', label: 'Monitor Existing Episodes' },
];

export default function SeasonPassPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [selectedSeries, setSelectedSeries] = useState<Set<number>>(new Set());
  const [bulkStrategy, setBulkStrategy] = useState<MonitoringType>('all');

  // Fetch all series with seasons and episodes
  const seriesQuery = useApiQuery({
    queryKey: queryKeys.seriesList({ pageSize: 1000 }),
    queryFn: () => api.mediaApi.listSeries({ pageSize: 1000 }),
    staleTimeKind: 'list',
    isEmpty: data => data.items.length === 0,
  });

  // Apply monitoring mutation for single series
  const applyMonitoringMutation = useMutation({
    mutationFn: ({ seriesId, monitoringType }: { seriesId: number; monitoringType: MonitoringType }) =>
      api.mediaApi.applySeriesMonitoring(seriesId, monitoringType),
    onSuccess: (result) => {
      pushToast({
        title: 'Monitoring Updated',
        body: `Updated ${result.updatedEpisodes} of ${result.totalEpisodes} episodes`,
        variant: 'success',
      });
      void queryClient.invalidateQueries({ queryKey: ['series'] });
    },
    onError: (error: Error) => {
      pushToast({
        title: 'Failed to Update Monitoring',
        body: error.message,
        variant: 'error',
      });
    },
  });

  // Bulk monitoring mutation
  const bulkMonitoringMutation = useMutation({
    mutationFn: ({ seriesIds, monitoringType }: { seriesIds: number[]; monitoringType: MonitoringType }) =>
      api.mediaApi.applyBulkSeriesMonitoring(seriesIds, monitoringType),
    onSuccess: (result) => {
      const totalUpdated = result.results.reduce((sum, r) => sum + r.updatedEpisodes, 0);
      pushToast({
        title: 'Bulk Monitoring Updated',
        body: `Updated ${totalUpdated} episodes across ${result.results.length} series`,
        variant: 'success',
      });
      setSelectedSeries(new Set());
      void queryClient.invalidateQueries({ queryKey: ['series'] });
    },
    onError: (error: Error) => {
      pushToast({
        title: 'Failed to Update Bulk Monitoring',
        body: error.message,
        variant: 'error',
      });
    },
  });

  // Season monitoring mutation
  const seasonMonitoringMutation = useMutation({
    mutationFn: ({
      seriesId,
      seasonNumber,
      monitored,
    }: {
      seriesId: number;
      seasonNumber: number;
      monitored: boolean;
    }) => api.mediaApi.setSeasonMonitoring(seriesId, seasonNumber, monitored),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['series'] });
    },
    onError: (error: Error) => {
      pushToast({
        title: 'Failed to Update Season',
        body: error.message,
        variant: 'error',
      });
    },
  });

  // Episode monitoring mutation
  const episodeMonitoringMutation = useMutation({
    mutationFn: ({ episodeId, monitored }: { episodeId: number; monitored: boolean }) =>
      api.mediaApi.setEpisodeMonitored(episodeId, monitored),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['series'] });
    },
    onError: (error: Error) => {
      pushToast({
        title: 'Failed to Update Episode',
        body: error.message,
        variant: 'error',
      });
    },
  });

  const handleToggleSelect = useCallback((id: number) => {
    setSelectedSeries(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIds = seriesQuery.data?.items.map(s => s.id) ?? [];
    setSelectedSeries(new Set(allIds));
  }, [seriesQuery.data]);

  const handleSelectNone = useCallback(() => {
    setSelectedSeries(new Set());
  }, []);

  const handleApplyBulk = useCallback(() => {
    if (selectedSeries.size === 0) return;
    bulkMonitoringMutation.mutate({
      seriesIds: Array.from(selectedSeries),
      monitoringType: bulkStrategy,
    });
  }, [selectedSeries, bulkStrategy, bulkMonitoringMutation]);

  const handleApplyMonitoring = useCallback(
    (seriesId: number, monitoringType: MonitoringType) => {
      applyMonitoringMutation.mutate({ seriesId, monitoringType });
    },
    [applyMonitoringMutation],
  );

  const handleToggleSeason = useCallback(
    (seriesId: number, seasonNumber: number, monitored: boolean) => {
      seasonMonitoringMutation.mutate({ seriesId, seasonNumber, monitored });
    },
    [seasonMonitoringMutation],
  );

  const handleToggleEpisode = useCallback(
    (episodeId: number, monitored: boolean) => {
      episodeMonitoringMutation.mutate({ episodeId, monitored });
    },
    [episodeMonitoringMutation],
  );

  const series = seriesQuery.data?.items ?? [];
  const isLoading = seriesQuery.isPending;
  const isError = seriesQuery.isError;
  const isEmpty = seriesQuery.isResolvedEmpty;

  return (
    <section className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Season Pass</h1>
          <p className="text-sm text-text-secondary">
            Bulk-configure monitoring for series and seasons
          </p>
        </div>
        <Link
          href="/library/series"
          className="rounded border border-border-subtle px-3 py-1.5 text-sm hover:bg-surface-2"
        >
          Back to Series
        </Link>
      </header>

      {/* Bulk Action Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border-subtle bg-surface-1 p-3">
        <span className="text-sm text-text-secondary">
          {selectedSeries.size} selected
        </span>

        <button
          type="button"
          className="rounded border border-border-subtle px-2 py-1 text-xs hover:bg-surface-2"
          onClick={handleSelectAll}
        >
          Select All
        </button>

        <button
          type="button"
          className="rounded border border-border-subtle px-2 py-1 text-xs hover:bg-surface-2"
          onClick={handleSelectNone}
        >
          Select None
        </button>

        <div className="h-4 w-px bg-border-subtle" />

        <select
          value={bulkStrategy}
          onChange={e => setBulkStrategy(e.currentTarget.value as MonitoringType)}
          className="rounded border border-border-subtle bg-surface-1 px-2 py-1 text-sm"
          disabled={selectedSeries.size === 0}
        >
          {MONITORING_STRATEGIES.map(strategy => (
            <option key={strategy.value} value={strategy.value}>
              {strategy.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="rounded bg-accent-primary px-3 py-1.5 text-sm text-white hover:bg-accent-primary/90 disabled:opacity-50"
          onClick={handleApplyBulk}
          disabled={selectedSeries.size === 0 || bulkMonitoringMutation.isPending}
        >
          {bulkMonitoringMutation.isPending ? 'Applying...' : 'Apply to Selected'}
        </button>
      </div>

      {/* Series List */}
      <QueryPanel
        isLoading={isLoading}
        isError={isError}
        isEmpty={isEmpty}
        errorMessage={seriesQuery.error?.message}
        onRetry={() => void seriesQuery.refetch()}
        emptyTitle="No series found"
        emptyBody="Add series to your library to use Season Pass."
      >
        <div className="space-y-2">
          {series.map(item => (
            <SeriesPassRow
              key={item.id}
              series={item as SeriesWithSeasons}
              isSelected={selectedSeries.has(item.id)}
              onToggleSelect={handleToggleSelect}
              onApplyMonitoring={handleApplyMonitoring}
              onToggleSeason={handleToggleSeason}
              onToggleEpisode={handleToggleEpisode}
              isApplying={applyMonitoringMutation.isPending}
            />
          ))}
        </div>
      </QueryPanel>
    </section>
  );
}
