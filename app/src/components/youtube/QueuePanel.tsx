import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { YoutubeApi, YoutubeQueue, YoutubeQueueItem } from '@/lib/api/youtubeApi';
import { errorText, FeedbackLine, useConfirmAction, useFeedbackMap, type Feedback } from './manageShared';

type QueueFilter = 'PENDING' | 'DOWNLOADING' | 'FAILED' | 'QUARANTINED';

interface QueuePanelProps {
  api: YoutubeApi;
  summary: YoutubeQueue | null;
  /** Refresh the page-level queue summary and library after a download/removal. */
  onChanged?: () => void;
  onOpenRetention?: () => void;
}

const FILTERS: Array<{ key: QueueFilter; label: string }> = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'DOWNLOADING', label: 'Downloading' },
  { key: 'FAILED', label: 'Failed' },
  { key: 'QUARANTINED', label: 'Quarantined' },
];

function countFor(summary: YoutubeQueue | null, filter: QueueFilter): number {
  if (!summary) return 0;
  return summary[filter.toLowerCase() as 'pending' | 'downloading' | 'failed' | 'quarantined'] ?? 0;
}

function retryHint(item: YoutubeQueueItem): string | null {
  if (item.status !== 'FAILED' || !item.retryAt) return null;
  const at = new Date(item.retryAt).getTime();
  if (!Number.isFinite(at)) return null;
  const hours = Math.ceil((at - Date.now()) / (60 * 60 * 1000));
  if (hours <= 0) return 'retry due now';
  if (hours < 24) return `retry in ${hours}h`;
  return `retry in ${Math.ceil(hours / 24)}d`;
}

