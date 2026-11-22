import { Link } from 'react-router-dom';
import type { NextUpItem } from '@/lib/api/dashboardApi';

interface NextUpWidgetProps {
  items: NextUpItem[];
  isLoading: boolean;
}

/**
 * Series-level "Next up" — owner request 2026-11-22: *"there should be an 'In progress' or 'Next up'
 * section which lists all the partially watched series and shows the next episode up in the series.
 * Listed from most recently watched first."*
 *
 * Unlike Continue Watching (partially played episodes), each card is a series and the episode it is
 * up to; the engine orders them by last watch activity.
 */
function episodeLabel(item: NextUpItem): string {
  const season = String(item.nextEpisode.seasonNumber).padStart(2, '0');
  const episode = String(item.nextEpisode.episodeNumber).padStart(2, '0');
  return `S${season}E${episode} · ${item.nextEpisode.title}`;
}

export function NextUpWidget({ items, isLoading }: NextUpWidgetProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <h2 className="mb-3 text-sm font-semibold">Next up</h2>
        <p className="text-xs text-text-secondary">Loading...</p>
      </div>
    );
  }

  // The owner asked for a section that lists in-progress series; with nothing in progress the
  // section disappears rather than showing an empty box.
  if (items.length === 0) return null;

  return (
    <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Next up</h2>
        <span className="text-[10px] text-text-secondary">partially watched series, most recent first</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.slice(0, 8).map((item) => (
          <Link
            key={`nextup-${item.seriesId}`}
            to={`/library/series/${item.seriesId}?resumeEpisodeId=${item.nextEpisode.episodeId}`}
            className="group overflow-hidden rounded-sm border border-border-subtle bg-surface-2 hover:bg-surface-3"
            aria-label={`Next up: ${item.title} ${episodeLabel(item)}`}
          >
            {item.posterUrl ? (
              <img
                src={item.posterUrl}
                alt=""
                loading="lazy"
                className="aspect-[2/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[2/3] w-full items-center justify-center bg-surface-3 text-xs text-text-secondary">
                no poster
              </div>
            )}
            <div className="p-2">
              <p className="truncate text-xs font-medium" title={item.title}>{item.title}</p>
              <p className="truncate text-[10px] text-text-secondary" title={episodeLabel(item)}>
                {episodeLabel(item)}
              </p>
              <p className="mt-1 text-[10px] text-text-secondary">
                {item.watchedCount}/{item.totalCount} watched
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
