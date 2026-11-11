import { adultSectionTotals } from '@/lib/adultSections';
import { useEffect, useMemo, useState } from 'react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { getApiClients } from '@/lib/api/client';
import type { AdultDecisionItem, AdultItem, AdultRetentionDecision } from '@/lib/api/adultLibraryApi';

/** Cards always show something identifiable: parsed title, else the filename without extension/hash. */
function displayTitle(item: { title: string | null; fileName: string }): string {
  const title = item.title?.trim();
  if (title) return title;
  return item.fileName.replace(/\s*\[[^\]]+\]\s*/g, ' ').replace(/\.[a-z0-9]+$/i, '').trim() || item.fileName;
}

function watchedLabel(item: { lastPlayedAt: string | null }): string {
  if (!item.lastPlayedAt) return 'Watched';
  const played = new Date(item.lastPlayedAt);
  return Number.isNaN(played.getTime()) ? 'Watched' : `Watched ${played.toLocaleDateString()}`;
}

/**
 * Adult library section (track feature_adult_library_20261107).
 *
 * A separate page, not a Movies tab: search, the review bucket surfaced openly, and inline playback
 * through the library's own stream endpoint.
 *
 * Track feature_adult_retention_keep_delete_20261111 adds the owner's after-watching choice: watched
 * items offer Keep / Delete, and a "Needs a decision" strip lists watched items with no answer yet.
 */
export function AdultLibraryPage() {
  const api = useMemo(() => getApiClients(), []);
  const [items, setItems] = useState<AdultItem[]>([]);
  const [decisions, setDecisions] = useState<AdultDecisionItem[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [needsReview, setNeedsReview] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<number | null>(null);
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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await api.adultLibraryApi.listDecisions();
        if (!cancelled) setDecisions(result.items);
      } catch (err) {
        if (!cancelled) setDecisionError(err instanceof Error ? err.message : 'Failed to load decisions');
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [api]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  // Two labelled sections: review bucket and titled library. Reviews flagged the two being flattened
  // into one grid, which hid the point of having a review bucket.
  const ordered = [...items].sort((a, b) => {
    if (a.needsReview !== b.needsReview) return a.needsReview ? 1 : -1;
    return 0;
  });
  const reviewItems = ordered.filter((item) => item.needsReview);
  const libraryItems = ordered.filter((item) => !item.needsReview);
  const sectionTotals = adultSectionTotals({ totalCount, needsReview, pageSize });

  /**
   * One durable decision per item. Delete is the only destructive action, so it is confirmed once,
   * then the server quarantines the file; the row and the prompt disappear only after that succeeds.
   */
  const handleDecision = async (
    item: { id: number; title: string | null; fileName: string },
    decision: AdultRetentionDecision,
  ) => {
    if (decision === 'delete') {
      const confirmed = window.confirm(
        `Delete “${displayTitle(item)}”? It moves to quarantine, then is permanently removed.`,
      );
      if (!confirmed) return;
    }
    setDecidingId(item.id);
    setDecisionError(null);
    try {
      await api.adultLibraryApi.decide(item.id, decision);
      setDecisions((previous) => previous.filter((row) => row.id !== item.id));
      if (decision === 'delete') {
        setItems((previous) => previous.filter((row) => row.id !== item.id));
        setTotalCount((count) => Math.max(0, count - 1));
        setPlaying((previous) => (previous?.id === item.id ? null : previous));
      } else {
        setItems((previous) => previous.map((row) => (row.id === item.id ? { ...row, keep: true } : row)));
      }
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : 'Failed to record the decision');
    } finally {
      setDecidingId(null);
    }
  };

  const renderCard = (item: AdultItem) => (
    <div
      key={item.id}
      className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface-1 hover:border-accent-primary"
    >
      <button type="button" onClick={() => setPlaying(item)} className="flex flex-col items-start gap-1 text-left">
        <span className="block aspect-video w-full overflow-hidden bg-black">
          {item.thumbUrl ? (
            <img
              src={item.thumbUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs text-text-muted">
              No preview
            </span>
          )}
        </span>
        <span className="line-clamp-2 w-full px-3 pt-2 text-sm font-medium text-text-primary">
          {displayTitle(item)}
        </span>
        <span className="w-full px-3 text-xs text-text-muted">
          {[item.studio, item.quality, item.releaseDate].filter(Boolean).join(' · ') || 'No metadata'}
        </span>
        {item.needsReview ? (
          <span className="mx-3 mb-3 rounded bg-accent-warning/15 px-1.5 py-0.5 text-[11px] text-accent-warning">Needs review</span>
        ) : null}
      </button>
      {item.isWatched ? (
        <div className="flex items-center gap-2 px-3 pb-3 pt-1">
          {item.keep ? (
            <span className="rounded bg-accent-primary/15 px-1.5 py-0.5 text-[11px] text-accent-primary">Kept</span>
          ) : (
            <button
              type="button"
              aria-label={`Keep ${displayTitle(item)}`}
              disabled={decidingId === item.id}
              onClick={() => void handleDecision(item, 'keep')}
              className="rounded-md border border-border px-3 py-1 text-xs hover:border-accent-primary disabled:opacity-40"
            >
              Keep
            </button>
          )}
          <button
            type="button"
            aria-label={`Delete ${displayTitle(item)}`}
            disabled={decidingId === item.id}
            onClick={() => void handleDecision(item, 'delete')}
            className="rounded-md border border-accent-warning/60 px-3 py-1 text-xs text-accent-warning disabled:opacity-40"
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );

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
        {decisionError ? (
          <p role="alert" className="rounded-md border border-accent-warning bg-surface-1 p-3 text-sm text-accent-warning">{decisionError}</p>
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

        {decisions.length > 0 ? (
          <section aria-label="Needs a decision" className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-accent-primary">
              Needs a decision ({decisions.length})
            </h2>
            <p className="text-sm text-text-muted">Watched, with no keep/delete choice yet.</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {decisions.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface-1 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">{displayTitle(item)}</p>
                    <p className="text-xs text-text-muted">
                      {[item.studio, item.quality].filter(Boolean).join(' · ') || 'No metadata'}
                      {` · ${watchedLabel(item)}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Keep ${displayTitle(item)}`}
                    disabled={decidingId === item.id}
                    onClick={() => void handleDecision(item, 'keep')}
                    className="rounded-md border border-border px-3 py-1 text-sm hover:border-accent-primary disabled:opacity-40"
                  >
                    Keep
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${displayTitle(item)}`}
                    disabled={decidingId === item.id}
                    onClick={() => void handleDecision(item, 'delete')}
                    className="rounded-md border border-accent-warning/60 px-3 py-1 text-sm text-accent-warning disabled:opacity-40"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {reviewItems.length > 0 ? (
          <section aria-label="Needs review" className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-accent-warning">
              Needs review ({sectionTotals.review})
              {sectionTotals.paginated ? <span className="ml-1 font-normal normal-case text-text-muted">· showing this page</span> : null}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {reviewItems.map((item) => renderCard(item))}
            </div>
          </section>
        ) : null}

        {libraryItems.length > 0 ? (
          <section aria-label="Library" className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              Library ({sectionTotals.library})
              {sectionTotals.paginated ? <span className="ml-1 font-normal text-text-muted">· showing this page</span> : null}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {libraryItems.map((item) => renderCard(item))}
            </div>
          </section>
        ) : null}


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