function QueueRow({
  item,
  api,
  onChanged,
  onOpenRetention,
  onFeedback,
}: {
  item: YoutubeQueueItem;
  api: YoutubeApi;
  onChanged?: () => void;
  onOpenRetention?: () => void;
  onFeedback: (next: Feedback | null) => void;
}) {
  const { confirm, dialog } = useConfirmAction();
  const [isWorking, setIsWorking] = useState(false);
  const exhausted = item.status === 'FAILED' && item.attempts >= 3;
  const queueable = item.status === 'PENDING' || item.status === 'FAILED';

  const handleRetry = async () => {
    setIsWorking(true);
    onFeedback(null);
    try {
      await api.retryVideo(item.id);
      onFeedback({ kind: 'success', text: `Retry queued for “${item.title}”.` });
      onChanged?.();
    } catch (error) {
      onFeedback({ kind: 'error', text: errorText(error, 'Failed to retry video') });
    } finally {
      setIsWorking(false);
    }
  };

  const handleDownloadNow = async () => {
    setIsWorking(true);
    onFeedback(null);
    try {
      const result = await api.downloadVideo(item.id);
      const failure = result.failed.find((row) => row.id === item.id);
      onFeedback(failure
        ? { kind: 'error', text: failure.error }
        : { kind: 'success', text: `Downloaded “${item.title}”.` });
      onChanged?.();
    } catch (error) {
      onFeedback({ kind: 'error', text: errorText(error, `Failed to download “${item.title}”`) });
    } finally {
      setIsWorking(false);
    }
  };

  const askRemove = () => {
    confirm({
      title: `Remove “${item.title}” from the queue?`,
      confirmLabel: 'Remove from queue',
      description: (
        <div className="space-y-2">
          <p className="break-all font-mono text-xs text-text-primary">{item.videoId}</p>
          <p>The queue row is retired and the upload is not downloaded again; no file is touched.</p>
        </div>
      ),
      run: async () => {
        try {
          await api.removeVideo(item.id);
          onFeedback({ kind: 'success', text: `Removed “${item.title}” from the queue.` });
          onChanged?.();
        } catch (error) {
          onFeedback({ kind: 'error', text: errorText(error, 'Failed to remove queue row') });
        }
      },
    });
  };

  return (
    <li className="space-y-2 p-4">
      {dialog}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium text-text-primary" title={item.title}>{item.title}</p>
          <p className="text-xs text-text-muted">
            {item.channel ?? 'Unknown channel'} · {item.videoId}
            {item.attempts > 0 ? ` · ${item.attempts} attempt${item.attempts === 1 ? '' : 's'}` : ''}
            {retryHint(item) ? ` · ${retryHint(item)}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-sm bg-surface-2 px-2 py-1 text-xs font-medium text-text-secondary">{item.status}</span>
          {exhausted ? (
            <span className="rounded-sm bg-accent-danger/20 px-2 py-1 text-xs font-medium text-accent-danger">retry budget spent</span>
          ) : null}
        </div>
      </div>

      {item.error ? (
        <p role="alert" className="break-words rounded-sm bg-accent-danger/10 p-2 text-xs text-accent-danger" title={item.error}>
          {item.error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {queueable ? (
          <>
            <Button variant="outline" size="xs" onClick={() => void handleDownloadNow()} disabled={isWorking}>
              {isWorking ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
              {isWorking ? 'Downloading…' : 'Download now'}
            </Button>
            {item.status === 'FAILED' ? (
              <Button variant="ghost" size="xs" onClick={() => void handleRetry()} disabled={isWorking}>
                Retry
              </Button>
            ) : null}
            <Button variant="destructive" size="xs" onClick={askRemove} disabled={isWorking}>
              Remove
            </Button>
          </>
        ) : null}
        {item.status === 'DOWNLOADING' ? (
          <span className="text-xs text-text-muted">A download worker has claimed this video.</span>
        ) : null}
        {item.status === 'QUARANTINED' && onOpenRetention ? (
          <Button variant="ghost" size="xs" onClick={onOpenRetention}>Restore or purge under Retention</Button>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Queue management: the same status buckets the page header shows, with the row-level actions the
 * server exposes (retry, download one now, drop the row). A download is CPU-bound, so batch controls
 * stay explicit and report the service receipt.
 */
export function QueuePanel({ api, summary, onChanged, onOpenRetention }: QueuePanelProps) {
  const [filter, setFilter] = useState<QueueFilter>('PENDING');
  const [items, setItems] = useState<YoutubeQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { feedback, show } = useFeedbackMap();
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const showRowFeedback = useCallback((next: Feedback | null) => {
    show('rows', next);
  }, [show]);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await api.listQueueItems(filter);
      setItems(result.items);
    } catch (error) {
      setItems([]);
      setLoadError(errorText(error, 'Failed to load the queue'));
    } finally {
      setIsLoading(false);
    }
  }, [api, filter]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleBatch = async () => {
    setIsBatchRunning(true);
    show('batch', null);
    try {
      const receipt = await api.downloadBatch(1);
      const failure = receipt.failed[0]?.error;
      show('batch', failure
        ? { kind: 'error', text: `Download failed: ${failure}` }
        : {
            kind: 'success',
            text: receipt.attempted === 0
              ? 'Nothing is pending to download.'
              : `Batch finished: ${receipt.downloaded}/${receipt.attempted} downloaded.`,
          });
      await reload();
      onChanged?.();
    } catch (error) {
      show('batch', { kind: 'error', text: errorText(error, 'Failed to run the download batch') });
    } finally {
      setIsBatchRunning(false);
    }
  };

  return (
    <section aria-label="YouTube download queue" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Queue status filter">
          {FILTERS.map((option) => {
            const selected = filter === option.key;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilter(option.key)}
                className={`rounded-sm px-3 py-1 text-xs font-medium transition-colors ${selected ? 'bg-white text-black' : 'bg-surface-2 text-text-secondary hover:text-text-primary'}`}
              >
                {option.label} ({countFor(summary, option.key)})
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="xs" onClick={() => void reload()} disabled={isLoading}>
            {isLoading ? 'Loading…' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleBatch()} disabled={isBatchRunning}>
            {isBatchRunning ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
            {isBatchRunning ? 'Downloading…' : 'Download next batch'}
          </Button>
        </div>
      </div>

      {summary?.throughput ? (
        <p className="text-xs text-text-muted">
          {summary.throughput.downloaded} downloaded in the last {summary.throughput.windowHours}h
          {' · '}{summary.throughput.perHour.toFixed(1)}/h
          {summary.throughput.etaHours != null ? ` · ~${summary.throughput.etaHours}h to drain the backlog` : ' · no recent downloads'}
        </p>
      ) : null}
      <FeedbackLine feedback={feedback.batch} />
      <FeedbackLine feedback={feedback.rows} />

      {loadError ? (
        <p role="alert" className="rounded-md border border-accent-danger/40 bg-surface-1 p-3 text-sm text-accent-danger">{loadError}</p>
      ) : null}
      {!isLoading && !loadError && items.length === 0 ? (
        <p className="text-sm text-text-muted">No {filter.toLowerCase()} videos in the queue.</p>
      ) : null}

      <ul className="divide-y divide-border-subtle overflow-hidden rounded-md border border-border-subtle bg-surface-1">
        {items.map((item) => (
          <QueueRow
            key={item.id}
            item={item}
            api={api}
            onFeedback={showRowFeedback}
            onChanged={async () => {
              await reload();
              onChanged?.();
            }}
            onOpenRetention={onOpenRetention}
          />
        ))}
      </ul>
    </section>
  );
}
