'use client';

import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { Button } from '@/components/primitives/Button';
import { ConfirmModal } from '@/components/primitives/Modal';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { type MissingMovie } from '@/lib/api/wantedApi';

export interface MovieMissingTabProps {
  onSearchMovie: (movie: MissingMovie) => void;
  onBulkSearch: (movies: MissingMovie[]) => void;
}

export function MovieMissingTab({ onSearchMovie, onBulkSearch }: MovieMissingTabProps) {
  const api = useMemo(() => getApiClients(), []);
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'cinemaDate' | 'digitalRelease' | 'title'>('cinemaDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedMovies, setSelectedMovies] = useState<Set<number>>(new Set());
  const [movieToDelete, setMovieToDelete] = useState<MissingMovie | null>(null);

  const missingQuery = useApiQuery({
    queryKey: queryKeys.missingMovies({ page, pageSize: 25, sortBy, sortDir }),
    queryFn: () => api.wantedApi.listMissingMovies({ page, pageSize: 25, sortBy, sortDir }),
    isEmpty: (data) => data.items.length === 0,
  });

  const toggleMonitoredMutation = useMutation({
    mutationFn: ({ id, monitored }: { id: number; monitored: boolean }) =>
      api.movieApi.update(id, { monitored }),
    onSuccess: () => {
      missingQuery.refetch();
    },
  });

  const deleteMovieMutation = useMutation({
    mutationFn: (id: number) => api.movieApi.remove(id),
    onSuccess: () => {
      setMovieToDelete(null);
      missingQuery.refetch();
    },
  });

  const handleToggleMonitored = (movie: MissingMovie) => {
    toggleMonitoredMutation.mutate({ id: movie.id, monitored: !movie.monitored });
  };

  const handleEditMovie = (movie: MissingMovie) => {
    router.push(`/library/movies/${movie.movieId}`);
  };

  const handleDeleteMovie = (movie: MissingMovie) => {
    setMovieToDelete(movie);
  };

  const confirmDeleteMovie = () => {
    if (movieToDelete) {
      deleteMovieMutation.mutate(movieToDelete.id);
    }
  };

  const cancelDeleteMovie = () => {
    setMovieToDelete(null);
  };

  const columns: DataTableColumn<MissingMovie>[] = [
    {
      key: 'select',
      header: '',
      render: row => (
        <input
          type="checkbox"
          checked={selectedMovies.has(row.id)}
          onChange={() => {
            const newSelected = new Set(selectedMovies);
            if (newSelected.has(row.id)) {
              newSelected.delete(row.id);
            } else {
              newSelected.add(row.id);
            }
            setSelectedMovies(newSelected);
          }}
          className="rounded-sm border-border-subtle bg-surface-1"
        />
      ),
    },
    {
      key: 'movie',
      header: 'Movie',
      render: row => (
        <div className="flex items-center gap-3">
          {row.posterUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.posterUrl}
              alt={row.title}
              className="h-12 w-8 rounded-sm object-cover"
            />
          )}
          <div>
            <div className="font-medium">{row.title}</div>
            <div className="text-sm text-text-secondary">{row.year}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: row => <StatusBadge status={row.status === 'missing' ? 'wanted' : 'monitored'} />,
    },
    {
      key: 'releaseDates',
      header: 'Release Dates',
      render: row => (
        <div className="flex flex-col gap-1 text-sm">
          <div>
            <span className="text-text-secondary">Cinema:</span>{' '}
            <span className="text-text-primary">{row.cinemaDate || '-'}</span>
          </div>
          <div>
            <span className="text-text-secondary">Digital:</span>{' '}
            <span className="text-text-primary">{row.digitalRelease || '-'}</span>
          </div>
          <div>
            <span className="text-text-secondary">Physical:</span>{' '}
            <span className="text-text-primary">{row.physicalRelease || '-'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'qualityProfile',
      header: 'Quality Profile',
      render: row => <span className="text-sm">{row.qualityProfileName || '-'}</span>,
    },
    {
      key: 'runtime',
      header: 'Runtime',
      render: row => <span className="text-sm">{row.runtime ? `${row.runtime} min` : '-'}</span>,
    },
    {
      key: 'monitored',
      header: 'Monitored',
      render: row => (
        <button
          type="button"
          onClick={() => handleToggleMonitored(row)}
          disabled={toggleMonitoredMutation.isPending}
          className={`rounded-sm px-2 py-1 text-xs font-medium transition-colors ${
            row.monitored
              ? 'bg-accent-success text-text-primary'
              : 'bg-surface-2 text-text-secondary'
          } ${toggleMonitoredMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {row.monitored ? 'Monitored' : 'Unmonitored'}
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: row => (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => onSearchMovie(row)}
            className="px-2 py-1 text-xs"
          >
            Search
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleEditMovie(row)}
            className="px-2 py-1 text-xs"
          >
            Edit
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleDeleteMovie(row)}
            className="px-2 py-1 text-xs text-accent-danger"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const handleSort = (key: string) => {
    if (key === sortBy) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key as 'cinemaDate' | 'digitalRelease' | 'title');
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleBulkSearch = () => {
    if (!missingQuery.data) return;
    const selectedItems = missingQuery.data.items.filter(item => selectedMovies.has(item.id));
    if (selectedItems.length > 0) {
      onBulkSearch(selectedItems);
      setSelectedMovies(new Set());
    }
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Missing Movies</h2>
          <p className="text-sm text-text-secondary">
            Monitored movies that are not yet downloaded.
          </p>
        </div>
        {selectedMovies.size > 0 && (
          <Button variant="primary" onClick={handleBulkSearch}>
            Search {selectedMovies.size} selected
          </Button>
        )}
      </header>

      <QueryPanel
        isLoading={missingQuery.isPending}
        isError={missingQuery.isError}
        isEmpty={missingQuery.isResolvedEmpty}
        errorMessage={missingQuery.error instanceof Error ? missingQuery.error.message : undefined}
        onRetry={() => void missingQuery.refetch()}
        emptyTitle="No missing movies"
        emptyBody="All monitored movies have been downloaded."
      >
        {missingQuery.data && (
          <DataTable
            data={missingQuery.data.items}
            columns={columns}
            getRowId={row => row.id}
            pagination={{
              page,
              totalPages: missingQuery.data.meta.totalPages,
              onPrev: () => setPage(current => Math.max(1, current - 1)),
              onNext: () => setPage(current => Math.min(missingQuery.data.meta.totalPages, current + 1)),
            }}
            sort={{ key: sortBy, direction: sortDir }}
            onSort={handleSort}
          />
        )}
      </QueryPanel>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={movieToDelete !== null}
        title="Delete Movie"
        description={movieToDelete ? (
          <>Are you sure you want to delete <strong>{movieToDelete.title} ({movieToDelete.year})</strong>? This action cannot be undone.</>
        ) : undefined}
        onCancel={cancelDeleteMovie}
        onConfirm={confirmDeleteMovie}
        confirmLabel={deleteMovieMutation.isPending ? 'Deleting...' : 'Delete'}
        isConfirming={deleteMovieMutation.isPending}
      />
    </section>
  );
}
