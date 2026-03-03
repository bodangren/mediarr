'use client';
import { useQuery } from '@tanstack/react-query';
import { STALE_TIMES } from './queryClient';
export function useApiQuery(options) {
    const query = useQuery({
        queryKey: options.queryKey,
        queryFn: options.queryFn,
        staleTime: STALE_TIMES[options.staleTimeKind ?? 'list'],
        enabled: options.enabled,
        refetchInterval: options.refetchInterval,
    });
    const isResolvedEmpty = query.isSuccess && options.isEmpty ? options.isEmpty(query.data) : false;
    return {
        ...query,
        isResolvedEmpty,
    };
}
//# sourceMappingURL=useApiQuery.js.map