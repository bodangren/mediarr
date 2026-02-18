'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/components/primitives/Icon';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { SortMenu } from '@/components/primitives/SortMenu';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { SelectProvider, useSelectContext } from '@/components/primitives/SelectProvider';
import { SelectCheckboxCell } from '@/components/primitives/SelectCheckboxCell';
import { SeriesOverviewView } from '@/components/views/SeriesOverviewView';
import { SeriesPosterView } from '@/components/views/SeriesPosterView';
import { SeriesBulkEditModal } from '@/components/series';
import { useToast } from '@/components/providers/ToastProvider';
import { useSeriesViewMode } from '@/lib/hooks/useSeriesOptions';
import { getApiClients } from '@/lib/api/client';
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
  seasons?: Array<{ episodes?: Array<{ path?: string | null }> }>;
};

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

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'status'>('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [selectedSeriesIds, setSelectedSeriesIds] = useState<number[]>([]);

  const queryInput = {
    page,
    pageSize: 25,
    search: search.trim() || undefined,
    sortBy,
    sortDir,
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
  const series = data?.items ?? [];

  // Get selected series titles for the modal
  const selectedSeriesTitles = useMemo(() => {
    return selectedSeriesIds
      .map(id => series.find(s => s.id === id)?.title)
      .filter(Boolean) as string[];
  }, [selectedSeriesIds, series]);

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
            {/* Custom table header with select all */}
            <div className="overflow-x-auto rounded-sm border border-border-subtle">
              <table className="w-full">
                <thead className="bg-surface-2 text-text-secondary">
                  <tr>
                    <th className="w-10 px-3 py-2">
                      <SelectAllHeader allIds={series.map(s => s.id)} />
                    </th>
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
                    <th className="px-3 py-2 font-semibold text-left">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-left"
                        onClick={() => {
                          const next = nextSortState({ key: sortBy, direction: sortDir }, 'year');
                          setSortBy(next.key as 'title' | 'year' | 'status');
                          setSortDir(next.direction);
                        }}
                      >
                        Year
                        {sortBy === 'year' && (
                          <span aria-hidden="true">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
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
                    <th className="px-3 py-2 font-semibold text-left">File</th>
                    <th className="px-3 py-2 font-semibold text-left">Monitored</th>
                    <th className="px-3 py-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-surface-1">
                  {series.map(row => (
                    <tr key={row.id} className="hover:bg-surface-2">
                      <td className="w-10 px-3 py-2">
                        <SelectCheckboxCell rowId={row.id} />
                      </td>
                      <td className="px-3 py-2">
                        <Link href={`/library/series/${row.id}`} className="font-medium hover:underline">
                          {row.title}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{row.year ?? '-'}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={row.status ?? 'unknown'} />
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={fileStatus(row)} />
                      </td>
                      <td className="px-3 py-2">
                        <label className="inline-flex items-center gap-2 text-xs">
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
                          {row.monitored ? 'On' : 'Off'}
                        </label>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
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
