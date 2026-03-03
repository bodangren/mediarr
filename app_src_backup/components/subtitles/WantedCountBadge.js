'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useApiQuery } from '@/lib/query/useApiQuery';
import { queryKeys } from '@/lib/query/queryKeys';
import { getApiClients } from '@/lib/api/client';
export function WantedCountBadge({ className = '' }) {
    const api = getApiClients();
    const countQuery = useApiQuery({
        queryKey: queryKeys.subtitleWantedCount(),
        queryFn: () => api.subtitleWantedApi.getWantedCount(),
        staleTimeKind: 'list',
        refetchInterval: 30_000, // Poll every 30 seconds
        isEmpty: data => data.totalCount === 0,
    });
    const count = countQuery.data?.totalCount ?? 0;
    // Don't render anything when count is 0 or still loading (to avoid flash)
    if (count === 0) {
        return null;
    }
    return (_jsx("span", { className: `inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-danger px-1.5 text-[10px] font-bold text-white ${className}`, "aria-label": `${count} missing subtitles`, children: count }));
}
//# sourceMappingURL=WantedCountBadge.js.map