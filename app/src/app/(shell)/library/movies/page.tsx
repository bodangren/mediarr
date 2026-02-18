'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DataTableColumn } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { SortMenu } from '@/components/primitives/SortMenu';
import { ViewMenu, type ViewMode } from '@/components/primitives/ViewMenu';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { SelectProvider, useSelectContext } from '@/components/primitives/SelectProvider';
import { SelectCheckboxCell } from '@/components/primitives/SelectCheckboxCell';
import { MoviePosterView, MovieOverviewView } from '@/components/views';
import { MovieBulkEditModal } from '@/components/movie';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useOptimisticMutation } from '@/lib/query/useOptimisticMutation';
import { nextSortState } from '@/lib/table/sort';
import type { MovieListItem } from '@/types/movie';
import { getFileStatus } from '@/types/movie';

function fileStatus(item: MovieListItem): string {
  return getFileStatus(item);
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
      aria-label="Select all movies on this page"
      title="Select all movies on this page"
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
        {selectedIds.length} movie{selectedIds.length === 1 ? '' : 's'} selected
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

export default function MoviesLibraryPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'status'>('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [selectedMovieIds, setSelectedMovieIds] = useState<number[]>([]);

  const queryInput = {
    page,
    pageSize: 25,
    search: search.trim() || undefined,
    sortBy,
    sortDir,
  };

  const moviesQuery = useApiQuery({
    queryKey: queryKeys.moviesList(queryInput),
    queryFn: () => api.mediaApi.listMovies(queryInput),
    staleTimeKind: 'list',
    isEmpty: data => data.items.length === 0,
  });

  const monitoredMutation = useOptimisticMutation<
    { items: MovieListItem[]; meta: { page: number; pageSize: number; totalCount: number; totalPages: number } },
    { id: number; monitored: boolean },
    MovieListItem
  >({
    queryKey: ['movies'],
    mutationFn: ({ id, monitored }) => api.mediaApi.setMovieMonitored(id, monitored) as Promise<MovieListItem>,
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
    mutationFn: (id: number) => api.mediaApi.deleteMovie(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['movies'] });
      pushToast({
        title: 'Movie deleted',
        variant: 'success',
      });
    },
  });

  const searchMutation = useMutation({
    mutationFn: async (movieId: number) => {
      if (!moviesQuery.data) {
        return 0;
      }

      const movie = moviesQuery.data.items.find(m => m.id === movieId);
      if (!movie) {
        return 0;
      }

      const candidates = await api.releaseApi.searchCandidates({
        type: 'movie',
        title: movie.title,
        year: movie.year,
      });

      return candidates.meta.totalCount;
    },
    onSuccess: (count, movieId) => {
      const movie = moviesQuery.data?.items.find(m => m.id === movieId);
      pushToast({
        title: 'Search complete',
        message: `${count} candidate releases found for ${movie?.title || 'movie'}.`,
        variant: 'success',
      });
    },
  });

  const columns: DataTableColumn<MovieListItem>[] = useMemo(() => [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: row => (
        <a href={`/library/movies/${row.id}`} className="font-medium hover:underline">
          {row.title}
        </a>
      ),
    },
    {
      key: 'year',
      header: 'Year',
      sortable: true,
      render: row => row.year ?? '-',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: row => <StatusBadge status={row.status ?? 'unknown'} />,
    },
    {
      key: 'fileState',
      header: 'File',
      render: row => <StatusBadge status={fileStatus(row)} />,
    },
    {
      key: 'monitored',
      header: 'Monitored',
      render: row => (
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
      ),
    },
  ], [monitoredMutation]);

  const data = moviesQuery.data;
  const movies = data?.items ?? [];

  // Get selected movie titles for the modal
  const selectedMovieTitles = useMemo(() => {
    return selectedMovieIds
      .map(id => movies.find(m => m.id === id)?.title)
      .filter(Boolean) as string[];
  }, [selectedMovieIds, movies]);

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Movie Library</h1>
        <p className="text-sm text-text-secondary">Browse monitored movies with paging, sorting, and multiple view modes.</p>
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
            placeholder="Search movies..."
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

        <ViewMenu value={viewMode} onChange={setViewMode} />
      </div>

      <QueryPanel
        isLoading={moviesQuery.isPending}
        isError={moviesQuery.isError}
        isEmpty={moviesQuery.isResolvedEmpty}
        errorMessage={moviesQuery.error?.message}
        onRetry={() => void moviesQuery.refetch()}
        emptyTitle="No movies found"
        emptyBody="Adjust filters or add a new movie from Add Media."
      >
        {viewMode === 'table' && (
          <SelectProvider rowIds={movies.map(m => m.id)}>
            <BulkEditToolbar
              onOpenBulkEdit={(ids) => {
                setSelectedMovieIds(ids);
                setIsBulkEditOpen(true);
              }}
            />
            {/* Custom table header with select all */}
            <div className="overflow-x-auto rounded-sm border border-border-subtle">
              <table className="w-full">
                <thead className="bg-surface-2 text-text-secondary">
                  <tr>
                    <th className="w-10 px-3 py-2">
                      <SelectAllHeader allIds={movies.map(m => m.id)} />
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
                  {movies.map(row => (
                    <tr key={row.id} className="hover:bg-surface-2">
                      <td className="w-10 px-3 py-2">
                        <SelectCheckboxCell rowId={row.id} />
                      </td>
                      <td className="px-3 py-2">
                        <a href={`/library/movies/${row.id}`} className="font-medium hover:underline">
                          {row.title}
                        </a>
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
                          <a href={`/library/movies/${row.id}`} className="rounded-sm border border-border-subtle px-2 py-1 text-xs">
                            Open
                          </a>
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
        )}

        {viewMode === 'poster' && (
          <>
            <MoviePosterView
              items={movies}
              onToggleMonitored={(id, monitored) => {
                monitoredMutation.mutate({ id, monitored });
              }}
              onDelete={id => {
                const movie = movies.find(m => m.id === id);
                const confirmed = window.confirm(`Delete ${movie?.title || 'this movie'}?`);
                if (confirmed) {
                  deleteMutation.mutate(id);
                }
              }}
              onSearch={id => {
                searchMutation.mutate(id);
              }}
              isLoading={moviesQuery.isPending}
            />
            {/* Pagination for poster view */}
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
          </>
        )}

        {viewMode === 'overview' && (
          <>
            <MovieOverviewView
              items={movies}
              onToggleMonitored={(id, monitored) => {
                monitoredMutation.mutate({ id, monitored });
              }}
              onDelete={id => {
                const movie = movies.find(m => m.id === id);
                const confirmed = window.confirm(`Delete ${movie?.title || 'this movie'}?`);
                if (confirmed) {
                  deleteMutation.mutate(id);
                }
              }}
              onSearch={id => {
                searchMutation.mutate(id);
              }}
              isLoading={moviesQuery.isPending}
            />
            {/* Pagination for overview view */}
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
          </>
        )}
      </QueryPanel>

      {/* Bulk Edit Modal */}
      <MovieBulkEditModal
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        selectedMovieIds={selectedMovieIds}
        selectedMovieTitles={selectedMovieTitles}
      />
    </section>
  );
}
