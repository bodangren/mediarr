import { Link } from 'react-router-dom';
import { formatSpeed } from '@/lib/format';
import type { TorrentItem } from '@/lib/api/torrentApi';

interface ActiveDownloadsWidgetProps {
  torrents: TorrentItem[];
  isLoading: boolean;
}

export function ActiveDownloadsWidget({ torrents, isLoading }: ActiveDownloadsWidgetProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <h3 className="text-sm font-semibold mb-3">Active Downloads</h3>
        <p className="text-xs text-text-secondary">Loading...</p>
      </div>
    );
  }

  const activeTorrents = torrents.filter(
    (t) => t.status === 'downloading' || t.status === 'seeding'
  );

  if (activeTorrents.length === 0) {
    return (
      <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold">Active Downloads</h3>
          <Link to="/activity/queue" className="text-xs text-accent hover:underline">
            Queue
          </Link>
        </div>
        <p className="text-xs text-text-secondary">No active downloads.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold">Active Downloads</h3>
        <Link to="/activity/queue" className="text-xs text-accent hover:underline">
          Queue
        </Link>
      </div>
      <div className="space-y-3">
        {activeTorrents.slice(0, 4).map((torrent) => (
          <div key={torrent.infoHash} className="space-y-1">
            <div className="flex justify-between items-start gap-2">
              <p className="text-xs truncate flex-1" title={torrent.name}>
                {torrent.name}
              </p>
              <span className="text-[10px] text-text-secondary flex-shrink-0">
                {Math.round((torrent.progress ?? 0) * 100)}%
              </span>
            </div>
            <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  torrent.status === 'seeding'
                    ? 'bg-status-completed'
                    : 'bg-accent-primary'
                }`}
                style={{ width: `${(torrent.progress ?? 0) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-text-secondary">
              <span className={torrent.status === 'downloading' ? 'text-accent-primary' : ''}>
                {formatSpeed(torrent.downloadSpeed ?? 0)}
              </span>
              <span className="capitalize">{torrent.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
