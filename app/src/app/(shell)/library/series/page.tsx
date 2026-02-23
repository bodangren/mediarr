'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FilterBuilder } from '@/components/filters/FilterBuilder';
import { FilterDropdown } from '@/components/filters/FilterDropdown';
import { Icon } from '@/components/primitives/Icon';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { SortMenu } from '@/components/primitives/SortMenu';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { SelectProvider, useSelectContext } from '@/components/primitives/SelectProvider';
import { SelectCheckboxCell } from '@/components/primitives/SelectCheckboxCell';
import { SeriesOverviewView } from '@/components/views/SeriesOverviewView';
import { SeriesPosterView } from '@/components/views/SeriesPosterView';
import { ColumnPicker, JumpBar, SeriesBulkEditModal } from '@/components/series';
import type { JumpBarValue } from '@/components/series/JumpBar';
import type { SeriesColumnKey } from '@/components/series/ColumnPicker';
import { useToast } from '@/components/providers/ToastProvider';
import { useSeriesViewMode } from '@/lib/hooks/useSeriesOptions';
import { useLocalStorage } from '@/lib/hooks/useLocalStorage';
import { getApiClients } from '@/lib/api/client';
import type { FilterConditionsGroup } from '@/lib/api/filters';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useOptimisticMutation } from '@/lib/query/useOptimisticMutation';
import { nextSortState } from '@/lib/table/sort';
import type { SeriesViewMode } from '@/types/series';

type SeriesRow = {
  id: number;
  title: string;
  year?: number;
  status?: string;
  monitored?: boolean;
  network?: string;
  genres?: string[];
  tags?: string[];
  rating?: number;
  ratings?: { value?: number };
  statistics?: { sizeOnDisk?: number };
  seasons?: Array<{
    episodes?: Array<{
      path?: string | null;
      airDateUtc?: string | null;
      fileVariants?: Array<{ fileSize?: number | string }>;
    }>;
  }>;
};

const ALL_COLUMNS: Array<{ key: SeriesColumnKey; label: string }> = [
  { key: 'title', label: 'Title' },
  { key: 'network', label: 'Network' },
  { key: 'genres', label: 'Genres' },
  { key: 'rating', label: 'Rating' },
  { key: 'seasons', label: 'Seasons' },
  { key: 'episodes', label: 'Episodes' },
  { key: 'size', label: 'Size' },
  { key: 'nextAiring', label: 'Next Airing' },
  { key: 'status', label: 'Status' },
];

const DEFAULT_COLUMNS: SeriesColumnKey[] = ['title', 'network', 'status', 'seasons', 'episodes', 'nextAiring'];

function getEpisodeCount(row: SeriesRow): number {
  return row.seasons?.reduce((total, season) => total + (season.episodes?.length ?? 0), 0) ?? 0;
}

function getGenresLabel(row: SeriesRow): string {
  if (!Array.isArray(row.genres) || row.genres.length === 0) {
    return '-';
  }

  return row.genres.map(genre => String(genre)).join(', ');
}

function getNetworkLabel(row: SeriesRow): string {
  return typeof row.network === 'string' && row.network.trim().length > 0 ? row.network : '-';
}

function getRatingLabel(row: SeriesRow): string {
  const direct = typeof row.rating === 'number' ? row.rating : undefined;
  const nested =
    row.ratings && typeof row.ratings === 'object' && typeof row.ratings.value === 'number'
      ? row.ratings.value
      : undefined;

  const value = direct ?? nested;
  return typeof value === 'number' ? value.toFixed(1) : '-';
}

function getSeasonCount(row: SeriesRow): number {
  return Array.isArray(row.seasons) ? row.seasons.length : 0;
}

