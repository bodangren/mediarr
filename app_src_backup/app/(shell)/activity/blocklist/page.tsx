'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { SelectProvider, useSelectContext } from '@/components/primitives/SelectProvider';
import { SelectCheckboxCell } from '@/components/primitives/SelectCheckboxCell';
import { SelectFooter } from '@/components/primitives/SelectFooter';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { Button } from '@/components/primitives/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { MovieCell } from '@/components/activity/MovieCell';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { formatRelativeDate, formatBytesFromString } from '@/lib/format';
import { Ban } from 'lucide-react';

type BlocklistRow = {
  id: number;
  // For TV
  seriesId?: number;
  seriesTitle?: string;
  episodeId?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  // For Movies
  movieId?: number;
  movieTitle?: string;
  moviePosterUrl?: string;
  year?: number;
  // Common
  releaseTitle: string;
  quality?: string;
  dateBlocked: string;
  reason: string;
  indexer?: string;
  size?: number;
};

interface PaginatedMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

function BlocklistRowActions({
  item,
  onUnblock,
}: {
  item: BlocklistRow;
  onUnblock: (id: number) => Promise<void>;
}) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleUnblock = async () => {
    setIsRemoving(true);
    try {
      await onUnblock(item.id);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        onClick={handleUnblock}
        disabled={isRemoving}
        className="flex items-center gap-1 text-xs"
      >
        <Ban size={14} />
        Unblock
      </Button>
    </div>
  );
}

function MobileCheckboxCell({ rowId }: { rowId: number }) {
  const { isSelected, toggleRow } = useSelectContext();

  return (
    <input
      type="checkbox"
      aria-label="Select row"
      checked={isSelected(rowId)}
      onChange={event =>
        toggleRow(rowId, (event.nativeEvent as MouseEvent).shiftKey)
      }
    />
  );
}

