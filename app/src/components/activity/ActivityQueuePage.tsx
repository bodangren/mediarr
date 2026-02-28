'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiClients } from '@/lib/api/client';
import type { TorrentItem } from '@/lib/api/torrentApi';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { ProgressBar } from '@/components/primitives/ProgressBar';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { Button } from '@/components/primitives/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { formatBytes, formatSpeed, formatTimeRemaining, formatPercent } from '@/lib/format';
import { QueueRemoveModal, type QueueRemoveOptions } from './QueueRemoveModal';
import { Pause, Play, Trash2, Settings2, RotateCcw } from 'lucide-react';

function normalizeQueueStatus(status: string | undefined): 'downloading' | 'seeding' | 'paused' | 'error' | 'queued' {
  const normalized = (status ?? '').toLowerCase();
  if (normalized === 'downloading') return 'downloading';
  if (normalized === 'seeding') return 'seeding';
  if (normalized === 'paused' || normalized === 'stopped') return 'paused';
  if (normalized === 'error') return 'error';
  return 'queued';
}

export function ActivityQueuePage() {
  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();
  
  const [torrents, setTorrents] = useState<TorrentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  
  const [removingItem, setRemovingItem] = useState<TorrentItem | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [retryingInfoHash, setRetryingInfoHash] = useState<string | null>(null);

  const [downloadLimit, setDownloadLimit] = useState<number | undefined>(0);
  const [uploadLimit, setUploadLimit] = useState<number | undefined>(0);
  const [isUpdatingLimits, setIsUpdatingLimits] = useState(false);

  const fetchTorrents = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const result = await api.torrentApi.list({ page, pageSize });
      setTorrents(result.items);
      setTotalCount(result.meta.totalCount);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch torrents');
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, [api, page, pageSize]);

  // Initial load
  useEffect(() => {
    void fetchTorrents();
  }, [fetchTorrents]);

  // Polling
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchTorrents(true);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchTorrents]);

  const handlePauseResume = async (torrent: TorrentItem) => {
    try {
      if (torrent.status === 'paused') {
        await api.torrentApi.resume(torrent.infoHash);
        pushToast({ title: 'Torrent resumed', variant: 'success' });
      } else {
        await api.torrentApi.pause(torrent.infoHash);
        pushToast({ title: 'Torrent paused', variant: 'success' });
      }
      void fetchTorrents(true);
    } catch (err) {
      pushToast({ 
        title: 'Action failed', 
        message: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error' 
      });
    }
  };

  const handleRemoveConfirm = async (_options: QueueRemoveOptions) => {
    if (!removingItem) return;
    
    setIsRemoving(true);
    try {
      await api.torrentApi.remove(removingItem.infoHash);
      pushToast({ title: 'Torrent removed', variant: 'success' });
      setRemovingItem(null);
      void fetchTorrents(true);
    } catch (err) {
      pushToast({ 
        title: 'Removal failed', 
        message: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error' 
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRetryImport = async (torrent: TorrentItem) => {
    setRetryingInfoHash(torrent.infoHash);
    try {
      await api.torrentApi.retryImport(torrent.infoHash);
      pushToast({ title: 'Import retried', variant: 'success' });
      void fetchTorrents(true);
    } catch (err) {
      pushToast({
        title: 'Retry failed',
        message: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error',
      });
    } finally {
      setRetryingInfoHash(null);
    }
  };

  const handleUpdateLimits = async () => {
    setIsUpdatingLimits(true);
    try {
      await api.torrentApi.setSpeedLimits({
        download: downloadLimit === 0 ? -1 : (downloadLimit ?? 0) * 1024,
        upload: uploadLimit === 0 ? -1 : (uploadLimit ?? 0) * 1024,
      });
      pushToast({ title: 'Speed limits updated', variant: 'success' });
    } catch (err) {
      pushToast({ 
        title: 'Update failed', 
        message: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error' 
      });
    } finally {
      setIsUpdatingLimits(false);
    }
  };

  const columns: DataTableColumn<TorrentItem>[] = [
    {
      key: 'name',
      header: 'Title',
      render: (torrent) => (
        <div className="flex flex-col gap-1 max-w-md">
          <span className="font-medium truncate" title={torrent.name}>{torrent.name}</span>
          <span className="text-xs text-text-secondary truncate" title={torrent.path}>{torrent.path}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (torrent) => <StatusBadge status={normalizeQueueStatus(torrent.status)} />,
    },
    {
      key: 'progress',
      header: 'Progress',
      render: torrent => {
        const progressValue = Math.max(0, Math.min(100, (torrent.progress ?? 0) * 100));
        return (
          <div className="flex w-44 items-center gap-2">
            <ProgressBar value={progressValue} />
            <span className="w-12 text-right text-xs text-text-secondary">{formatPercent(progressValue)}</span>
          </div>
        );
      },
    },
    {
      key: 'seeders',
      header: 'Seeders',
      render: torrent => (
        <span>{typeof torrent.seeders === 'number' ? torrent.seeders.toLocaleString() : '-'}</span>
      ),
    },
    {
      key: 'size',
      header: 'Size',
      render: torrent => formatBytes(Number(torrent.size)),
    },
    {
      key: 'downloadSpeed',
      header: '↓ Speed',
      render: torrent => formatSpeed(torrent.downloadSpeed),
    },
    {
      key: 'uploadSpeed',
      header: '↑ Speed',
      render: torrent => formatSpeed(torrent.uploadSpeed),
    },
    {
      key: 'eta',
      header: 'ETA',
      render: torrent => formatTimeRemaining(torrent.eta ?? undefined),
    },
  ];

  const rowActions = (torrent: TorrentItem) => {
    const isPaused = normalizeQueueStatus(torrent.status) === 'paused';
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={() => handlePauseResume(torrent)}
          aria-label={isPaused ? 'Resume torrent' : 'Pause torrent'}
        >
          {isPaused ? <Play size={14} /> : <Pause size={14} />}
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleRetryImport(torrent)}
          disabled={retryingInfoHash === torrent.infoHash}
          aria-label="Retry import"
        >
          <RotateCcw size={14} />
        </Button>
        <Button
          variant="danger"
          onClick={() => setRemovingItem(torrent)}
          aria-label="Remove torrent"
        >
          <Trash2 size={14} />
        </Button>
      </div>
    );
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <RouteScaffold
      title="Queue"
      description="Unified download queue across all monitored media."
    >
      <div className="flex flex-col gap-6">
        {/* Global Speed Limits */}
        <section className="rounded-md border border-border-subtle bg-surface-1 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Settings2 size={18} className="text-text-secondary" />
            <h2 className="text-sm font-semibold">Global Speed Limits</h2>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="dl-limit" className="text-xs text-text-secondary">Download Limit (KB/s)</label>
              <input
                id="dl-limit"
                type="number"
                min="0"
                value={downloadLimit}
                onChange={(e) => setDownloadLimit(Number(e.target.value))}
                className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm w-32"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="ul-limit" className="text-xs text-text-secondary">Upload Limit (KB/s)</label>
              <input
                id="ul-limit"
                type="number"
                min="0"
                value={uploadLimit}
                onChange={(e) => setUploadLimit(Number(e.target.value))}
                className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm w-32"
              />
            </div>
            <Button
              variant="secondary"
              onClick={handleUpdateLimits}
              disabled={isUpdatingLimits}
            >
              {isUpdatingLimits ? 'Updating...' : 'Apply Limits'}
            </Button>
            <span className="pb-2 text-xs text-text-secondary">Set to 0 for unlimited</span>
          </div>
        </section>

        {/* Queue Table */}
        <DataTable
          data={torrents}
          columns={columns}
          getRowId={t => t.infoHash}
          rowActions={rowActions}
          pagination={{
            page,
            totalPages,
            pageSize,
            onPrev: () => setPage(p => Math.max(1, p - 1)),
            onNext: () => setPage(p => Math.min(totalPages, p + 1)),
          }}
        />

        {error && <p className="text-sm text-status-error">{error}</p>}
        {!isLoading && torrents.length === 0 && (
          <div className="rounded-md border border-dashed border-border-subtle p-12 text-center">
            <p className="text-text-secondary">No active downloads in the queue.</p>
          </div>
        )}
      </div>

      {removingItem && (
        <QueueRemoveModal
          isOpen={true}
          itemTitle={removingItem.name}
          onClose={() => setRemovingItem(null)}
          onConfirm={handleRemoveConfirm}
          isConfirming={isRemoving}
        />
      )}
    </RouteScaffold>
  );
}
