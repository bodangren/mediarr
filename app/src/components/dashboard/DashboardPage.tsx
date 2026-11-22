import { useEffect, useMemo, useState } from 'react';
import { getApiClients } from '@/lib/api/client';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { useToast } from '@/components/providers/ToastProvider';
import { Icon } from '@/components/primitives/Icon';
import type { RecentlyAddedItem } from '@/lib/api/dashboardApi';
import type { ContinueWatchingItem, DiskSpaceInfo, NextUpItem, UpcomingItem } from '@/lib/api/dashboardApi';
import type { TorrentItem } from '@/lib/api/torrentApi';
import { DiskSpaceWidget } from './DiskSpaceWidget';
import { RecentlyAddedWidget } from './RecentlyAddedWidget';
import { UpcomingWidget } from './UpcomingWidget';
import { ActiveDownloadsWidget } from './ActiveDownloadsWidget';
import { ContinueWatchingWidget } from './ContinueWatchingWidget';
import { NextUpWidget } from './NextUpWidget';

export function DashboardPage() {
  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();

  const [recentlyAdded, setRecentlyAdded] = useState<RecentlyAddedItem[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);
  const [diskSpace, setDiskSpace] = useState<DiskSpaceInfo[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>([]);
  const [nextUp, setNextUp] = useState<NextUpItem[]>([]);
  const [torrents, setTorrents] = useState<TorrentItem[]>([]);

  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(true);
  const [isLoadingDiskSpace, setIsLoadingDiskSpace] = useState(true);
  const [isLoadingContinueWatching, setIsLoadingContinueWatching] = useState(true);
  const [isLoadingNextUp, setIsLoadingNextUp] = useState(true);
  const [isLoadingTorrents, setIsLoadingTorrents] = useState(true);
  const [isSearchingMissing, setIsSearchingMissing] = useState(false);

  const handleSearchMissing = async () => {
    setIsSearchingMissing(true);
    try {
      await api.wantedApi.triggerAutoSearchAll();
      pushToast({ title: 'Background Search Started', message: 'Searching for all missing media...', variant: 'success' });
    } catch {
      pushToast({ title: 'Search Failed', message: 'Could not trigger background search', variant: 'error' });
    } finally {
      setIsSearchingMissing(false);
    }
  };

  useEffect(() => {
    const loadRecentlyAdded = async () => {
      setIsLoadingActivity(true);
      try {
        setRecentlyAdded(await api.dashboardApi.getRecentlyAdded(8));
      } catch {
        setRecentlyAdded([]);
      } finally {
        setIsLoadingActivity(false);
      }
    };

    void loadRecentlyAdded();
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
    const loadContinueWatching = async () => {
      setIsLoadingContinueWatching(true);
      try {
        const result = await api.dashboardApi.getContinueWatching();
        setContinueWatching(result);
      } catch {
        setContinueWatching([]);
      } finally {
        setIsLoadingContinueWatching(false);
      }
    };

    void loadContinueWatching();
  }, [api]);

  useEffect(() => {
    const loadNextUp = async () => {
      setIsLoadingNextUp(true);
      try {
        setNextUp(await api.dashboardApi.getNextUp(12));
      } catch {
        setNextUp([]);
      } finally {
        setIsLoadingNextUp(false);
      }
    };

    void loadNextUp();
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
        <NextUpWidget items={nextUp} isLoading={isLoadingNextUp} />
        <ContinueWatchingWidget items={continueWatching} isLoading={isLoadingContinueWatching} />
        <RecentlyAddedWidget items={recentlyAdded} isLoading={isLoadingActivity} />
        <UpcomingWidget items={upcoming} isLoading={isLoadingUpcoming} />
        <ActiveDownloadsWidget torrents={torrents} isLoading={isLoadingTorrents} />
        <DiskSpaceWidget data={diskSpace} isLoading={isLoadingDiskSpace} />
      </div>
    </RouteScaffold>
  );
}
