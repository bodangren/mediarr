import type { RecentlyAddedItem } from '@/lib/api/dashboardApi';
import { Link } from 'react-router-dom';

interface RecentlyAddedWidgetProps {
  items: RecentlyAddedItem[];
  isLoading: boolean;
}

function detailPath(item: RecentlyAddedItem): string {
  return item.type === 'series'
    ? `/library/tv/${item.id}`
    : `/library/movies/${item.id}`;
}

function formatRelativeTime(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function RecentlyAddedWidget({ items, isLoading }: RecentlyAddedWidgetProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <h2 className="text-sm font-semibold mb-3">Recently Added</h2>
        <p className="text-xs text-text-secondary">Loading...</p>
      </div>
    );
  }

  const recentItems = items.slice(0, 8);

  if (recentItems.length === 0) {
    return (
      <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold">Recently Added</h2>
          <Link to="/activity/history" className="text-xs text-accent hover:underline">
            View All
          </Link>
        </div>
        <p className="text-xs text-text-secondary">
          Nothing added yet. New movies and shows appear here after a scan or import.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-semibold">Recently Added</h2>
        <Link to="/activity/history" className="text-xs text-accent hover:underline">
          View All
        </Link>
      </div>
      <div className="space-y-2">
        {recentItems.map((item) => (
          <Link
            key={`${item.type}-${item.id}`}
            to={detailPath(item)}
            className="flex items-start gap-2 py-1 hover:bg-surface-2 rounded-sm px-1 -mx-1"
          >
            <span className="mt-0.5 h-2 w-2 rounded-full flex-shrink-0 bg-status-completed" />
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate" title={item.title}>
                {item.title}
              </p>
              <p className="text-[10px] text-text-secondary">
                {item.type === 'series' ? 'TV show' : 'Movie'} ·{' '}
                {formatRelativeTime(item.added)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
