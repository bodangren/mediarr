import { formatEpisodeCode } from '@/lib/format';
import type { UpcomingItem } from '@/lib/api/dashboardApi';
import { Link } from 'react-router-dom';

interface UpcomingWidgetProps {
  items: UpcomingItem[];
  isLoading: boolean;
}

function formatUpcomingDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (itemDate.getTime() === today.getTime()) return 'Today';
  if (itemDate.getTime() === tomorrow.getTime()) return 'Tomorrow';
  
  const diffDays = Math.floor((itemDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  }
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function UpcomingWidget({ items, isLoading }: UpcomingWidgetProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <h3 className="text-sm font-semibold mb-3">Upcoming</h3>
        <p className="text-xs text-text-secondary">Loading...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold">Upcoming</h3>
          <Link to="/calendar" className="text-xs text-accent hover:underline">
            Calendar
          </Link>
        </div>
        <p className="text-xs text-text-secondary">No upcoming releases in the next 7 days.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold">Upcoming</h3>
        <Link to="/calendar" className="text-xs text-accent hover:underline">
          Calendar
        </Link>
      </div>
      <div className="space-y-2">
        {items.slice(0, 6).map((item) => (
          <div key={`${item.type}-${item.id}`} className="flex items-start gap-2 py-1">
            <span
              className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${
                item.status === 'downloaded'
                  ? 'bg-status-completed'
                  : item.status === 'airing'
                  ? 'bg-accent-info'
                  : item.status === 'missing'
                  ? 'bg-status-error'
                  : 'bg-text-secondary'
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate" title={item.title}>
                {item.type === 'movie' ? (
                  <Link to={`/library/movies/${item.id}`} className="hover:underline">
                    {item.title}
                  </Link>
                ) : (
                  <Link to={`/library/series/${item.id}`} className="hover:underline">
                    {item.title}
                  </Link>
                )}
              </p>
              {item.type === 'episode' && item.episodeTitle && (
                <p className="text-[10px] text-text-secondary truncate" title={item.episodeTitle}>
                  {formatEpisodeCode(item.seasonNumber!, item.episodeNumber!)} - {item.episodeTitle}
                </p>
              )}
            </div>
            <span className="text-[10px] text-text-secondary flex-shrink-0">
              {formatUpcomingDate(item.date)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