function getSeriesSize(row: SeriesRow): number {
  const fromStats = Number(row.statistics?.sizeOnDisk ?? 0);
  if (fromStats > 0) {
    return fromStats;
  }

  return (
    row.seasons?.reduce((seriesTotal, season) => {
      const seasonTotal = season.episodes?.reduce((episodeTotal, episode) => {
        const variantTotal = episode.fileVariants?.reduce((variantSum, variant) => {
          const parsed = Number(variant.fileSize ?? 0);
          return variantSum + (Number.isFinite(parsed) ? parsed : 0);
        }, 0) ?? 0;
        return episodeTotal + variantTotal;
      }, 0) ?? 0;
      return seriesTotal + seasonTotal;
    }, 0) ?? 0
  );
}

function formatSize(size: number): string {
  if (size <= 0) {
    return '-';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function getNextAiringDate(row: SeriesRow): Date | null {
  const now = new Date();
  const dates =
    row.seasons
      ?.flatMap(season => season.episodes ?? [])
      .map(episode => episode.airDateUtc)
      .filter((airDate): airDate is string => Boolean(airDate))
      .map(airDate => new Date(airDate))
      .filter(date => date.getTime() > now.getTime())
      .sort((left, right) => left.getTime() - right.getTime()) ?? [];

  return dates[0] ?? null;
}

function fileStatus(row: SeriesRow): string {
  const episodes = row.seasons?.flatMap(season => season.episodes ?? []) ?? [];
  if (episodes.length === 0) {
    return 'missing';
  }

  return episodes.some(episode => Boolean(episode.path)) ? 'completed' : 'wanted';
}

// Select All header component - renders the select all checkbox
function SelectAllHeader({ allIds }: { allIds: (string | number)[] }) {
  const { selectedIds, isSelected, toggleRow, clearSelection } = useSelectContext();
  const allSelected = allIds.length > 0 && allIds.every(id => isSelected(id));
  const someSelected = allIds.some(id => isSelected(id)) && !allSelected;

  const handleToggle = () => {
    if (allSelected) {
      clearSelection();
    } else {
      // Select all visible items that aren't already selected
      allIds.forEach(id => {
        if (!isSelected(id)) {
          toggleRow(id);
        }
      });
    }
  };

  return (
    <input
      type="checkbox"
      checked={allSelected}
      ref={input => {
        if (input) {
          input.indeterminate = someSelected;
        }
      }}
      onChange={handleToggle}
      aria-label="Select all series on this page"
      title="Select all series on this page"
    />
  );
}

// Bulk Edit Toolbar component
function BulkEditToolbar({ onOpenBulkEdit }: { onOpenBulkEdit: (ids: number[]) => void }) {
  const { selectedIds, clearSelection } = useSelectContext();

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 rounded-sm border border-accent-primary/50 bg-accent-primary/10 px-4 py-2 mb-3">
      <span className="text-sm font-medium">
        {selectedIds.length} series{selectedIds.length === 1 ? '' : ''} selected
      </span>
      <button
        type="button"
        className="rounded-sm border border-border-subtle bg-surface-1 px-3 py-1 text-sm hover:bg-surface-2"
        onClick={() => onOpenBulkEdit(selectedIds as number[])}
      >
        Bulk Edit
      </button>
      <button
        type="button"
        className="rounded-sm border border-border-subtle bg-surface-1 px-3 py-1 text-sm hover:bg-surface-2"
        onClick={clearSelection}
      >
        Clear
      </button>
    </div>
  );
}

export default function SeriesLibraryPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [viewMode, setViewMode] = useSeriesViewMode();
  const [visibleColumns, setVisibleColumns] = useLocalStorage<SeriesColumnKey[]>(
    'mediarr:series:list-columns',
    DEFAULT_COLUMNS,
  );

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'status'>('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [jump, setJump] = useState<JumpBarValue>('All');
  const [selectedFilterId, setSelectedFilterId] = useState<number | 'custom' | null>(null);
  const [customFilter, setCustomFilter] = useState<FilterConditionsGroup | null>(null);
  const [filterBuilderOpen, setFilterBuilderOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [selectedSeriesIds, setSelectedSeriesIds] = useState<number[]>([]);

  const filtersQuery = useApiQuery({
    queryKey: queryKeys.filtersList('series'),
    queryFn: () => api.filtersApi.list('series'),
    staleTimeKind: 'list',
    isEmpty: data => data.length === 0,
  });

  const savedFilters = filtersQuery.data ?? [];
  const activeSavedFilter =
    typeof selectedFilterId === 'number' ? savedFilters.find(filter => filter.id === selectedFilterId) ?? null : null;

  const queryInput = {
    page,
    pageSize: 25,
    search: search.trim() || undefined,
    sortBy,
    sortDir,
    filterId: typeof selectedFilterId === 'number' ? selectedFilterId : undefined,
    customFilter: selectedFilterId === 'custom' && customFilter ? JSON.stringify(customFilter) : undefined,
    jump: jump === 'All' ? undefined : jump,
  };

  const seriesQuery = useApiQuery({
    queryKey: queryKeys.seriesList(queryInput),
    queryFn: () => api.mediaApi.listSeries(queryInput),
    staleTimeKind: 'list',
    isEmpty: data => data.items.length === 0,
  });

  const monitoredMutation = useOptimisticMutation<
    { items: SeriesRow[]; meta: { page: number; pageSize: number; totalCount: number; totalPages: number } },
    { id: number; monitored: boolean },
    SeriesRow
  >({
    queryKey: ['series'],
    mutationFn: ({ id, monitored }) => api.mediaApi.setSeriesMonitored(id, monitored) as Promise<SeriesRow>,
    updater: (current, variables) => ({
      ...current,
      items: current.items.map(item =>
        item.id === variables.id
          ? {
              ...item,
              monitored: variables.monitored,
            }
          : item,
      ),
    }),
    errorMessage: 'Could not update monitored state.',
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.mediaApi.deleteSeries(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['series'] });
      pushToast({
        title: 'Series deleted',
        variant: 'success',
      });
    },
  });

  const handleViewModeChange = (mode: SeriesViewMode) => {
    setViewMode(mode);
  };

  const data = seriesQuery.data;
  const series = (data?.items ?? []) as SeriesRow[];

  // Get selected series titles for the modal
  const selectedSeriesTitles = useMemo(() => {
    return selectedSeriesIds
      .map(id => series.find(s => s.id === id)?.title)
      .filter(Boolean) as string[];
  }, [selectedSeriesIds, series]);

  const activeFilterForBuilder:
    | {
        id?: number;
        name: string;
        conditions: FilterConditionsGroup;
      }
    | null =
    selectedFilterId === 'custom'
      ? {
          id: undefined,
          name: 'Custom',
          conditions: customFilter ?? { operator: 'and', conditions: [] },
        }
      : activeSavedFilter;

  const applyBuilderFilter = (conditions: FilterConditionsGroup) => {
    setPage(1);
    setSelectedFilterId('custom');
    setCustomFilter(conditions);
  };

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Series Library</h1>
        <p className="text-sm text-text-secondary">Browse monitored series with paging, sorting, and row-level actions.</p>
      </header>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="block space-y-1 text-sm">
          <span className="sr-only">Filter by title</span>
          <input
            value={search}
            onChange={event => {
              setPage(1);
              setSearch(event.currentTarget.value);
            }}
            className="w-64 rounded-sm border border-border-subtle bg-surface-1 px-3 py-2"
            placeholder="Search series..."
          />
        </label>

        <SortMenu
          label="Sort"
          value={sortBy}
          direction={sortDir}
          options={[
            { key: 'title', label: 'Title' },
            { key: 'year', label: 'Year' },
            { key: 'status', label: 'Status' },
          ]}
          onChange={key => {
            if (key === 'title' || key === 'year' || key === 'status') {
              setSortBy(key);
              setSortDir('asc');
            }
          }}
          onDirectionChange={setSortDir}
        />

        <FilterDropdown
          filters={savedFilters}
          selectedFilterId={selectedFilterId}
          onSelectFilter={value => {
            setPage(1);
            setSelectedFilterId(value);
            if (value !== 'custom') {
              setCustomFilter(null);
            }
          }}
          onOpenBuilder={() => setFilterBuilderOpen(true)}
        />

        <ColumnPicker
          options={ALL_COLUMNS}
          visibleColumns={visibleColumns}
          onChange={columns => setVisibleColumns(columns)}
        />

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 rounded-sm border border-border-subtle bg-surface-1 p-1">
          <button
            type="button"
            className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-surface-3 text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            onClick={() => handleViewModeChange('table')}
            aria-label="Table view"
            aria-pressed={viewMode === 'table'}
          >
            Table
          </button>
          <button
            type="button"
            className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'posters'
                ? 'bg-surface-3 text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            onClick={() => handleViewModeChange('posters')}
            aria-label="Poster view"
            aria-pressed={viewMode === 'posters'}
          >
            Posters
          </button>
          <button
            type="button"
            className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'overview'
                ? 'bg-surface-3 text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            onClick={() => handleViewModeChange('overview')}
            aria-label="Overview view"
            aria-pressed={viewMode === 'overview'}
          >
            Overview
          </button>
        </div>

        {/* Season Pass Link */}
        <Link
          href="/library/series/seasonpass"
          className="flex items-center gap-1.5 rounded-sm border border-border-subtle bg-surface-1 px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
        >
          <Icon name="check" className="h-4 w-4" />
          Season Pass
        </Link>
      </div>

      <QueryPanel
        isLoading={seriesQuery.isPending}
        isError={seriesQuery.isError}
        isEmpty={seriesQuery.isResolvedEmpty}
        errorMessage={seriesQuery.error?.message}
        onRetry={() => void seriesQuery.refetch()}
        emptyTitle="No series found"
        emptyBody="Adjust filters or add a new series from Add Media."
      >
        {viewMode === 'table' ? (
          <SelectProvider rowIds={series.map(s => s.id)}>
            <BulkEditToolbar
              onOpenBulkEdit={(ids) => {
                setSelectedSeriesIds(ids);
                setIsBulkEditOpen(true);
              }}
            />
            <JumpBar
              value={jump}
              onChange={value => {
                setPage(1);
                setJump(value);
              }}
            />
            {/* Custom table header with select all */}
            <div className="overflow-x-auto rounded-sm border border-border-subtle">
              <table className="w-full">
                <thead className="bg-surface-2 text-text-secondary">
                  <tr>
                    <th className="w-10 px-3 py-2">
                      <SelectAllHeader allIds={series.map(s => s.id)} />
                    </th>
                    {visibleColumns.includes('title') && (
                      <th className="px-3 py-2 font-semibold text-left">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-left"
                          onClick={() => {
                            const next = nextSortState({ key: sortBy, direction: sortDir }, 'title');
                            setSortBy(next.key as 'title' | 'year' | 'status');
                            setSortDir(next.direction);
                          }}
                        >
                          Title
                          {sortBy === 'title' && (
                            <span aria-hidden="true">{sortDir === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </button>
                      </th>
                    )}
                    {visibleColumns.includes('network') && <th className="px-3 py-2 font-semibold text-left">Network</th>}
                    {visibleColumns.includes('genres') && <th className="px-3 py-2 font-semibold text-left">Genres</th>}
                    {visibleColumns.includes('rating') && <th className="px-3 py-2 font-semibold text-left">Rating</th>}
                    {visibleColumns.includes('seasons') && <th className="px-3 py-2 font-semibold text-left">Seasons</th>}
                    {visibleColumns.includes('episodes') && <th className="px-3 py-2 font-semibold text-left">Episodes</th>}
                    {visibleColumns.includes('size') && <th className="px-3 py-2 font-semibold text-left">Size</th>}
                    {visibleColumns.includes('nextAiring') && <th className="px-3 py-2 font-semibold text-left">Next Airing</th>}
                    {visibleColumns.includes('status') && (
                      <th className="px-3 py-2 font-semibold text-left">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-left"
                          onClick={() => {
                            const next = nextSortState({ key: sortBy, direction: sortDir }, 'status');
                            setSortBy(next.key as 'title' | 'year' | 'status');
                            setSortDir(next.direction);
                          }}
                        >
                          Status
                          {sortBy === 'status' && (
                            <span aria-hidden="true">{sortDir === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </button>
                      </th>
                    )}
                    <th className="px-3 py-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-surface-1">
                  {series.map(row => (
                    <tr key={row.id} className="hover:bg-surface-2">
                      <SelectCheckboxCell rowId={row.id} />
                      {visibleColumns.includes('title') && (
                        <td className="px-3 py-2">
                          <Link href={`/library/series/${row.id}`} className="font-medium hover:underline">
                            {row.title}
                          </Link>
                        </td>
                      )}
                      {visibleColumns.includes('network') && <td className="px-3 py-2">{getNetworkLabel(row)}</td>}
                      {visibleColumns.includes('genres') && <td className="px-3 py-2">{getGenresLabel(row)}</td>}
                      {visibleColumns.includes('rating') && <td className="px-3 py-2">{getRatingLabel(row)}</td>}
                      {visibleColumns.includes('seasons') && <td className="px-3 py-2">{getSeasonCount(row)}</td>}
                      {visibleColumns.includes('episodes') && <td className="px-3 py-2">{getEpisodeCount(row)}</td>}
                      {visibleColumns.includes('size') && <td className="px-3 py-2">{formatSize(getSeriesSize(row))}</td>}
                      {visibleColumns.includes('nextAiring') && (
                        <td className="px-3 py-2">
                          {getNextAiringDate(row)?.toLocaleDateString() ?? '-'}
                        </td>
                      )}
                      {visibleColumns.includes('status') && (
                        <td className="px-3 py-2">
                          <StatusBadge status={row.status ?? 'unknown'} />
                        </td>
                      )}
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <label className="inline-flex items-center gap-1 rounded-sm border border-border-subtle px-2 py-1 text-xs">
                            <input
                              type="checkbox"
                              checked={Boolean(row.monitored)}
                              onChange={event => {
                                monitoredMutation.mutate({
                                  id: row.id,
                                  monitored: event.currentTarget.checked,
                                });
                              }}
                            />
                            {row.monitored ? 'Monitored' : 'Unmonitored'}
                          </label>
                          <span className="inline-flex items-center rounded-sm border border-border-subtle px-2 py-1 text-xs">
                            File: {fileStatus(row)}
                          </span>
                          <Link href={`/library/series/${row.id}`} className="rounded-sm border border-border-subtle px-2 py-1 text-xs">
                            Open
                          </Link>
                          <button
                            type="button"
                            className="rounded-sm border border-status-error/60 px-2 py-1 text-xs text-status-error"
                            onClick={() => {
                              const confirmed = window.confirm(`Delete ${row.title}?`);
                              if (!confirmed) {
                                return;
                              }

                              deleteMutation.mutate(row.id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {data && data.meta.totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <button
                  type="button"
                  className="rounded-sm border border-border-subtle px-4 py-2 text-sm transition-colors hover:bg-surface-2 disabled:opacity-50"
                  onClick={() => setPage(current => Math.max(1, current - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-text-secondary">
                  Page {page} of {data.meta.totalPages}
                </span>
                <button
                  type="button"
                  className="rounded-sm border border-border-subtle px-4 py-2 text-sm transition-colors hover:bg-surface-2 disabled:opacity-50"
                  onClick={() => setPage(current => Math.min(data.meta.totalPages, current + 1))}
                  disabled={page === data.meta.totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </SelectProvider>
        ) : viewMode === 'posters' ? (
          <div className="space-y-4">
            <SeriesPosterView
              items={series}
              onToggleMonitored={(id, monitored) => {
                monitoredMutation.mutate({ id, monitored });
              }}
              onDelete={id => {
                const item = series.find(i => i.id === id);
                if (item) {
                  const confirmed = window.confirm(`Delete ${item.title}?`);
                  if (confirmed) {
                    deleteMutation.mutate(id);
                  }
                }
              }}
            />
            {/* Pagination for non-table views */}
            {data && data.meta.totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  className="rounded-sm border border-border-subtle bg-surface-1 px-3 py-1.5 text-xs hover:bg-surface-2 disabled:opacity-50"
                  onClick={() => setPage(current => Math.max(1, current - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span className="flex items-center px-2 text-xs text-text-secondary">
                  Page {page} of {data.meta.totalPages}
                </span>
                <button
                  type="button"
                  className="rounded-sm border border-border-subtle bg-surface-1 px-3 py-1.5 text-xs hover:bg-surface-2 disabled:opacity-50"
                  onClick={() => setPage(current => Math.min(data.meta.totalPages, current + 1))}
                  disabled={page === data.meta.totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <SeriesOverviewView
              items={series}
              onToggleMonitored={(id, monitored) => {
                monitoredMutation.mutate({ id, monitored });
              }}
              onDelete={id => {
                const item = series.find(i => i.id === id);
                if (item) {
                  const confirmed = window.confirm(`Delete ${item.title}?`);
                  if (confirmed) {
                    deleteMutation.mutate(id);
                  }
                }
              }}
            />
            {/* Pagination for non-table views */}
            {data && data.meta.totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  className="rounded-sm border border-border-subtle bg-surface-1 px-3 py-1.5 text-xs hover:bg-surface-2 disabled:opacity-50"
                  onClick={() => setPage(current => Math.max(1, current - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span className="flex items-center px-2 text-xs text-text-secondary">
                  Page {page} of {data.meta.totalPages}
                </span>
                <button
                  type="button"
                  className="rounded-sm border border-border-subtle bg-surface-1 px-3 py-1.5 text-xs hover:bg-surface-2 disabled:opacity-50"
                  onClick={() => setPage(current => Math.min(data.meta.totalPages, current + 1))}
                  disabled={page === data.meta.totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </QueryPanel>

      <FilterBuilder
        isOpen={filterBuilderOpen}
        activeFilter={activeFilterForBuilder}
        onClose={() => setFilterBuilderOpen(false)}
        onApply={conditions => {
          applyBuilderFilter(conditions);
          setFilterBuilderOpen(false);
        }}
        onSave={async ({ id, name, conditions }) => {
          if (id) {
            await api.filtersApi.update(id, { name, conditions });
          } else {
            const created = await api.filtersApi.create({ name, type: 'series', conditions });
            setSelectedFilterId(created.id);
            setCustomFilter(null);
          }

          await queryClient.invalidateQueries({ queryKey: queryKeys.filtersList('series') });
          pushToast({ title: 'Filter saved', variant: 'success' });
          setFilterBuilderOpen(false);
        }}
        onDelete={async id => {
          await api.filtersApi.delete(id);
          await queryClient.invalidateQueries({ queryKey: queryKeys.filtersList('series') });
          setSelectedFilterId(null);
          setCustomFilter(null);
          setFilterBuilderOpen(false);
          pushToast({ title: 'Filter deleted', variant: 'success' });
        }}
      />

      {/* Bulk Edit Modal */}
      <SeriesBulkEditModal
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        selectedSeriesIds={selectedSeriesIds}
        selectedSeriesTitles={selectedSeriesTitles}
      />
    </section>
  );
}
