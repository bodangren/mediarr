import type { ActivityItem } from '@/lib/api/activityApi';
import { Link } from 'react-router-dom';

interface RecentlyAddedWidgetProps {
  items: ActivityItem[];
  isLoading: boolean;
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
        <h3 className="text-sm font-semibold mb-3">Recently Added</h3>
        <p className="text-xs text-text-secondary">Loading...</p>
      </div>
    );
  }

  const recentItems = items
    .filter(
      (item) =>
        item.eventType === 'IMPORT_COMPLETED' ||
        item.eventType === 'MEDIA_ADDED' ||
        item.eventType === 'MOVIE_IMPORTED' ||
        item.eventType === 'SERIES_IMPORTED',
    )
    .slice(0, 8);

  if (recentItems.length === 0) {
    return (
      <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold">Recently Added</h3>
          <Link to="/activity/history" className="text-xs text-accent hover:underline">
            View All
          </Link>
        </div>
        <p className="text-xs text-text-secondary">No recent activity.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold">Recently Added</h3>
        <Link to="/activity/history" className="text-xs text-accent hover:underline">
          View All
        </Link>
      </div>
      <div className="space-y-2">
        {recentItems.map((item) => (
          <div key={item.id} className="flex items-start gap-2 py-1">
            <span
              className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${
                item.success === false ? 'bg-status-error' : 'bg-status-completed'
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate" title={item.summary}>
                {item.summary}
              </p>
              <p className="text-[10px] text-text-secondary">
                {formatRelativeTime(item.occurredAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
