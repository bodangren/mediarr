import { QueryClient } from '@tanstack/react-query';

export const STALE_TIMES = {
  list: 30_000,
  detail: 60_000,
  queue: 5_000,
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
