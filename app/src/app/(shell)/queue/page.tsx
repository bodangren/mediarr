'use client';

import { useMemo, useState } from 'react';
import { RefreshCw, CloudDownload, Trash2, Download } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { ProgressBar } from '@/components/primitives/ProgressBar';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { Button } from '@/components/primitives/Button';
import { MovieCell } from '@/components/activity/MovieCell';
import { QueueRemoveModal, type QueueRemoveOptions } from '@/components/activity/QueueRemoveModal';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { formatBytes, formatSpeed, formatTimeRemaining } from '@/lib/format';

export interface QueueItem {
  id: string;
  movieId?: number;
  movieTitle?: string;
  moviePosterUrl?: string;
  year?: number;
  releaseTitle: string;
  status: 'queued' | 'downloading' | 'importing' | 'completed' | 'failed' | 'paused';
  progress: number;
  size: number;
  downloaded: number;
  speed?: number; // bytes/sec
  timeRemaining?: number; // seconds
  quality: string;
  language?: string;
  protocol: 'torrent' | 'usenet';
  indexer?: string;
  episodeId?: number; // For TV (keep existing)
}

interface PaginatedMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

const STATUS_FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Downloading', value: 'downloading' },
  { label: 'Completed', value: 'completed' },
  { label: 'Paused', value: 'paused' },
  { label: 'Failed', value: 'failed' },
] as const;

const SORT_OPTIONS = [
  { label: 'Time', value: 'time' },
  { label: 'Movie', value: 'movie' },
  { label: 'Quality', value: 'quality' },
  { label: 'Status', value: 'status' },
] as const;

function ProtocolIcon({ protocol }: { protocol: 'torrent' | 'usenet' }) {
  if (protocol === 'torrent') {
    return <Download size={16} className="text-accent-primary" aria-label="Torrent" />;
  }
  return <CloudDownload size={16} className="text-accent-info" aria-label="Usenet" />;
}

