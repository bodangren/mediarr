import { Link } from 'react-router-dom';
import type { SimilarTitle } from '@/lib/api/similarTitles';
import { RowActionMenu, RowActionMenuItem } from '@/components/ui/row-action-menu';

/**
 * "More like this" for movie/series detail pages (owner request 2026-11-28): TMDB similar titles with
 * availability, and a context menu to request a missing one from the same screen.
 */
export function SimilarTitlesSection(props: {
  heading: string;
  items: SimilarTitle[];
  isLoading?: boolean;
  error?: string | null;
  /** Movies can be requested directly; series go through the search screen (TVDB identity). */
  onRequestMovie?: (item: SimilarTitle) => void;
  onSearchTitle?: (item: SimilarTitle) => void;
}) {
  const { heading, items, isLoading, error } = props;
  if (isLoading) {
    return (
      <section aria-label={heading} className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <h2 className="text-sm font-semibold text-text-primary">{heading}</h2>
        <p className="mt-2 text-xs text-text-muted">Loading similar titles…</p>
      </section>
    );
  }
  if (error) {
    return (
      <section aria-label={heading} className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <h2 className="text-sm font-semibold text-text-primary">{heading}</h2>
        <p role="status" className="mt-2 text-xs text-text-muted">{error}</p>
      </section>
    );
  }
  if (items.length === 0) return null;

  return (
    <section aria-label={heading} className="rounded-md border border-border-subtle bg-surface-1 p-4">
      <h2 className="text-sm font-semibold text-text-primary">{heading}</h2>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map(item => {
          const key = `${item.mediaType}-${item.tmdbId}`;
          const poster = item.posterUrl ?? '/images/placeholder-poster.png';
          return (
            <li key={key} className="flex flex-col gap-1 rounded-md border border-border-subtle bg-surface-0 p-2">
              <div className="relative">
                <img
                  src={poster}
                  alt=""
                  aria-hidden="true"
                  className="aspect-[2/3] w-full rounded object-cover"
                  onError={event => { event.currentTarget.src = '/images/placeholder-poster.png'; }}
                />
                <span
                  className={`absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    item.inLibrary ? 'bg-status-completed/90 text-black' : 'bg-status-error/90 text-white'
                  }`}
                >
                  {item.inLibrary ? 'In library' : 'Missing'}
                </span>
              </div>
              <span className="line-clamp-2 text-xs font-medium text-text-primary" title={item.title}>
                {item.title}
              </span>
              <span className="text-[11px] text-text-muted">
                {item.year ?? '—'}{item.voteAverage != null ? ` · ★ ${item.voteAverage.toFixed(1)}` : ''}
              </span>
              {item.inLibrary && item.libraryId != null ? (
                <Link
                  to={item.mediaType === 'MOVIE' ? `/library/movies/${item.libraryId}` : `/library/series/${item.libraryId}`}
                  className="text-[11px] text-accent-primary hover:underline"
                >
                  Open in library
                </Link>
              ) : (
                <RowActionMenu label={`${item.title} actions`} className="w-fit">
                  {item.mediaType === 'MOVIE' && props.onRequestMovie ? (
                    <RowActionMenuItem variant="primary" onSelect={() => props.onRequestMovie?.(item)}>
                      Request movie
                    </RowActionMenuItem>
                  ) : null}
                  {props.onSearchTitle ? (
                    <RowActionMenuItem onSelect={() => props.onSearchTitle?.(item)}>
                      Search &amp; add
                    </RowActionMenuItem>
                  ) : null}
                </RowActionMenu>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
