'use client';

import { useQuery, type QueryKey, type UseQueryResult } from '@tanstack/react-query';
import { STALE_TIMES, type StaleTimeKind } from './queryClient';

export interface UseApiQueryOptions<TData> {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  staleTimeKind?: StaleTimeKind;
  enabled?: boolean;
  isEmpty?: (data: TData) => boolean;
}

export type ApiQueryResult<TData> = UseQueryResult<TData, Error> & {
  isResolvedEmpty: boolean;
};

export function useApiQuery<TData>(options: UseApiQueryOptions<TData>): ApiQueryResult<TData> {
  const query = useQuery<TData, Error>({
    queryKey: options.queryKey,
    queryFn: options.queryFn,
    staleTime: STALE_TIMES[options.staleTimeKind ?? 'list'],
    enabled: options.enabled,
  });

  const isResolvedEmpty = query.isSuccess && options.isEmpty ? options.isEmpty(query.data) : false;
  return {
    ...query,
    isResolvedEmpty,
  };
}
