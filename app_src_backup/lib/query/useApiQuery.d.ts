import { type QueryKey, type UseQueryResult } from '@tanstack/react-query';
import { type StaleTimeKind } from './queryClient';
export interface UseApiQueryOptions<TData> {
    queryKey: QueryKey;
    queryFn: () => Promise<TData>;
    staleTimeKind?: StaleTimeKind;
    enabled?: boolean;
    refetchInterval?: number | false;
    isEmpty?: (data: TData) => boolean;
}
export type ApiQueryResult<TData> = UseQueryResult<TData, Error> & {
    isResolvedEmpty: boolean;
};
export declare function useApiQuery<TData>(options: UseApiQueryOptions<TData>): ApiQueryResult<TData>;
//# sourceMappingURL=useApiQuery.d.ts.map