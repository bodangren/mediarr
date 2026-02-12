'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useOptimisticMutation } from '@/lib/query/useOptimisticMutation';

type MovieRow = {
  id: number;
  title: string;
  tmdbId?: number;
  year?: number;
  status?: string;
  monitored?: boolean;
  fileVariants?: Array<{ path?: string }>;
};

function fileStatus(row: MovieRow): string {
  if (!row.fileVariants || row.fileVariants.length === 0) {
    return 'wanted';
  }

  return row.fileVariants.some(variant => Boolean(variant.path)) ? 'completed' : 'downloading';
}

export default function MoviesLibraryPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'status'>('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

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
    { items: MovieRow[]; meta: { page: number; pageSize: number; totalCount: number; totalPages: number } },
    { id: number; monitored: boolean },
    MovieRow
  >({
    queryKey: ['movies'],
    mutationFn: ({ id, monitored }) => api.mediaApi.setMovieMonitored(id, monitored) as Promise<MovieRow>,
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

  const columns: DataTableColumn<MovieRow>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: row => (
        <Link href={`/library/movies/${row.id}`} className="font-medium hover:underline">
          {row.title}
        </Link>
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
  ];

  const data = moviesQuery.data;

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Movie Library</h1>
        <p className="text-sm text-text-secondary">Browse monitored movies with paging, sorting, and row-level actions.</p>
      </header>

      <label className="block space-y-1 text-sm">
        <span>Filter by title</span>
        <input
          value={search}
          onChange={event => {
            setPage(1);
            setSearch(event.currentTarget.value);
          }}
          className="w-full rounded-sm border border-border-subtle bg-surface-1 px-3 py-2"
          placeholder="Search movies..."
        />
      </label>

      <QueryPanel
        isLoading={moviesQuery.isPending}
        isError={moviesQuery.isError}
        isEmpty={moviesQuery.isResolvedEmpty}
        errorMessage={moviesQuery.error?.message}
        onRetry={() => void moviesQuery.refetch()}
        emptyTitle="No movies found"
        emptyBody="Adjust filters or add a new movie from Add Media."
      >
        <DataTable
          data={data?.items ?? []}
          columns={columns}
          getRowId={row => row.id}
          sort={{ key: sortBy, direction: sortDir }}
          onSort={key => {
            const allowed = ['title', 'year', 'status'];
            if (!allowed.includes(key)) {
              return;
            }

            if (sortBy === key) {
              setSortDir(current => (current === 'asc' ? 'desc' : 'asc'));
            } else {
              setSortBy(key as 'title' | 'year' | 'status');
              setSortDir('asc');
            }
          }}
          pagination={{
            page,
            totalPages: data?.meta.totalPages ?? 1,
            onPrev: () => setPage(current => Math.max(1, current - 1)),
            onNext: () => setPage(current => Math.min(data?.meta.totalPages ?? 1, current + 1)),
          }}
          rowActions={row => (
            <div className="flex justify-end gap-2">
              <Link href={`/library/movies/${row.id}`} className="rounded-sm border border-border-subtle px-2 py-1 text-xs">
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
          )}
        />
      </QueryPanel>
    </section>
  );
}
