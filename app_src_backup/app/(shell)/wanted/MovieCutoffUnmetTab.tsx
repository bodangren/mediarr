'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { Button } from '@/components/primitives/Button';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { formatBytes } from '@/lib/format';
import type { CutoffUnmetMovie } from '@/types/wanted';
import { QualityComparison } from '@/components/wanted/QualityComparison';

export interface MovieCutoffUnmetTabProps {
  onSearchMovie: (movie: CutoffUnmetMovie) => void;
  onBulkSearch: (movies: CutoffUnmetMovie[]) => void;
}

export function MovieCutoffUnmetTab({ onSearchMovie, onBulkSearch }: MovieCutoffUnmetTabProps) {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'qualityGap' | 'title' | 'fileSize'>('qualityGap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedMovies, setSelectedMovies] = useState<Set<number>>(new Set());

  const cutoffUnmetQuery = useQuery({
    queryKey: queryKeys.cutoffUnmetMovies({ page, pageSize: 25, sortBy, sortDir }),
    queryFn: () => api.wantedApi.listCutoffUnmetMovies({ page, pageSize: 25, sortBy, sortDir }),
  });

  const toggleMonitoredMutation = useMutation({
    mutationFn: ({ id, monitored }: { id: number; monitored: boolean }) =>
      api.movieApi.update(id, { monitored }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies', 'cutoff-unmet'] });
    },
  });

  const handleToggleMonitored = (movie: CutoffUnmetMovie) => {
    toggleMonitoredMutation.mutate({ id: movie.id, monitored: !movie.monitored });
  };

  const handleEditMovie = (movie: CutoffUnmetMovie) => {
    router.push(`/library/movies/${movie.movieId}`);
  };

  const columns: DataTableColumn<CutoffUnmetMovie>[] = [
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
      key: 'quality',
      header: 'Quality',
      render: row => <QualityComparison current={row.currentQuality} cutoff={row.cutoffQuality} />,
    },
    {
      key: 'qualityProfile',
      header: 'Quality Profile',
      render: row => <span className="text-sm">{row.qualityProfileName || '-'}</span>,
    },
    {
      key: 'fileSize',
      header: 'File Size',
      sortable: true,
      render: row => <span className="text-sm">{formatBytes(row.fileSize)}</span>,
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
        </div>
      ),
    },
  ];

  const handleSort = (key: string) => {
    if (key === sortBy) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key as 'qualityGap' | 'title' | 'fileSize');
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleBulkSearch = () => {
    if (!cutoffUnmetQuery.data) return;
    const selectedItems = cutoffUnmetQuery.data.items.filter((item: CutoffUnmetMovie) => selectedMovies.has(item.id));
    if (selectedItems.length > 0) {
      onBulkSearch(selectedItems);
      setSelectedMovies(new Set());
    }
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Cutoff Unmet Movies</h2>
          <p className="text-sm text-text-secondary">
            Movies that have files but don't meet the quality cutoff.
          </p>
        </div>
        {selectedMovies.size > 0 && (
          <Button variant="primary" onClick={handleBulkSearch}>
            Search for upgrades ({selectedMovies.size})
          </Button>
        )}
      </header>

      <QueryPanel
        isLoading={cutoffUnmetQuery.isPending}
        isError={cutoffUnmetQuery.isError}
        isEmpty={!cutoffUnmetQuery.data || cutoffUnmetQuery.data.items.length === 0}
        errorMessage={cutoffUnmetQuery.error instanceof Error ? cutoffUnmetQuery.error.message : undefined}
        onRetry={() => void cutoffUnmetQuery.refetch()}
        emptyTitle="No cutoff unmet movies"
        emptyBody="All monitored movies meet the quality cutoff."
      >
        {cutoffUnmetQuery.data && (
          <DataTable
            data={cutoffUnmetQuery.data.items}
            columns={columns}
            getRowId={row => row.id}
            pagination={{
              page,
              totalPages: cutoffUnmetQuery.data.meta.totalPages,
              onPrev: () => setPage(current => Math.max(1, current - 1)),
              onNext: () => setPage(current => Math.min(cutoffUnmetQuery.data.meta.totalPages, current + 1)),
            }}
            sort={{ key: sortBy, direction: sortDir }}
            onSort={handleSort}
          />
        )}
      </QueryPanel>
    </section>
  );
}
