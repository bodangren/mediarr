'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { useMemo } from 'react';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { formatRelativeDate } from '@/lib/format';
import { Ban } from 'lucide-react';
export default function ActivityPage() {
    const api = useMemo(() => getApiClients(), []);
    const activityQuery = useApiQuery({
        queryKey: queryKeys.activity({ page: 1, pageSize: 25 }),
        queryFn: () => api.activityApi.list({ page: 1, pageSize: 25 }),
        staleTimeKind: 'list',
        isEmpty: data => data.items.length === 0,
    });
    return (_jsxs("section", { className: "space-y-4", children: [_jsx("header", { className: "space-y-2", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Activity" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Consolidated timeline (expanded insights in Track 7E)." })] }), _jsxs(Link, { href: "/activity/blocklist", className: "flex items-center gap-2 rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary hover:bg-surface-2", children: [_jsx(Ban, { size: 16 }), "View Blocklist"] })] }) }), _jsx(QueryPanel, { isLoading: activityQuery.isPending, isError: activityQuery.isError, isEmpty: activityQuery.isResolvedEmpty, errorMessage: activityQuery.error?.message, onRetry: () => void activityQuery.refetch(), emptyTitle: "No activity", emptyBody: "Events will appear as operations run.", children: _jsx("ul", { className: "space-y-2", children: (activityQuery.data?.items ?? []).map(item => (_jsxs("li", { className: "rounded-md border border-border-subtle bg-surface-1 px-3 py-2", children: [_jsx("p", { className: "text-sm font-medium", children: item.summary }), _jsxs("p", { className: "text-xs text-text-secondary", children: [item.eventType, " \u00B7 ", item.sourceModule ?? 'core', " \u00B7 ", formatRelativeDate(item.occurredAt)] })] }, item.id))) }) })] }));
}
//# sourceMappingURL=page.js.map