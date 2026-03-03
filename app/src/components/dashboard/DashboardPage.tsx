import { useEffect, useMemo, useState } from 'react';
import { getApiClients } from '@/lib/api/client';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { useToast } from '@/components/providers/ToastProvider';
import { Icon } from '@/components/primitives/Icon';
import type { ActivityItem } from '@/lib/api/activityApi';
import type { DiskSpaceInfo, UpcomingItem } from '@/lib/api/dashboardApi';
import type { TorrentItem } from '@/lib/api/torrentApi';
import { DiskSpaceWidget } from './DiskSpaceWidget';
import { RecentlyAddedWidget } from './RecentlyAddedWidget';
import { UpcomingWidget } from './UpcomingWidget';
import { ActiveDownloadsWidget } from './ActiveDownloadsWidget';

export function DashboardPage() {
  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);
  const [diskSpace, setDiskSpace] = useState<DiskSpaceInfo[]>([]);
  const [torrents, setTorrents] = useState<TorrentItem[]>([]);

  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(true);
  const [isLoadingDiskSpace, setIsLoadingDiskSpace] = useState(true);
  const [isLoadingTorrents, setIsLoadingTorrents] = useState(true);
  const [isSearchingMissing, setIsSearchingMissing] = useState(false);

  const handleSearchMissing = async () => {
    setIsSearchingMissing(true);
    try {
      const res = await fetch('/api/wanted/search-all', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to trigger search');
      pushToast({ title: 'Background Search Started', message: 'Searching for all missing media...', variant: 'success' });
    } catch (err) {
      pushToast({ title: 'Search Failed', message: 'Could not trigger background search', variant: 'error' });
    } finally {
      setIsSearchingMissing(false);
    }
  };

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
    <RouteScaffold 
      title="Dashboard" 
      description="Unified overview across movies, TV, tasks, and system status."
      actions={
        <button
          type="button"
          onClick={() => void handleSearchMissing()}
          disabled={isSearchingMissing}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border-subtle bg-surface-2 px-3 py-1.5 text-sm font-medium hover:bg-surface-3 disabled:opacity-50"
        >
          <Icon name="search" className={isSearchingMissing ? 'animate-spin' : ''} />
          Search Missing
        </button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <RecentlyAddedWidget items={recentActivity} isLoading={isLoadingActivity} />
        <UpcomingWidget items={upcoming} isLoading={isLoadingUpcoming} />
        <ActiveDownloadsWidget torrents={torrents} isLoading={isLoadingTorrents} />
        <DiskSpaceWidget data={diskSpace} isLoading={isLoadingDiskSpace} />
      </div>
    </RouteScaffold>
  );
}