export default function BlocklistPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const blocklistQuery = useApiQuery({
    queryKey: queryKeys.blocklist({ page, pageSize }),
    queryFn: () =>
      api.blocklistApi.list({ page, pageSize }) as unknown as Promise<{
        items: BlocklistRow[];
        meta: PaginatedMeta;
      }>,
    staleTimeKind: 'list',
    isEmpty: data => data.items.length === 0,
  });

  const handleUnblock = async (id: number) => {
    try {
      await api.blocklistApi.remove([id]);
      await queryClient.invalidateQueries({ queryKey: ['blocklist'] });
      pushToast({
        title: 'Release unblocked',
        message: 'The release has been removed from the blocklist.',
        variant: 'success',
      });
    } catch (error) {
      pushToast({
        title: 'Failed to unblock',
        message: error instanceof Error ? error.message : 'An error occurred',
        variant: 'error',
      });
    }
  };

  const handleBulkUnblock = async (
    selectedIds: Array<string | number>,
  ) => {
    try {
      await api.blocklistApi.remove(selectedIds as number[]);
      await queryClient.invalidateQueries({ queryKey: ['blocklist'] });
      pushToast({
        title: 'Releases unblocked',
        message: `${selectedIds.length} releases have been removed from the blocklist.`,
        variant: 'success',
      });
    } catch (error) {
      pushToast({
        title: 'Failed to unblock',
        message: error instanceof Error ? error.message : 'An error occurred',
        variant: 'error',
      });
    }
  };

  const formatEpisode = (
    seasonNumber?: number,
    episodeNumber?: number,
  ) => {
    if (seasonNumber !== undefined && episodeNumber !== undefined) {
      return `S${seasonNumber.toString().padStart(2, '0')}E${episodeNumber.toString().padStart(2, '0')}`;
    }
    return '-';
  };

  const columns: DataTableColumn<BlocklistRow>[] = [
    {
      key: 'select',
      header: '',
      render: row => <SelectCheckboxCell rowId={row.id} />,
      className: 'w-10',
    },
    {
      key: 'media',
      header: 'Media',
      render: row =>
        row.movieId ? (
          <MovieCell
            movieId={row.movieId}
            title={row.movieTitle ?? row.releaseTitle}
            posterUrl={row.moviePosterUrl}
            year={row.year}
          />
        ) : row.seriesTitle ? (
          <div>
            <p className="font-medium text-text-primary">{row.seriesTitle}</p>
            <p className="text-xs text-text-secondary">
              {formatEpisode(row.seasonNumber, row.episodeNumber)}
            </p>
          </div>
        ) : (
          <span className="text-sm text-text-muted">-</span>
        ),
    },
    {
      key: 'releaseTitle',
      header: 'Release Title',
      render: row => (
        <span className="text-sm text-text-primary">{row.releaseTitle}</span>
      ),
    },
    {
      key: 'quality',
      header: 'Quality',
      render: row => (
        <span className="text-xs text-text-primary bg-surface-2 px-2 py-0.5 rounded-sm">
          {row.quality ?? '-'}
        </span>
      ),
    },
    {
      key: 'size',
      header: 'Size',
      render: row => (
        <span className="text-sm text-text-secondary">
          {row.size ? formatBytesFromString(row.size) : '-'}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'dateBlocked',
      header: 'Date Blocked',
      render: row => (
        <span className="text-sm text-text-secondary">
          {formatRelativeDate(row.dateBlocked)}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: row => (
        <span
          className="text-sm text-text-muted"
          title={row.reason}
        >
          {row.reason.length > 50
            ? `${row.reason.slice(0, 50)}...`
            : row.reason}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'indexer',
      header: 'Indexer',
      render: row => (
        <span className="text-sm text-text-secondary">{row.indexer ?? '-'}</span>
      ),
      hideOnTablet: true,
    },
  ];

  const data = blocklistQuery.data?.items ?? [];
  const meta = blocklistQuery.data?.meta;
  const rowIds = data.map(row => row.id);

  return (
    <SelectProvider rowIds={rowIds}>
      <section className="space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Blocklist</h1>
          <p className="text-sm text-text-secondary">
            Manage blocked releases (Sonarr/Radarr style).
          </p>
        </header>

        <SelectFooter
          actions={[
            {
              label: 'Remove Selected',
              onClick: handleBulkUnblock,
            },
          ]}
        />

        <QueryPanel
          isLoading={blocklistQuery.isPending}
          isError={blocklistQuery.isError}
          isEmpty={blocklistQuery.isResolvedEmpty}
          errorMessage={blocklistQuery.error?.message}
          onRetry={() => void blocklistQuery.refetch()}
          emptyTitle="Blocklist is empty"
          emptyBody="Releases will be added to the blocklist when they fail quality checks or are manually blocked."
        >
          <DataTable
            data={data}
            columns={columns}
            getRowId={row => row.id}
            rowActions={row => (
              <BlocklistRowActions item={row} onUnblock={handleUnblock} />
            )}
            pagination={
              meta
                ? {
                    page: meta.page,
                    totalPages: meta.totalPages,
                    pageSize: meta.pageSize,
                    pageSizeOptions: [10, 25, 50, 100],
                    onPrev: () => setPage(p => Math.max(1, p - 1)),
                    onNext: () => setPage(p => Math.min(meta.totalPages, p + 1)),
                    onPageSizeChange: setPageSize,
                  }
                : undefined
            }
            mobileCardView
            renderMobileCard={row => (
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  {row.movieId ? (
                    <div className="flex-1">
                      <p className="font-medium text-text-primary">
                        {row.movieTitle}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {row.releaseTitle}
                      </p>
                    </div>
                  ) : row.seriesTitle ? (
                    <div className="flex-1">
                      <p className="font-medium text-text-primary">
                        {row.seriesTitle}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {row.releaseTitle}
                      </p>
                    </div>
                  ) : null}
                  <MobileCheckboxCell rowId={row.id} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {row.seriesTitle ? (
                    <div>
                      <span className="text-text-secondary">Episode:</span>
                      <span className="ml-1 text-text-primary">
                        {formatEpisode(row.seasonNumber, row.episodeNumber)}
                      </span>
                    </div>
                  ) : null}
                  <div>
                    <span className="text-text-secondary">Quality:</span>
                    <span className="ml-1 text-text-primary">
                      {row.quality ?? '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Date:</span>
                    <span className="ml-1 text-text-primary">
                      {formatRelativeDate(row.dateBlocked)}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Reason:</span>
                    <span className="ml-1 text-text-muted" title={row.reason}>
                      {row.reason.length > 20
                        ? `${row.reason.slice(0, 20)}...`
                        : row.reason}
                    </span>
                  </div>
                </div>
                <div className="pt-2">
                  <BlocklistRowActions item={row} onUnblock={handleUnblock} />
                </div>
              </div>
            )}
          />
        </QueryPanel>
      </section>
    </SelectProvider>
  );
}
