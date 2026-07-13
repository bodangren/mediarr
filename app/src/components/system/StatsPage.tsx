import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiClients } from '@/lib/api/client';
import { formatBytes } from '@/lib/format';
import type { LibraryStats, QualityBreakdown, DownloadStats, SystemStats } from '@/lib/api/statsApi';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

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
  uhd4k: '#a855f7',
  hd1080p: '#3b82f6',
  hd720p: '#22c55e',
  sd: '#eab308',
  unknown: '#6b7280',
};

function QualityPieChart({ breakdown, total }: { breakdown: QualityBreakdown; total: number }) {
  if (total === 0) {
    return <p className="text-sm text-text-secondary">No files</p>;
  }

  const data = Object.entries(breakdown)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({
      name: QUALITY_LABELS[key as keyof QualityBreakdown],
      value: count,
      color: QUALITY_COLORS[key as keyof QualityBreakdown],
    }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`${value ?? 0} files`, 'Count']}
          contentStyle={{
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
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

function DownloadBarChart({ stats }: { stats: DownloadStats }) {
  const data = [
    { name: 'Active', value: stats.activeDownloads, color: '#3b82f6' },
    { name: 'Completed', value: stats.completedDownloads, color: '#22c55e' },
    { name: 'Failed', value: stats.failedDownloads, color: '#ef4444' },
  ];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
          }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function DiskUsageBar({ disk }: { disk: { path: string; freeBytes: number; totalBytes: number; usedPercent: number } }) {
  const isWarning = disk.usedPercent > 85;
  const isCritical = disk.usedPercent > 95;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-text-secondary">{disk.path}</span>
        <span className={isCritical ? 'text-status-danger' : isWarning ? 'text-status-warning' : 'text-text-secondary'}>
          {disk.usedPercent}% used
        </span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`transition-all ${isCritical ? 'bg-status-danger' : isWarning ? 'bg-status-warning' : 'bg-accent-primary'}`}
          style={{ width: `${disk.usedPercent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-text-secondary">
        <span>{formatBytes(disk.totalBytes - disk.freeBytes)} used</span>
        <span>{formatBytes(disk.freeBytes)} free</span>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function exportStats(format: 'json' | 'csv', data: { library: LibraryStats | null; downloads: DownloadStats | null; system: SystemStats | null }) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  if (format === 'json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mediarr-stats-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    const rows: string[] = ['Category,Metric,Value'];
    
    if (data.library) {
      rows.push(`Library,Movies,${data.library.library.totalMovies}`);
      rows.push(`Library,TV Shows,${data.library.library.totalSeries}`);
      rows.push(`Library,Episodes,${data.library.library.totalEpisodes}`);
      rows.push(`Library,Total Files,${data.library.files.totalFiles}`);
      rows.push(`Library,Total Size,${data.library.files.totalSizeBytes}`);
      rows.push(`Library,Missing Movies,${data.library.missing.movies}`);
      rows.push(`Library,Missing Episodes,${data.library.missing.episodes}`);
    }
    
    if (data.downloads) {
      rows.push(`Downloads,Total Torrents,${data.downloads.totalTorrents}`);
      rows.push(`Downloads,Active,${data.downloads.activeDownloads}`);
      rows.push(`Downloads,Completed,${data.downloads.completedDownloads}`);
      rows.push(`Downloads,Failed,${data.downloads.failedDownloads}`);
      rows.push(`Downloads,Total Downloaded,${data.downloads.totalDownloadedBytes}`);
      rows.push(`Downloads,Total Uploaded,${data.downloads.totalUploadedBytes}`);
    }
    
    if (data.system) {
      rows.push(`System,Uptime Seconds,${data.system.uptimeSeconds}`);
      rows.push(`System,DB Size,${data.system.dbSizeBytes}`);
    }
    
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mediarr-stats-${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export function StatsPage() {
  const [libraryStats, setLibraryStats] = useState<LibraryStats | null>(null);
  const [downloadStats, setDownloadStats] = useState<DownloadStats | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const api = getApiClients();

    Promise.all([
      api.statsApi.getStats(),
      api.statsApi.getDownloadStats().catch((err: unknown) => {
        console.error('Failed to load download stats:', err);
        return null;
      }),
      api.statsApi.getSystemStats().catch((err: unknown) => {
        console.error('Failed to load system stats:', err);
        return null;
      }),
    ])
      .then(([library, downloads, system]) => {
        setLibraryStats(library);
        setDownloadStats(downloads);
        setSystemStats(system);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const allStats = {
    library: libraryStats,
    downloads: downloadStats,
    system: systemStats,
  };

  return (
    <RouteScaffold
      title="Statistics"
      description="Library composition, quality distribution, storage usage, download metrics, and system health."
      actions={
        !loading && !error ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-md border border-border-subtle bg-surface-1 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
              >
                Export
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportStats('json', allStats)}>
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportStats('csv', allStats)}>
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null
      }
    >
      {loading ? (
        <div className="rounded-md border border-border-subtle bg-surface-1 p-8 text-center text-text-secondary">
          Loading statistics…
        </div>
      ) : error ? (
        <div className="rounded-md border border-border-subtle bg-surface-1 p-8 text-center text-status-danger">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Library Overview */}
          {libraryStats && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-text-secondary uppercase tracking-wide">Library Overview</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Movies" value={libraryStats.library.totalMovies} sub={`${libraryStats.library.monitoredMovies} monitored`} />
                <StatCard label="TV Shows" value={libraryStats.library.totalSeries} sub={`${libraryStats.library.monitoredSeries} monitored`} />
                <StatCard label="Episodes" value={libraryStats.library.totalEpisodes.toLocaleString()} sub={`${libraryStats.library.monitoredEpisodes.toLocaleString()} monitored`} />
                <StatCard label="Total Files" value={libraryStats.files.totalFiles.toLocaleString()} sub={formatBytes(libraryStats.files.totalSizeBytes)} />
              </div>
            </section>
          )}

          {/* Quality Distribution */}
          {libraryStats && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <section className="rounded-md border border-border-subtle bg-surface-1 p-4">
                <h2 className="mb-3 text-sm font-semibold">Movie Quality</h2>
                <p className="mb-3 text-sm text-text-secondary">{libraryStats.files.movieFiles} files</p>
                <QualityPieChart breakdown={libraryStats.quality.movies} total={libraryStats.files.movieFiles} />
              </section>
              <section className="rounded-md border border-border-subtle bg-surface-1 p-4">
                <h2 className="mb-3 text-sm font-semibold">Episode Quality</h2>
                <p className="mb-3 text-sm text-text-secondary">{libraryStats.files.episodeFiles} files</p>
                <QualityPieChart breakdown={libraryStats.quality.episodes} total={libraryStats.files.episodeFiles} />
              </section>
            </div>
          )}

          {/* Storage Breakdown */}
          {libraryStats && (
            <section className="rounded-md border border-border-subtle bg-surface-1 p-4">
              <h2 className="mb-3 text-sm font-semibold">Storage Usage</h2>
              <p className="mb-3 text-2xl font-semibold tabular-nums">{formatBytes(libraryStats.files.totalSizeBytes)}</p>
              <StorageBar movieBytes={libraryStats.files.movieSizeBytes} episodeBytes={libraryStats.files.episodeSizeBytes} />
            </section>
          )}

          {/* Download Statistics */}
          {downloadStats && (
            <section className="rounded-md border border-border-subtle bg-surface-1 p-4">
              <h2 className="mb-3 text-sm font-semibold">Download Statistics</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
                <StatCard label="Total Torrents" value={downloadStats.totalTorrents} />
                <StatCard label="Active" value={downloadStats.activeDownloads} />
                <StatCard label="Completed" value={downloadStats.completedDownloads} />
                <StatCard label="Failed" value={downloadStats.failedDownloads} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-4">
                <StatCard label="Downloaded" value={formatBytes(downloadStats.totalDownloadedBytes)} />
                <StatCard label="Uploaded" value={formatBytes(downloadStats.totalUploadedBytes)} />
                <StatCard label="Avg Speed" value={`${formatBytes(downloadStats.averageDownloadSpeed)}/s`} />
              </div>
              <DownloadBarChart stats={downloadStats} />
            </section>
          )}

          {/* System Health */}
          {systemStats && (
            <section className="rounded-md border border-border-subtle bg-surface-1 p-4">
              <h2 className="mb-3 text-sm font-semibold">System Health</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-4">
                <StatCard label="Uptime" value={formatDuration(systemStats.uptimeSeconds)} />
                <StatCard label="DB Size" value={formatBytes(systemStats.dbSizeBytes)} />
                <StatCard label="Disk Volumes" value={systemStats.diskSpace.length} />
              </div>
              {systemStats.diskSpace.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-text-secondary">Disk Usage</h3>
                  {systemStats.diskSpace.map((disk, index) => (
                    <DiskUsageBar key={index} disk={disk} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Missing Media */}
          {libraryStats && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-text-secondary uppercase tracking-wide">Missing Media</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
                  <p className="text-sm text-text-secondary">Missing Movies</p>
                  <p className={`mt-1 text-2xl font-semibold tabular-nums ${libraryStats.missing.movies > 0 ? 'text-status-warning' : 'text-status-success'}`}>
                    {libraryStats.missing.movies}
                  </p>
                  {libraryStats.missing.movies > 0 ? (
                    <Link to="/library/movies" className="mt-1 text-xs text-accent-primary hover:underline">
                      View library →
                    </Link>
                  ) : (
                    <p className="mt-0.5 text-xs text-text-secondary">All caught up</p>
                  )}
                </div>
                <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
                  <p className="text-sm text-text-secondary">Missing Episodes</p>
                  <p className={`mt-1 text-2xl font-semibold tabular-nums ${libraryStats.missing.episodes > 0 ? 'text-status-warning' : 'text-status-success'}`}>
                    {libraryStats.missing.episodes.toLocaleString()}
                  </p>
                  {libraryStats.missing.episodes > 0 ? (
                    <Link to="/library/tv" className="mt-1 text-xs text-accent-primary hover:underline">
                      View library →
                    </Link>
                  ) : (
                    <p className="mt-0.5 text-xs text-text-secondary">All caught up</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Recent Activity */}
          {libraryStats && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-text-secondary uppercase tracking-wide">Recent Activity</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Downloads (7d)" value={libraryStats.activity.downloadsThisWeek} />
                <StatCard label="Downloads (30d)" value={libraryStats.activity.downloadsThisMonth} />
                <StatCard label="Searches (7d)" value={libraryStats.activity.searchesThisWeek} />
                <StatCard label="Subtitles (7d)" value={libraryStats.activity.subtitlesThisWeek} />
              </div>
            </section>
          )}
        </div>
      )}
    </RouteScaffold>
  );
}
