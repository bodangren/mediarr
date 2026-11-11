import { useCallback, useEffect, useMemo, useState } from 'react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { Button } from '@/components/ui/button';
import { QueuePanel } from '@/components/youtube/QueuePanel';
import { RetentionPanel } from '@/components/youtube/RetentionPanel';
import { SubscriptionsPanel } from '@/components/youtube/SubscriptionsPanel';
import { errorText, FeedbackLine, useConfirmAction, useFeedbackMap } from '@/components/youtube/manageShared';
import { getApiClients } from '@/lib/api/client';
import type { YoutubeQueue, YoutubeVideo } from '@/lib/api/youtubeApi';

type Tab = 'library' | 'subscriptions' | 'queue' | 'retention';

function duration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return '';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * YouTube library section (track feature_youtube_library_20261107).
 *
 * Groups downloaded subscription videos by channel and plays them inline through the library's own
 * stream endpoint; a watched item stays visible (retention removes it after 7 days, Phase 3).
 *
 * Track feature_spa_management_surfaces_20261111 adds the management surfaces the server already
 * exposes: subscription CRUD/poll, queue retry/download/remove, file deletion and retention
 * restore/purge. Every destructive action confirms with the exact title/path.
 */
export function YoutubeLibraryPage() {
  const api = useMemo(() => getApiClients(), []);
  const youtube = api.youtubeApi;
  const [videos, setVideos] = useState<YoutubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<YoutubeVideo | null>(null);
  const [queue, setQueue] = useState<YoutubeQueue | null>(null);
  const [tab, setTab] = useState<Tab>('library');
  const { feedback, show } = useFeedbackMap();
  const { confirm, dialog } = useConfirmAction();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const refreshLibrary = useCallback(async () => {
    try {
      // Fetch the whole library (API caps at 500): the default 200 hid videos while the queue
      // card counted all 299 available (2026-11-09).
      const result = await youtube.listVideos(500);
      setVideos(result.items);
      setError(null);
    } catch (err) {
      setError(errorText(err, 'Failed to load YouTube videos'));
    }
  }, [youtube]);

  const refreshQueue = useCallback(async () => {
    try {
      setQueue(await youtube.getQueue());
    } catch {
      setQueue(null);
    }
  }, [youtube]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const result = await youtube.listVideos(500);
        if (!cancelled) setVideos(result.items);
      } catch (err) {
        if (!cancelled) setError(errorText(err, 'Failed to load YouTube videos'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    const loadQueue = async () => {
      try {
        const summary = await youtube.getQueue();
        if (!cancelled) setQueue(summary);
      } catch {
        if (!cancelled) setQueue(null);
      }
    };
    void loadQueue();
    return () => { cancelled = true; };
  }, [youtube]);

  const refreshAfterQueueChange = useCallback(() => {
    void refreshQueue();
    void refreshLibrary();
  }, [refreshQueue, refreshLibrary]);

  const channels = useMemo(() => {
    const groups = new Map<string, YoutubeVideo[]>();
    for (const video of videos) {
      const key = video.channel ?? 'Uncategorized';
      groups.set(key, [...(groups.get(key) ?? []), video]);
    }
    return [...groups.entries()];
  }, [videos]);

  const askDeleteFile = (video: YoutubeVideo) => {
    confirm({
      title: `Delete the downloaded file for “${video.title}”?`,
      confirmLabel: 'Delete file',
      description: (
        <div className="space-y-2">
          <p className="break-all font-mono text-xs text-text-primary">{video.path ?? 'path not recorded'}</p>
          <p>The queue row stays as DELETED; the video disappears from this library. This cannot be undone.</p>
        </div>
      ),
      run: async () => {
        setDeletingId(video.id);
        show('library', null);
        try {
          const result = await youtube.deleteVideoFile(video.id);
          setVideos((previous) => previous.filter((row) => row.id !== video.id));
          setPlaying((previous) => (previous?.id === video.id ? null : previous));
          show('library', { kind: 'success', text: `Deleted ${result.path ?? 'the file'} for “${video.title}”.` });
          await refreshQueue();
        } catch (err) {
          show('library', {
            kind: 'error',
            text: errorText(err, `Failed to delete the file for “${video.title}”`),
          });
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'library', label: 'Library' },
    { key: 'subscriptions', label: 'Subscriptions' },
    { key: 'queue', label: queue ? `Queue (${queue.pending + queue.downloading + queue.failed})` : 'Queue' },
    { key: 'retention', label: 'Retention' },
  ];

  return (
    <RouteScaffold
      title="YouTube"
      description="Downloaded channels and videos, with subscriptions, queue and retention management"
    >
      {dialog}
      <div role="tablist" aria-label="YouTube sections" className="flex flex-wrap gap-1 border-b border-border-subtle pb-1">
        {tabs.map((item) => {
          const selected = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              id={`youtube-tab-${item.key}`}
              aria-selected={selected}
              aria-controls={`youtube-panel-${item.key}`}
              onClick={() => setTab(item.key)}
              className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${selected ? 'bg-white text-black' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'library' ? (
        <section
          role="tabpanel"
          id="youtube-panel-library"
          aria-labelledby="youtube-tab-library"
          className="space-y-6"
        >
          {queue ? (
            <section aria-label="YouTube download queue" className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-sm bg-accent-success/20 px-2 py-1 text-xs font-medium text-accent-success">{queue.available} available</span>
              <span className="rounded-sm bg-surface-2 px-2 py-1 text-xs font-medium text-text-secondary">{queue.pending} pending</span>
              {queue.downloading > 0 ? (
                <span className="rounded-sm bg-accent-info/20 px-2 py-1 text-xs font-medium text-accent-info">{queue.downloading} downloading</span>
              ) : null}
              {queue.retrying > 0 ? (
                <span className="rounded-sm bg-accent-warning/20 px-2 py-1 text-xs font-medium text-accent-warning">{queue.retrying} retrying</span>
              ) : null}
              {queue.exhausted > 0 ? (
                <span className="rounded-sm bg-accent-danger/20 px-2 py-1 text-xs font-medium text-accent-danger">{queue.exhausted} on weekly retry</span>
              ) : null}
              {queue.quarantined > 0 ? (
                <span className="rounded-sm bg-surface-2 px-2 py-1 text-xs font-medium text-text-secondary">{queue.quarantined} quarantined</span>
              ) : null}
              <span className="text-xs text-text-muted">downloads run every 20 minutes</span>
              <Button variant="ghost" size="xs" onClick={() => setTab('queue')}>Manage queue</Button>
            </section>
          ) : null}
          <FeedbackLine feedback={feedback.library} />
          {error ? (
            <p role="alert" className="rounded-md border border-accent-warning bg-surface-1 p-3 text-sm text-accent-warning">{error}</p>
          ) : null}

          {playing ? (
            <section className="space-y-2">
              <video controls autoPlay className="w-full rounded-lg border border-border bg-black" src={playing.streamUrl} />
              <button type="button" className="text-sm text-accent-primary" onClick={() => setPlaying(null)}>Close player</button>
            </section>
          ) : null}

          {isLoading && videos.length === 0 ? <p className="text-sm text-text-muted">Loading…</p> : null}
          {!isLoading && videos.length === 0 ? (
            <p className="text-sm text-text-muted">
              No downloaded videos yet — add a channel under Subscriptions and let the poller run.
            </p>
          ) : null}

          {channels.map(([channel, items]) => (
            <section key={channel} aria-label={channel} className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                {channel} ({items.length})
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((video) => (
                  <div
                    key={video.id}
                    className="flex flex-col gap-2 overflow-hidden rounded-lg border border-border bg-surface-1 p-2 hover:border-accent-primary"
                  >
                    <button
                      type="button"
                      onClick={() => setPlaying(video)}
                      className="flex gap-3 text-left"
                    >
                      <span className="relative block aspect-video w-40 shrink-0 overflow-hidden rounded bg-black">
                        <img src={video.thumbUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                        {duration(video.durationSeconds) ? (
                          <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 text-xs font-semibold text-white">
                            {duration(video.durationSeconds)}
                          </span>
                        ) : null}
                      </span>
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="line-clamp-2 text-sm font-medium text-text-primary" title={video.title}>
                          {video.title}
                        </span>
                        <span className="text-xs text-text-muted">
                          {[video.channel ?? 'Archive', video.isWatched ? 'watched' : null]
                              .filter((value): value is string => value !== null)
                              .join(' · ')}
                        </span>
                      </span>
                    </button>
                    <div className="flex justify-end">
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => askDeleteFile(video)}
                        disabled={deletingId === video.id}
                        aria-label={`Delete file for ${video.title}`}
                      >
                        {deletingId === video.id ? 'Deleting…' : 'Delete file'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </section>
      ) : null}

      {tab === 'subscriptions' ? (
        <div role="tabpanel" id="youtube-panel-subscriptions" aria-labelledby="youtube-tab-subscriptions">
          <SubscriptionsPanel api={youtube} onChanged={refreshAfterQueueChange} />
        </div>
      ) : null}

      {tab === 'queue' ? (
        <div role="tabpanel" id="youtube-panel-queue" aria-labelledby="youtube-tab-queue">
          <QueuePanel
            api={youtube}
            summary={queue}
            onChanged={refreshAfterQueueChange}
            onOpenRetention={() => setTab('retention')}
          />
        </div>
      ) : null}

      {tab === 'retention' ? (
        <div role="tabpanel" id="youtube-panel-retention" aria-labelledby="youtube-tab-retention">
          <RetentionPanel api={youtube} onChanged={refreshAfterQueueChange} />
        </div>
      ) : null}
    </RouteScaffold>
  );
}
