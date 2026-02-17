'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { ConfirmModal } from '@/components/primitives/Modal';
import { Button } from '@/components/primitives/Button';
import { LanguageBadge } from '@/components/subtitles/LanguageBadge';
import { getApiClients } from '@/lib/api/client';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { queryKeys } from '@/lib/query/queryKeys';
import type { BlacklistedSubtitle, BlacklistQueryParams } from '@/lib/api/subtitleBlacklistApi';
import { formatRelativeTime } from '@/lib/subtitles/time';

export default function BlacklistMoviesPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showClearModal, setShowClearModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<number | null>(null);

  const queryParams: BlacklistQueryParams = {
    page,
    pageSize,
  };

  const blacklistQuery = useApiQuery({
    queryKey: queryKeys.subtitleBlacklistMovies(queryParams),
    queryFn: () => api.subtitleBlacklistApi.listBlacklistMovies(queryParams),
    staleTimeKind: 'list',
    isEmpty: data => data.items.length === 0,
  });

  const clearBlacklistMutation = useMutation({
    mutationFn: () => api.subtitleBlacklistApi.clearBlacklistMovies(),
    onSuccess: () => {
      setShowClearModal(false);
      queryClient.invalidateQueries({ queryKey: ['subtitle-blacklist', 'movies'] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (id: number) => api.subtitleBlacklistApi.removeFromBlacklist(id),
    onSuccess: () => {
      setItemToRemove(null);
      queryClient.invalidateQueries({ queryKey: ['subtitle-blacklist', 'movies'] });
    },
  });

  const columns: DataTableColumn<BlacklistedSubtitle>[] = [
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
        // Extract year from episodeTitle which contains "(2023)" pattern
        const year = row.subtitlePath?.match(/\((\d{4})\)/)?.[1] ?? '-';
        return year;
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
      key: 'reason',
      header: 'Reason',
      render: row => (
        <span className="text-sm text-text-secondary max-w-[200px] truncate">
          {row.reason}
        </span>
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

  const data = blacklistQuery.data;
  const totalCount = data?.meta.totalCount ?? 0;

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Blacklisted Movie Subtitles</h1>
            {totalCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-text-secondary">
                {totalCount}
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary">
            Manage blacklisted subtitles for movies.
          </p>
        </div>
        <Button
          variant="danger"
          onClick={() => setShowClearModal(true)}
          disabled={totalCount === 0}
        >
          Remove All
        </Button>
      </header>

      <QueryPanel
        isLoading={blacklistQuery.isPending}
        isError={blacklistQuery.isError}
        isEmpty={blacklistQuery.isResolvedEmpty}
        errorMessage={blacklistQuery.error?.message}
        onRetry={() => void blacklistQuery.refetch()}
        emptyTitle="No blacklisted subtitles found"
        emptyBody="Subtitles are automatically blacklisted when they fail validation checks."
      >
        <DataTable
          data={blacklistQuery.data?.items ?? []}
          columns={columns}
          getRowId={row => row.id}
          rowActions={row => (
            <Button
              variant="secondary"
              onClick={() => setItemToRemove(row.id)}
            >
              Remove
            </Button>
          )}
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
        title="Clear All Blacklisted Subtitles"
        description={`This will permanently remove all ${totalCount} blacklisted movie subtitles. This action cannot be undone.`}
        onCancel={() => setShowClearModal(false)}
        onConfirm={() => clearBlacklistMutation.mutate()}
        cancelLabel="Cancel"
        confirmLabel="Remove All"
        confirmVariant="danger"
        isConfirming={clearBlacklistMutation.isPending}
      />

      <ConfirmModal
        isOpen={itemToRemove !== null}
        title="Remove from Blacklist"
        description="This subtitle will be removed from the blacklist. It may be downloaded again in the future."
        onCancel={() => setItemToRemove(null)}
        onConfirm={() => itemToRemove && removeItemMutation.mutate(itemToRemove)}
        cancelLabel="Cancel"
        confirmLabel="Remove"
        confirmVariant="danger"
        isConfirming={removeItemMutation.isPending}
      />
    </section>
  );
}
