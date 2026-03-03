'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
function slugify(value) {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function MetricCard({ label, value, description }) {
    return (_jsxs("article", { className: "rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-text-secondary", children: label }), _jsx("p", { className: "mt-2 text-2xl font-semibold text-text-primary", children: value }), _jsx("p", { className: "mt-1 text-xs text-text-secondary", children: description })] }));
}
function StackedBarChart({ data }) {
    const maxTotal = data.reduce((highest, entry) => {
        const total = entry.active + entry.inactive;
        return total > highest ? total : highest;
    }, 1);
    return (_jsx("div", { className: "space-y-3", children: data.map(entry => {
            const activeWidth = Math.round((entry.active / maxTotal) * 100);
            const inactiveWidth = Math.round((entry.inactive / maxTotal) * 100);
            return (_jsxs("div", { "data-testid": `stacked-bar-${entry.key}`, className: "space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-text-secondary", children: [_jsx("span", { children: entry.label }), _jsx("span", { children: entry.active + entry.inactive })] }), _jsxs("div", { className: "flex h-3 overflow-hidden rounded-sm bg-surface-0", children: [_jsx("div", { className: "bg-status-success", style: { width: `${activeWidth}%` } }), _jsx("div", { className: "bg-status-error", style: { width: `${inactiveWidth}%` } })] })] }, entry.key));
        }) }));
}
function BarChart({ data }) {
    const maxValue = data.reduce((highest, entry) => (entry.value > highest ? entry.value : highest), 1);
    return (_jsx("div", { className: "space-y-3", children: data.map(entry => (_jsxs("div", { "data-testid": `bar-${entry.key}`, className: "space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-text-secondary", children: [_jsx("span", { children: entry.label }), _jsx("span", { children: entry.value })] }), _jsx("div", { className: "h-3 rounded-sm bg-surface-0", children: _jsx("div", { className: "h-3 rounded-sm bg-accent-primary", style: { width: `${Math.round((entry.value / maxValue) * 100)}%` } }) })] }, entry.key))) }));
}
function DoughnutChart({ data }) {
    const total = data.reduce((sum, entry) => sum + entry.value, 0) || 1;
    return (_jsx("ul", { className: "space-y-2 text-sm", children: data.map(entry => {
            const percent = Math.round((entry.value / total) * 100);
            return (_jsxs("li", { "data-testid": `doughnut-${entry.key}`, className: "flex items-center justify-between rounded-sm border border-border-subtle bg-surface-0 px-3 py-2", children: [_jsx("span", { className: "text-text-secondary", children: entry.label }), _jsxs("span", { className: "font-medium text-text-primary", children: [entry.value, " (", percent, "%)"] })] }, entry.key));
        }) }));
}
export default function Page() {
    const api = useMemo(() => getApiClients(), []);
    const indexersQuery = useApiQuery({
        queryKey: queryKeys.indexers(),
        queryFn: () => api.indexerApi.list(),
        staleTimeKind: 'list',
        isEmpty: rows => rows.length === 0,
    });
    const stats = useMemo(() => {
        const rows = indexersQuery.data ?? [];
        const total = rows.length;
        const active = rows.filter(row => row.enabled).length;
        const failed = rows.filter(row => (row.health?.failureCount ?? 0) > 0).length;
        const avgPriority = total > 0
            ? Math.round(rows.reduce((sum, row) => sum + row.priority, 0) / total)
            : 0;
        const protocolData = ['torrent', 'usenet'].map(protocol => {
            const members = rows.filter(row => row.protocol === protocol);
            return {
                key: protocol,
                label: protocol,
                active: members.filter(row => row.enabled).length,
                inactive: members.filter(row => !row.enabled).length,
            };
        });
        const failureData = rows.map(row => ({
            key: slugify(row.name),
            label: row.name,
            value: row.health?.failureCount ?? 0,
        }));
        const capabilityMix = [
            {
                key: 'rss-search',
                label: 'RSS + Search',
                value: rows.filter(row => row.supportsRss && row.supportsSearch).length,
            },
            {
                key: 'rss-only',
                label: 'RSS only',
                value: rows.filter(row => row.supportsRss && !row.supportsSearch).length,
            },
            {
                key: 'search-only',
                label: 'Search only',
                value: rows.filter(row => !row.supportsRss && row.supportsSearch).length,
            },
            {
                key: 'passive',
                label: 'Passive',
                value: rows.filter(row => !row.supportsRss && !row.supportsSearch).length,
            },
        ];
        return {
            total,
            active,
            failed,
            avgPriority,
            protocolData,
            failureData,
            capabilityMix,
        };
    }, [indexersQuery.data]);
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Indexer Stats" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Performance and reliability metrics for configured indexers." })] }), _jsxs(QueryPanel, { isLoading: indexersQuery.isPending, isError: indexersQuery.isError, isEmpty: indexersQuery.isResolvedEmpty, errorMessage: indexersQuery.error?.message, onRetry: () => void indexersQuery.refetch(), emptyTitle: "No indexer stats available", emptyBody: "Add indexers to view performance telemetry.", children: [_jsxs("section", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4", children: [_jsx(MetricCard, { label: "Total Indexers", value: stats.total, description: "Configured indexers across all protocols." }), _jsx(MetricCard, { label: "Active Indexers", value: stats.active, description: "Enabled indexers currently available for sync/search." }), _jsx(MetricCard, { label: "Failed Indexers", value: stats.failed, description: "Indexers with one or more recent health failures." }), _jsx(MetricCard, { label: "Avg Priority", value: stats.avgPriority, description: "Average priority weighting across configured indexers." })] }), _jsxs("section", { className: "grid gap-4 xl:grid-cols-3", children: [_jsxs("article", { className: "space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-base font-semibold", children: "Queries by Protocol" }), _jsx(StackedBarChart, { data: stats.protocolData })] }), _jsxs("article", { className: "space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-base font-semibold", children: "Failure Rate by Indexer" }), _jsx(BarChart, { data: stats.failureData })] }), _jsxs("article", { className: "space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-base font-semibold", children: "Capability Mix" }), _jsx(DoughnutChart, { data: stats.capabilityMix })] })] })] })] }));
}
//# sourceMappingURL=page.js.map