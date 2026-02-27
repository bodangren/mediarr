'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';

interface PaginatedLike<T> {
  items: T[];
  meta: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

function replaceTorrentItems<T>(current: T, nextItems: unknown[]): T {
  if (!current) {
    return current;
  }

  if (Array.isArray(current)) {
    return nextItems as T;
  }

  if (
    typeof current === 'object' &&
    current !== null &&
    'items' in current &&
    'meta' in current
  ) {
    const paginated = current as PaginatedLike<unknown>;
    return {
      ...paginated,
      items: nextItems,
      meta: {
        ...paginated.meta,
        totalCount: nextItems.length,
      },
    } as T;
  }

  return current;
}

export function useEventsCacheBridge(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const { eventsApi } = getApiClients();

    const refreshIndexerSlices = (): void => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.indexers() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.health() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.systemStatus() });
    };

    const refreshTaskSlices = (): void => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasksScheduled() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasksQueued() });
      void queryClient.invalidateQueries({ queryKey: ['tasks', 'history'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.systemStatus() });
    };

    const unsubscribers = [
      eventsApi.on('torrent:stats', payload => {
        queryClient.setQueriesData({ queryKey: ['torrents'] }, current => {
          if (!current) {
            return current;
          }

          return replaceTorrentItems(current, payload);
        });
      }),

      eventsApi.on('activity:new', () => {
        void queryClient.invalidateQueries({ queryKey: ['activity'] });
      }),

      eventsApi.on('health:update', () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.health() });
      }),

      eventsApi.on('indexer:added', () => {
        refreshIndexerSlices();
      }),

      eventsApi.on('indexer:updated', () => {
        refreshIndexerSlices();
      }),

      eventsApi.on('indexer:deleted', () => {
        refreshIndexerSlices();
      }),

      eventsApi.on('indexer:healthChanged', () => {
        refreshIndexerSlices();
      }),

      eventsApi.on('command:started', () => {
        refreshTaskSlices();
      }),

      eventsApi.on('command:completed', () => {
        refreshTaskSlices();
      }),
    ];

    eventsApi.connect();

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
      eventsApi.disconnect();
    };
  }, [queryClient]);
}