export default function QueuePage() {
  const api = useMemo(() => getApiClients(), []);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('time');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [removeModalItem, setRemoveModalItem] = useState<QueueItem | null>(null);

  const queueQuery = useApiQuery({
    queryKey: queryKeys.torrents({ page: 1, pageSize: 50 }),
    queryFn: () =>
      api.torrentApi.list({ page: 1, pageSize: 50 }) as unknown as Promise<{
        items: QueueItem[];
        meta: PaginatedMeta;
      }>,
    staleTimeKind: 'queue',
    isEmpty: data => data.items.length === 0,
    refetchInterval: 5000, // 5 second polling
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queueQuery.refetch();
    setIsRefreshing(false);
  };

  const handleRemove = async (options: QueueRemoveOptions) => {
    if (!removeModalItem) return;
    try {
      await api.torrentApi.remove(removeModalItem.id);
      await queueQuery.refetch();
      setRemoveModalItem(null);
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const handleBulkRemove = async () => {
    try {
      await Promise.all(selectedItems.map(id => api.torrentApi.remove(id)));
      setSelectedItems([]);
      await queueQuery.refetch();
    } catch (error) {
      console.error('Failed to remove items:', error);
    }
  };

  // Filter items by status
  const filteredItems = useMemo(() => {
    const items = queueQuery.data?.items ?? [];
    if (statusFilter === 'all') return items;
    return items.filter(item => item.status === statusFilter);
  }, [queueQuery.data, statusFilter]);

  // Sort items
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      switch (sortBy) {
        case 'movie':
          return (a.movieTitle ?? a.releaseTitle).localeCompare(
            b.movieTitle ?? b.releaseTitle,
          );
        case 'quality':
          return a.quality.localeCompare(b.quality);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'time':
        default:
          return 0; // API should return sorted by time by default
      }
    });
  }, [filteredItems, sortBy]);

  const columns: DataTableColumn<QueueItem>[] = [
    {
      key: 'select',
      header: '',
      render: row => (
        <input
          type="checkbox"
          aria-label="Select item"
          checked={selectedItems.includes(row.id)}
          onChange={e => {
            if (e.target.checked) {
              setSelectedItems([...selectedItems, row.id]);
            } else {
              setSelectedItems(selectedItems.filter(id => id !== row.id));
            }
          }}
          className="h-4 w-4 rounded border-border-subtle bg-surface-1 text-accent-primary"
        />
      ),
      className: 'w-10',
    },
    {
      key: 'movie',
      header: 'Movie',
      render: row =>
        row.movieId ? (
          <MovieCell
            movieId={row.movieId}
            title={row.movieTitle ?? row.releaseTitle}
            posterUrl={row.moviePosterUrl}
            year={row.year}
          />
        ) : (
          <div className="truncate font-medium text-text-primary">
            {row.releaseTitle}
          </div>
        ),
      className: 'min-w-[200px]',
    },
    {
      key: 'release',
      header: 'Release',
      render: row => (
        <span className="text-sm text-text-primary truncate">
          {row.releaseTitle}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: row => <StatusBadge status={row.status} />,
    },
    {
      key: 'progress',
      header: 'Progress',
      render: row => (
        <div className="space-y-1">
          <ProgressBar value={row.progress} label="" />
          <span className="text-xs text-text-secondary">
            {formatBytes(row.downloaded)} / {formatBytes(row.size)}
          </span>
        </div>
      ),
    },
    {
      key: 'speed',
      header: 'Speed',
      render: row => (
        <span className="text-sm text-text-primary">
          {formatSpeed(row.speed)}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'timeRemaining',
      header: 'Time Remaining',
      render: row => (
        <span className="text-sm text-text-secondary">
          {formatTimeRemaining(row.timeRemaining)}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'quality',
      header: 'Quality',
      render: row => (
        <span className="text-xs text-text-primary bg-surface-2 px-2 py-0.5 rounded-sm">
          {row.quality}
        </span>
      ),
    },
    {
      key: 'language',
      header: 'Language',
      render: row => (
        <span className="text-sm text-text-secondary">{row.language ?? '-'}</span>
      ),
      hideOnTablet: true,
    },
    {
      key: 'protocol',
      header: 'Protocol',
      render: row => (
        <div className="flex items-center gap-2">
          <ProtocolIcon protocol={row.protocol} />
          <span className="text-sm text-text-secondary capitalize">
            {row.protocol}
          </span>
        </div>
      ),
      hideOnTablet: true,
    },
    {
      key: 'indexer',
      header: 'Indexer',
      render: row => (
        <span className="text-sm text-text-secondary">{row.indexer ?? '-'}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: row => (
        <div className="flex items-center gap-2">
          {row.status === 'queued' && (
            <Button variant="secondary" className="text-xs px-2 py-1">
              Grab
            </Button>
          )}
          <Button
            variant="danger"
            className="text-xs px-2 py-1"
            onClick={() => setRemoveModalItem(row)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Queue</h1>
        <p className="text-sm text-text-secondary">
          Live torrent queue updates with movie support.
        </p>
      </header>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border-subtle bg-surface-1 p-3">
        <Button
          variant="secondary"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw
            size={16}
            className={isRefreshing ? 'animate-spin' : ''}
          />
          Refresh
        </Button>

        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary">Filter:</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-sm text-text-primary"
          >
            {STATUS_FILTER_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary">Sort:</label>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-sm text-text-primary"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-2 text-xs text-text-secondary">
            <span className="h-2 w-2 rounded-full bg-accent-primary animate-pulse" />
            Live
          </span>
          {selectedItems.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="text-xs"
                onClick={() => setSelectedItems([])}
              >
                Clear Selection
              </Button>
              <Button variant="danger" className="text-xs" onClick={handleBulkRemove}>
                Remove Selected ({selectedItems.length})
              </Button>
            </div>
          )}
        </div>
      </div>

      <QueryPanel
        isLoading={queueQuery.isPending}
        isError={queueQuery.isError}
        isEmpty={sortedItems.length === 0 && !queueQuery.isPending}
        errorMessage={queueQuery.error?.message}
        onRetry={() => void queueQuery.refetch()}
        emptyTitle="Queue is empty"
        emptyBody="Grab a release from Wanted to start downloading."
      >
        <DataTable data={sortedItems} columns={columns} getRowId={row => row.id} />
      </QueryPanel>

      {removeModalItem && (
        <QueueRemoveModal
          isOpen={!!removeModalItem}
          onClose={() => setRemoveModalItem(null)}
          onConfirm={handleRemove}
          itemTitle={removeModalItem.movieTitle ?? removeModalItem.releaseTitle}
        />
      )}
    </section>
  );
}
