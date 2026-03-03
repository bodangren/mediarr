'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { queryKeys } from '@/lib/query/queryKeys';
import { getApiClients } from '@/lib/api/client';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { EmptyPanel } from '@/components/primitives/EmptyPanel';
function formatActivityToHistoryEvent(activity) {
    const eventType = activity.eventType.toLowerCase();
    let type = 'download';
    if (eventType.includes('grab'))
        type = 'grab';
    else if (eventType.includes('import'))
        type = 'import';
    else if (eventType.includes('delete'))
        type = 'delete';
    else if (eventType.includes('refresh'))
        type = 'refresh';
    // Extract quality from details if available
    let quality;
    if (activity.details && typeof activity.details === 'object') {
        quality = activity.details.quality;
    }
    // Extract source from sourceModule
    const source = activity.sourceModule;
    return {
        id: activity.id,
        type,
        date: activity.occurredAt || new Date().toISOString(),
        quality,
        source,
        details: activity.summary,
        success: activity.success,
    };
}
function getEventIcon(type) {
    switch (type) {
        case 'grab':
            return '⬇️';
        case 'import':
            return '📥';
        case 'download':
            return '📦';
        case 'delete':
            return '🗑️';
        case 'refresh':
            return '🔄';
        default:
            return '📄';
    }
}
function getEventColor(type, success) {
    if (success === false) {
        return 'text-status-error';
    }
    switch (type) {
        case 'grab':
            return 'text-accent-primary';
        case 'import':
            return 'text-accent-success';
        case 'download':
            return 'text-accent-info';
        case 'delete':
            return 'text-status-error';
        case 'refresh':
            return 'text-accent-warning';
        default:
            return 'text-text-primary';
    }
}
function formatDateTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1)
        return 'Just now';
    if (diffMins < 60)
        return `${diffMins}m ago`;
    if (diffHours < 24)
        return `${diffHours}h ago`;
    if (diffDays < 7)
        return `${diffDays}d ago`;
    return date.toLocaleDateString();
}
export function MovieHistory({ movieId }) {
    const api = useMemo(() => getApiClients(), []);
    const historyQuery = useApiQuery({
        queryKey: ['activity', { entityRef: `movie:${movieId}` }],
        queryFn: async () => {
            return api.activityApi.list({
                entityRef: `movie:${movieId}`,
                pageSize: 50,
            });
        },
        staleTimeKind: 'detail',
    });
    const historyEvents = useMemo(() => {
        if (!historyQuery.data)
            return [];
        return historyQuery.data.items
            .map(formatActivityToHistoryEvent)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [historyQuery.data]);
    if (historyQuery.isPending) {
        return (_jsxs("div", { className: "space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-lg font-semibold", children: "History" }), _jsx(QueryPanel, { isLoading: true, isError: false, isEmpty: false, emptyTitle: "", emptyBody: "", children: _jsx("div", {}) })] }));
    }
    if (historyQuery.isError) {
        return (_jsxs("div", { className: "space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-lg font-semibold", children: "History" }), _jsx(QueryPanel, { isLoading: false, isError: true, isEmpty: false, errorMessage: historyQuery.error?.message, onRetry: () => void historyQuery.refetch(), emptyTitle: "", emptyBody: "", children: _jsx("div", {}) })] }));
    }
    return (_jsxs("section", { className: "space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-lg font-semibold", children: "History" }), historyEvents.length === 0 ? (_jsx(EmptyPanel, { title: "No history yet", body: "Activity events for this movie will appear here." })) : (_jsx("div", { className: "space-y-3", children: historyEvents.map(event => (_jsxs("div", { className: "flex gap-3 rounded-md bg-surface-2 p-3", children: [_jsx("div", { className: `flex-shrink-0 text-2xl ${getEventColor(event.type, event.success)}`, children: getEventIcon(event.type) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-medium text-text-primary capitalize", children: event.type }), event.quality && (_jsx("span", { className: "rounded-sm bg-surface-3 px-2 py-0.5 text-xs text-text-secondary", children: event.quality })), _jsx("span", { className: "text-xs text-text-muted", children: formatDateTime(event.date) })] }), _jsx("p", { className: "mt-1 truncate text-sm text-text-secondary", children: event.details }), event.source && (_jsxs("p", { className: "mt-1 text-xs text-text-muted", children: ["Source: ", event.source] }))] })] }, event.id))) })), historyEvents.length > 0 && (_jsxs("p", { className: "text-xs text-text-secondary", children: [historyEvents.length, " event", historyEvents.length !== 1 ? 's' : '', " shown"] }))] }));
}
//# sourceMappingURL=MovieHistory.js.map