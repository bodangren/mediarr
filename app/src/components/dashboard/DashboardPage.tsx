import { useEffect, useMemo, useState } from 'react';
import { getApiClients } from '@/lib/api/client';
import type { ActivityItem } from '@/lib/api/activityApi';
import type { DiskSpaceInfo, UpcomingItem } from '@/lib/api/dashboardApi';
import type { TorrentItem } from '@/lib/api/torrentApi';
import { DiskSpaceWidget } from './DiskSpaceWidget';
import { RecentlyAddedWidget } from './RecentlyAddedWidget';
import { UpcomingWidget } from './UpcomingWidget';
import { ActiveDownloadsWidget } from './ActiveDownloadsWidget';

export function DashboardPage() {
  const api = useMemo(() => getApiClients(), []);

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);
  const [diskSpace, setDiskSpace] = useState<DiskSpaceInfo[]>([]);
  const [torrents, setTorrents] = useState<TorrentItem[]>([]);

  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(true);
  const [isLoadingDiskSpace, setIsLoadingDiskSpace] = useState(true);
  const [isLoadingTorrents, setIsLoadingTorrents] = useState(true);

  useEffect(() => {
    const loadActivity = async () => {
      setIsLoadingActivity(true);
      try {
        const result = await api.activityApi.list({ page: 1, pageSize: 20 });
        setRecentActivity(result.items);
      } catch {
        setRecentActivity([]);
      } finally {
        setIsLoadingActivity(false);
      }
    };

    void loadActivity();
  }, [api]);

  useEffect(() => {
    const loadUpcoming = async () => {
      setIsLoadingUpcoming(true);
      try {
        const result = await api.dashboardApi.getUpcoming();
        setUpcoming(result);
      } catch {
        setUpcoming([]);
      } finally {
        setIsLoadingUpcoming(false);
      }
    };

    void loadUpcoming();
  }, [api]);

  useEffect(() => {
    const loadDiskSpace = async () => {
      setIsLoadingDiskSpace(true);
      try {
        const result = await api.dashboardApi.getDiskSpace();
        setDiskSpace(result);
      } catch {
        setDiskSpace([]);
      } finally {
        setIsLoadingDiskSpace(false);
      }
    };

    void loadDiskSpace();
  }, [api]);

  useEffect(() => {
    const loadTorrents = async () => {
      setIsLoadingTorrents(true);
      try {
        const result = await api.torrentApi.list({ page: 1, pageSize: 50 });
        setTorrents(result.items);
      } catch {
        setTorrents([]);
      } finally {
        setIsLoadingTorrents(false);
      }
    };

    void loadTorrents();
  }, [api]);

  return (
    <div className="space-y-4">
      <header className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-text-secondary">
          Unified overview across movies, TV, tasks, and system status.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentlyAddedWidget items={recentActivity} isLoading={isLoadingActivity} />
        <UpcomingWidget items={upcoming} isLoading={isLoadingUpcoming} />
        <ActiveDownloadsWidget torrents={torrents} isLoading={isLoadingTorrents} />
        <DiskSpaceWidget data={diskSpace} isLoading={isLoadingDiskSpace} />
      </div>
    </div>
  );
}
