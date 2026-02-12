'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getApiClients } from '@/lib/api/client';

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

    const unsubscribeTorrent = eventsApi.on('torrent:stats', payload => {
      queryClient.setQueriesData({ queryKey: ['torrents'] }, current => {
        if (!current) {
          return current;
        }

        return replaceTorrentItems(current, payload);
      });
    });

    const unsubscribeActivity = eventsApi.on('activity:new', () => {
      void queryClient.invalidateQueries({ queryKey: ['activity'] });
    });

    const unsubscribeHealth = eventsApi.on('health:update', () => {
      void queryClient.invalidateQueries({ queryKey: ['health'] });
    });

    eventsApi.connect();

    return () => {
      unsubscribeTorrent();
      unsubscribeActivity();
      unsubscribeHealth();
      eventsApi.disconnect();
    };
  }, [queryClient]);
}
