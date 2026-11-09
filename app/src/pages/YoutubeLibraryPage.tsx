import { useEffect, useMemo, useState } from 'react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { getApiClients } from '@/lib/api/client';
import type { YoutubeQueue, YoutubeVideo } from '@/lib/api/youtubeApi';

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
 */
export function YoutubeLibraryPage() {
  const api = useMemo(() => getApiClients(), []);
  const [videos, setVideos] = useState<YoutubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<YoutubeVideo | null>(null);
  const [queue, setQueue] = useState<YoutubeQueue | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const result = await api.youtubeApi.listVideos();
        if (!cancelled) setVideos(result.items);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load YouTube videos');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    const loadQueue = async () => {
      try {
        const summary = await api.youtubeApi.getQueue();
        if (!cancelled) setQueue(summary);
      } catch {
        if (!cancelled) setQueue(null);
      }
    };
    void loadQueue();
    return () => { cancelled = true; };
  }, [api]);

  const channels = useMemo(() => {
    const groups = new Map<string, YoutubeVideo[]>();
    for (const video of videos) {
      const key = video.channel ?? 'Uncategorized';
      groups.set(key, [...(groups.get(key) ?? []), video]);
    }
    return [...groups.entries()];
  }, [videos]);

  return (
    <RouteScaffold title="YouTube" description="Downloaded channels and videos">
      <div className="space-y-6">
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
              <span className="rounded-sm bg-accent-danger/20 px-2 py-1 text-xs font-medium text-accent-danger">{queue.exhausted} exhausted</span>
            ) : null}
            {queue.quarantined > 0 ? (
              <span className="rounded-sm bg-surface-2 px-2 py-1 text-xs font-medium text-text-secondary">{queue.quarantined} quarantined</span>
            ) : null}
            <span className="text-xs text-text-muted">downloads run every 20 minutes</span>
          </section>
        ) : null}
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
          <p className="text-sm text-text-muted">No downloaded videos yet — add a channel under Settings and let the poller run.</p>
        ) : null}

        {channels.map(([channel, items]) => (
          <section key={channel} aria-label={channel} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              {channel} ({items.length})
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((video) => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => setPlaying(video)}
                  className="flex gap-3 overflow-hidden rounded-lg border border-border bg-surface-1 p-2 text-left hover:border-accent-primary"
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
              ))}
            </div>
          </section>
        ))}
      </div>
    </RouteScaffold>
  );
}
