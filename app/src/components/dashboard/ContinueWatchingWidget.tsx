import { Link } from 'react-router-dom';
import type { ContinueWatchingItem } from '@/lib/api/dashboardApi';

interface ContinueWatchingWidgetProps {
  items: ContinueWatchingItem[];
  isLoading: boolean;
}

function buildDetailLink(item: ContinueWatchingItem): string {
  if (item.mediaType === 'MOVIE') {
    return `/library/movies/${item.mediaId}?resume=${item.position}`;
  }

  if (item.seriesId) {
    return `/library/series/${item.seriesId}?resumeEpisodeId=${item.mediaId}&resumePosition=${item.position}`;
  }

  return '/library/series';
}

function formatEpisodeLabel(item: ContinueWatchingItem): string | null {
  if (!item.episodeTitle) {
    return null;
  }

  if (item.seasonNumber == null || item.episodeNumber == null) {
    return item.episodeTitle;
  }

  const season = String(item.seasonNumber).padStart(2, '0');
  const episode = String(item.episodeNumber).padStart(2, '0');
  return `S${season}E${episode} - ${item.episodeTitle}`;
}

export function ContinueWatchingWidget({ items, isLoading }: ContinueWatchingWidgetProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <h2 className="mb-3 text-sm font-semibold">Continue Watching</h2>
        <p className="text-xs text-text-secondary">Loading...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <h2 className="mb-3 text-sm font-semibold">Continue Watching</h2>
        <p className="text-xs text-text-secondary">Nothing in progress.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
      <h2 className="mb-3 text-sm font-semibold">Continue Watching</h2>
      <div className="space-y-3">
        {items.slice(0, 6).map((item) => {
          const progress = Math.max(0, Math.min(100, Math.round(item.progress * 100)));
          const episodeLabel = formatEpisodeLabel(item);
          return (
            <Link
              key={`${item.mediaType}-${item.mediaId}`}
              to={buildDetailLink(item)}
              className="block rounded-sm border border-border-subtle bg-surface-2 p-2 hover:bg-surface-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-xs font-medium" title={item.title}>{item.title}</p>
                <span className="text-[10px] text-text-secondary">{progress}%</span>
              </div>
              {episodeLabel && (
                <p className="mt-0.5 truncate text-[10px] text-text-secondary" title={episodeLabel}>
                  {episodeLabel}
                </p>
              )}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-1">
                <div className="h-full rounded-full bg-accent-primary" style={{ width: `${progress}%` }} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
