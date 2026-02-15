import { QueryClient } from '@tanstack/react-query';

export const STALE_TIMES = {
  list: 30_000,
  detail: 60_000,
  queue: 5_000,
  tasksScheduled: 60_000,
  tasksQueued: 5_000,
  tasksHistory: 30_000,
  systemEvents: 15_000,
  backups: 30_000,
  backupSchedule: 60_000,
} as const;

export type StaleTimeKind = keyof typeof STALE_TIMES;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIMES.list,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
