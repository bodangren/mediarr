'use client';

import { useMemo, useState } from 'react';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { Button } from '@/components/primitives/Button';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import type { CutoffUnmetEpisode } from '@/types/wanted';

export interface CutoffUnmetTabProps {
  onSearchEpisode: (episode: CutoffUnmetEpisode) => void;
  onBulkSearch: (episodes: CutoffUnmetEpisode[]) => void;
}

function getQualityStatus(currentQuality: string, cutoffQuality: string): 'completed' | 'downloading' | 'wanted' {
  // Simple quality comparison - in a real app, this would be more sophisticated
  const current = parseInt(currentQuality, 10);
  const cutoff = parseInt(cutoffQuality, 10);

  if (!isNaN(current) && !isNaN(cutoff)) {
    return current >= cutoff ? 'completed' : 'wanted';
  }

  return 'wanted';
}

export function CutoffUnmetTab({ onSearchEpisode, onBulkSearch }: CutoffUnmetTabProps) {
  const api = useMemo(() => getApiClients(), []);

  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'airDate' | 'seriesTitle' | 'currentQuality'>('airDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<number>>(new Set());

  const cutoffUnmetQuery = useApiQuery({
    queryKey: queryKeys.cutoffUnmetEpisodes({
      page,
      pageSize: 25,
      sortBy,
      sortDir,
    }),
    queryFn: () =>
      api.mediaApi.listCutoffUnmetEpisodes({
        page,
        pageSize: 25,
        sortBy,
        sortDir,
      }) as Promise<{
        items: CutoffUnmetEpisode[];
        meta: { page: number; pageSize: number; totalCount: number; totalPages: number };
      }>,
    staleTimeKind: 'list',
    isEmpty: data => data.items.length === 0,
  });

  const columns: DataTableColumn<CutoffUnmetEpisode>[] = [
    {
      key: 'seriesTitle',
      header: 'Series',
      sortable: true,
      render: row => row.seriesTitle,
    },
    {
      key: 'episode',
      header: 'Episode',
      render: row => `S${String(row.seasonNumber).padStart(2, '0')}E${String(row.episodeNumber).padStart(2, '0')}`,
    },
    {
      key: 'episodeTitle',
      header: 'Title',
      render: row => row.episodeTitle,
    },
    {
      key: 'currentQuality',
      header: 'Current Quality',
      sortable: true,
      render: row => (
        <div className="flex items-center gap-2">
          <StatusBadge status={getQualityStatus(row.currentQuality, row.cutoffQuality)} />
          <span>{row.currentQuality}</span>
        </div>
      ),
    },
    {
      key: 'cutoffQuality',
      header: 'Cutoff Quality',
      render: row => <span className="text-text-muted">{row.cutoffQuality}</span>,
    },
    {
      key: 'airDate',
      header: 'Air Date',
      sortable: true,
      render: row => new Date(row.airDate).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: row => (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedEpisodes.has(row.id)}
            onChange={e => {
              const newSelected = new Set(selectedEpisodes);
              if (e.currentTarget.checked) {
                newSelected.add(row.id);
              } else {
                newSelected.delete(row.id);
              }
              setSelectedEpisodes(newSelected);
            }}
            className="rounded-sm border-border-subtle bg-surface-1"
          />
          <Button
            variant="secondary"
            onClick={() => onSearchEpisode(row)}
            className="px-2 py-1 text-xs"
          >
            Search
          </Button>
        </div>
      ),
    },
  ];

  const handleSort = (key: string) => {
    if (key === sortBy) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key as 'airDate' | 'seriesTitle' | 'currentQuality');
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleBulkSearch = () => {
    const selectedItems = cutoffUnmetQuery.data?.items.filter(item => selectedEpisodes.has(item.id)) ?? [];
    if (selectedItems.length > 0) {
      onBulkSearch(selectedItems);
      setSelectedEpisodes(new Set());
    }
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Cutoff Unmet Episodes</h2>
          <p className="text-sm text-text-secondary">
            Episodes that have files but don't meet the quality cutoff.
          </p>
        </div>
        {selectedEpisodes.size > 0 && (
          <Button variant="primary" onClick={handleBulkSearch}>
            Search {selectedEpisodes.size} selected
          </Button>
        )}
      </header>

      <QueryPanel
        isLoading={cutoffUnmetQuery.isPending}
        isError={cutoffUnmetQuery.isError}
        isEmpty={cutoffUnmetQuery.isResolvedEmpty}
        errorMessage={cutoffUnmetQuery.error?.message}
        onRetry={() => void cutoffUnmetQuery.refetch()}
        emptyTitle="No cutoff unmet episodes"
        emptyBody="All monitored episodes meet the quality cutoff."
      >
        <DataTable
          data={cutoffUnmetQuery.data?.items ?? []}
          columns={columns}
          getRowId={row => row.id}
          pagination={{
            page,
            totalPages: cutoffUnmetQuery.data?.meta.totalPages ?? 1,
            onPrev: () => setPage(current => Math.max(1, current - 1)),
            onNext: () => setPage(current => Math.min(cutoffUnmetQuery.data?.meta.totalPages ?? 1, current + 1)),
          }}
          sort={{ key: sortBy, direction: sortDir }}
          onSort={handleSort}
        />
      </QueryPanel>
    </section>
  );
}
