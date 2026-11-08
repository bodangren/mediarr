import { useEffect, useMemo, useState } from 'react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { getApiClients } from '@/lib/api/client';
import type { AdultItem } from '@/lib/api/adultLibraryApi';

/**
 * Adult library section (track feature_adult_library_20261107).
 *
 * A separate page, not a Movies tab: search, the review bucket surfaced openly, and inline playback
 * through the library's own stream endpoint.
 */
export function AdultLibraryPage() {
  const api = useMemo(() => getApiClients(), []);
  const [items, setItems] = useState<AdultItem[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [needsReview, setNeedsReview] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<AdultItem | null>(null);
  const pageSize = 24;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await api.adultLibraryApi.listItems({ q: query || undefined, page, pageSize });
        if (cancelled) return;
        setItems(result.items);
        setTotalCount(result.totalCount);
        setNeedsReview(result.needsReview);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load the library');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [api, query, page]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <RouteScaffold title="Adult" description="A separate library with its own root and review bucket">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            placeholder="Search title, filename or studio"
            className="w-full max-w-md rounded-md border border-border bg-surface-1 px-3 py-2 text-sm"
            aria-label="Search the adult library"
          />
          <span className="text-sm text-text-muted">
            {totalCount} item{totalCount === 1 ? '' : 's'}
            {needsReview > 0 ? ` · ${needsReview} need review` : ''}
          </span>
        </div>

        {error ? (
          <p role="alert" className="rounded-md border border-accent-warning bg-surface-1 p-3 text-sm text-accent-warning">{error}</p>
        ) : null}

        {playing ? (
          <section className="space-y-2">
            <video
              controls
              autoPlay
              className="w-full rounded-lg border border-border bg-black"
              src={api.adultLibraryApi.streamUrl(playing.id)}
              onTimeUpdate={(event) => {
                const video = event.currentTarget;
                if (video.duration > 0) {
                  void api.adultLibraryApi.reportProgress(playing.id, Math.trunc(video.currentTime), Math.trunc(video.duration));
                }
              }}
            />
            <button type="button" className="text-sm text-accent-primary" onClick={() => setPlaying(null)}>
              Close player
            </button>
          </section>
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPlaying(item)}
              className="flex flex-col items-start gap-1 rounded-lg border border-border bg-surface-1 p-3 text-left hover:border-accent-primary"
            >
              <span className="line-clamp-2 text-sm font-medium text-text-primary">
                {item.title ?? item.fileName}
              </span>
              <span className="text-xs text-text-muted">
                {[item.studio, item.quality, item.releaseDate].filter(Boolean).join(' · ') || '—'}
              </span>
              {item.needsReview ? (
                <span className="rounded bg-accent-warning/15 px-1.5 py-0.5 text-[11px] text-accent-warning">Needs review</span>
              ) : null}
            </button>
          ))}
        </div>

        {isLoading ? <p className="text-sm text-text-muted">Loading…</p> : null}
        {!isLoading && items.length === 0 ? <p className="text-sm text-text-muted">No items match.</p> : null}

        <div className="flex items-center gap-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded border border-border px-3 py-1 disabled:opacity-40">Previous</button>
          <span className="text-text-muted">Page {page} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded border border-border px-3 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>
    </RouteScaffold>
  );
}
