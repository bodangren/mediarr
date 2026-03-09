import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiClients } from '@/lib/api/client';
import { formatBytes } from '@/lib/format';
import type { LibraryStats, QualityBreakdown } from '@/lib/api/statsApi';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-text-secondary">{sub}</p> : null}
    </div>
  );
}

const QUALITY_LABELS: Record<keyof QualityBreakdown, string> = {
  uhd4k: '4K / UHD',
  hd1080p: '1080p',
  hd720p: '720p',
  sd: 'SD',
  unknown: 'Unknown',
};

const QUALITY_COLORS: Record<keyof QualityBreakdown, string> = {
  uhd4k: 'bg-purple-500',
  hd1080p: 'bg-blue-500',
  hd720p: 'bg-green-500',
  sd: 'bg-yellow-500',
  unknown: 'bg-gray-500',
};

function QualityBar({ breakdown, total }: { breakdown: QualityBreakdown; total: number }) {
  if (total === 0) {
    return <p className="text-sm text-text-secondary">No files</p>;
  }

  const keys = Object.keys(breakdown) as Array<keyof QualityBreakdown>;

  return (
    <div className="space-y-2">
      <div className="flex h-3 overflow-hidden rounded-full">
        {keys.map(key => {
          const pct = total > 0 ? (breakdown[key] / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={key}
              className={QUALITY_COLORS[key]}
              style={{ width: `${pct}%` }}
              title={`${QUALITY_LABELS[key]}: ${breakdown[key]}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {keys.map(key => {
          const count = breakdown[key];
          if (count === 0) return null;
          const pct = Math.round((count / total) * 100);
          return (
            <span key={key} className="flex items-center gap-1.5 text-xs text-text-secondary">
              <span className={`inline-block h-2 w-2 rounded-full ${QUALITY_COLORS[key]}`} />
              {QUALITY_LABELS[key]}: {count} ({pct}%)
            </span>
          );
        })}
      </div>
    </div>
  );
}

function StorageBar({ movieBytes, episodeBytes }: { movieBytes: number; episodeBytes: number }) {
  const total = movieBytes + episodeBytes;
  if (total === 0) {
    return <p className="text-sm text-text-secondary">No files indexed</p>;
  }
  const moviePct = (movieBytes / total) * 100;
  const episodePct = (episodeBytes / total) * 100;
  return (
    <div className="space-y-2">
      <div className="flex h-3 overflow-hidden rounded-full">
        <div className="bg-blue-500" style={{ width: `${moviePct}%` }} title={`Movies: ${formatBytes(movieBytes)}`} />
        <div className="bg-green-500" style={{ width: `${episodePct}%` }} title={`TV Episodes: ${formatBytes(episodeBytes)}`} />
      </div>
      <div className="flex gap-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
          Movies: {formatBytes(movieBytes)} ({Math.round(moviePct)}%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          TV Episodes: {formatBytes(episodeBytes)} ({Math.round(episodePct)}%)
        </span>
      </div>
    </div>
  );
}

export function StatsPage() {
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const api = getApiClients();
    api.statsApi
      .getStats()
      .then(data => {
        setStats(data);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <RouteScaffold
      title="Statistics"
      description="Library composition, quality distribution, storage usage, and activity metrics."
    >
      {loading ? (
        <div className="rounded-md border border-border-subtle bg-surface-1 p-8 text-center text-text-secondary">
          Loading statistics…
        </div>
      ) : error ? (
        <div className="rounded-md border border-border-subtle bg-surface-1 p-8 text-center text-status-danger">
          {error}
        </div>
      ) : stats ? (
        <div className="space-y-4">
          {/* Library counts */}
          <section>
            <h2 className="mb-3 text-sm font-medium text-text-secondary uppercase tracking-wide">Library</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Movies" value={stats.library.totalMovies} sub={`${stats.library.monitoredMovies} monitored`} />
              <StatCard label="TV Shows" value={stats.library.totalSeries} sub={`${stats.library.monitoredSeries} monitored`} />
              <StatCard label="Episodes" value={stats.library.totalEpisodes.toLocaleString()} sub={`${stats.library.monitoredEpisodes.toLocaleString()} monitored`} />
              <StatCard label="Total Files" value={stats.files.totalFiles.toLocaleString()} sub={formatBytes(stats.files.totalSizeBytes)} />
            </div>
          </section>

          {/* Storage breakdown */}
          <section className="rounded-md border border-border-subtle bg-surface-1 p-4">
            <h2 className="mb-3 text-sm font-semibold">Storage Usage</h2>
            <p className="mb-3 text-2xl font-semibold tabular-nums">{formatBytes(stats.files.totalSizeBytes)}</p>
            <StorageBar movieBytes={stats.files.movieSizeBytes} episodeBytes={stats.files.episodeSizeBytes} />
          </section>

          {/* Quality distribution */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <section className="rounded-md border border-border-subtle bg-surface-1 p-4">
              <h2 className="mb-3 text-sm font-semibold">Movie Quality</h2>
              <p className="mb-3 text-sm text-text-secondary">{stats.files.movieFiles} files</p>
              <QualityBar breakdown={stats.quality.movies} total={stats.files.movieFiles} />
            </section>
            <section className="rounded-md border border-border-subtle bg-surface-1 p-4">
              <h2 className="mb-3 text-sm font-semibold">Episode Quality</h2>
              <p className="mb-3 text-sm text-text-secondary">{stats.files.episodeFiles} files</p>
              <QualityBar breakdown={stats.quality.episodes} total={stats.files.episodeFiles} />
            </section>
          </div>

          {/* Missing media */}
          <section>
            <h2 className="mb-3 text-sm font-medium text-text-secondary uppercase tracking-wide">Missing Media</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
                <p className="text-sm text-text-secondary">Missing Movies</p>
                <p className={`mt-1 text-2xl font-semibold tabular-nums ${stats.missing.movies > 0 ? 'text-status-warning' : 'text-status-success'}`}>
                  {stats.missing.movies}
                </p>
                {stats.missing.movies > 0 ? (
                  <Link to="/library/movies" className="mt-1 text-xs text-accent-primary hover:underline">
                    View library →
                  </Link>
                ) : (
                  <p className="mt-0.5 text-xs text-text-secondary">All caught up</p>
                )}
              </div>
              <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
                <p className="text-sm text-text-secondary">Missing Episodes</p>
                <p className={`mt-1 text-2xl font-semibold tabular-nums ${stats.missing.episodes > 0 ? 'text-status-warning' : 'text-status-success'}`}>
                  {stats.missing.episodes.toLocaleString()}
                </p>
                {stats.missing.episodes > 0 ? (
                  <Link to="/library/tv" className="mt-1 text-xs text-accent-primary hover:underline">
                    View library →
                  </Link>
                ) : (
                  <p className="mt-0.5 text-xs text-text-secondary">All caught up</p>
                )}
              </div>
            </div>
          </section>

          {/* Activity */}
          <section>
            <h2 className="mb-3 text-sm font-medium text-text-secondary uppercase tracking-wide">Recent Activity</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Downloads (7d)" value={stats.activity.downloadsThisWeek} />
              <StatCard label="Downloads (30d)" value={stats.activity.downloadsThisMonth} />
              <StatCard label="Searches (7d)" value={stats.activity.searchesThisWeek} />
              <StatCard label="Subtitles (7d)" value={stats.activity.subtitlesThisWeek} />
            </div>
          </section>
        </div>
      ) : null}
    </RouteScaffold>
  );
}
