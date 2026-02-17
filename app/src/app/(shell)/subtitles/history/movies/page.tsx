'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { ConfirmModal } from '@/components/primitives/Modal';
import { Button } from '@/components/primitives/Button';
import { HistoryFilters, type FilterState } from '@/components/subtitles/HistoryFilters';
import { LanguageBadge } from '@/components/subtitles/LanguageBadge';
import { getApiClients } from '@/lib/api/client';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { queryKeys } from '@/lib/query/queryKeys';
import type { SubtitleHistoryEntry, HistoryQueryParams } from '@/lib/api/subtitleHistoryApi';
import { formatRelativeTime } from '@/lib/subtitles/time';
import {
  SUBTITLE_ACTIONS_VALUES,
  SUBTITLE_PROVIDERS_VALUES,
  SUBTITLE_LANGUAGES,
  toMutable,
} from '@/lib/subtitles/constants';

export default function MoviesHistoryPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filters, setFilters] = useState<FilterState>({});
  const [showClearModal, setShowClearModal] = useState(false);

  const queryParams: HistoryQueryParams = {
    page,
    pageSize,
    type: 'movies',
    provider: filters.provider,
    languageCode: filters.languageCode,
    action: filters.action,
    startDate: filters.startDate,
    endDate: filters.endDate,
  };

  const historyQuery = useApiQuery({
    queryKey: queryKeys.subtitleHistory('movies', queryParams),
    queryFn: () => api.subtitleHistoryApi.listHistory(queryParams),
    staleTimeKind: 'list',
    isEmpty: data => data.items.length === 0,
  });

  const clearHistoryMutation = useMutation({
    mutationFn: () => api.subtitleHistoryApi.clearHistory('movies'),
    onSuccess: () => {
      setShowClearModal(false);
      queryClient.invalidateQueries({ queryKey: ['subtitle-history', 'movies'] });
    },
  });

  const columns: DataTableColumn<SubtitleHistoryEntry>[] = [
    {
      key: 'movie',
      header: 'Movie',
      render: row => (
        <Link
          href={`/library/movies/${row.movieId}`}
          className="font-medium hover:underline"
        >
          {row.movieTitle}
        </Link>
      ),
    },
    {
      key: 'year',
      header: 'Year',
      render: row => {
        const year = row.episodeTitle ? row.episodeTitle.match(/\((\d{4})\)/)?.[1] : '';
        return year ?? '-';
      },
      hideOnMobile: true,
    },
    {
      key: 'language',
      header: 'Language',
      render: row => (
        <LanguageBadge
          languageCode={row.languageCode}
          variant="available"
        />
      ),
    },
    {
      key: 'provider',
      header: 'Provider',
      render: row => row.provider,
      hideOnTablet: true,
    },
    {
      key: 'action',
      header: 'Action',
      render: row => (
        <span className="inline-flex rounded-sm bg-surface-2 px-2 py-0.5 text-xs">
          {row.action}
        </span>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      render: row => (
        <span className="text-sm font-mono">{row.score.toFixed(1)}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'timestamp',
      header: 'Time',
      render: row => (
        <time dateTime={row.timestamp} className="text-xs text-text-secondary">
          {formatRelativeTime(row.timestamp)}
        </time>
      ),
    },
  ];

  const data = historyQuery.data;

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Movies History</h1>
          <p className="text-sm text-text-secondary">
            View subtitle download history for movies.
          </p>
        </div>
        <Button variant="danger" onClick={() => setShowClearModal(true)}>
          Clear History
        </Button>
      </header>

      <HistoryFilters
        filters={filters}
        onChange={setFilters}
        providers={toMutable(SUBTITLE_PROVIDERS_VALUES)}
        languages={toMutable(SUBTITLE_LANGUAGES)}
        actions={toMutable(SUBTITLE_ACTIONS_VALUES)}
      />

      <QueryPanel
        isLoading={historyQuery.isPending}
        isError={historyQuery.isError}
        isEmpty={historyQuery.isResolvedEmpty}
        errorMessage={historyQuery.error?.message}
        onRetry={() => void historyQuery.refetch()}
        emptyTitle="No history found"
        emptyBody="Start downloading subtitles for movies to see history here."
      >
        <DataTable
          data={historyQuery.data?.items ?? []}
          columns={columns}
          getRowId={row => row.id}
          pagination={
            data
              ? {
                  page,
                  totalPages: Math.ceil(data.meta.totalCount / (queryParams.pageSize ?? 25)),
                  pageSize: queryParams.pageSize,
                  pageSizeOptions: [10, 25, 50, 100],
                  onPrev: () => setPage(current => Math.max(1, current - 1)),
                  onNext: () => setPage(current => Math.min(Math.ceil(data.meta.totalCount / (queryParams.pageSize ?? 25)), current + 1)),
                  onPageSizeChange: (size) => {
                    setPage(1);
                    setPageSize(size);
                  },
                }
              : undefined
          }
        />
      </QueryPanel>

      <ConfirmModal
        isOpen={showClearModal}
        title="Clear Movies History"
        description="This will permanently delete all movie subtitle history. This action cannot be undone."
        onCancel={() => setShowClearModal(false)}
        onConfirm={() => clearHistoryMutation.mutate()}
        cancelLabel="Cancel"
        confirmLabel="Clear History"
        confirmVariant="danger"
        isConfirming={clearHistoryMutation.isPending}
      />
    </section>
  );
}
