'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, } from 'recharts';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { MetricCard } from '@/components/primitives/MetricCard';
import { HistoryFilters } from '@/components/subtitles/HistoryFilters';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
const TIME_FRAMES = ['day', 'week', 'month', 'year'];
const ACTIONS = ['download', 'upgrade', 'manual', 'upload'];
const PROVIDERS = ['OpenSubtitles', 'Subscene', 'Addic7ed', 'Podnapisi', 'Yify'];
const LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ar', 'hi', 'zh'];
// Helper to convert readonly tuples to mutable arrays for component compatibility
const toMutable = (arr) => [...arr];
function CustomTooltip({ active, payload }) {
    if (!active || !payload || payload.length === 0) {
        return null;
    }
    return (_jsxs("div", { className: "rounded-md border border-border-subtle bg-surface-2 p-2 shadow-elevation-2", children: [_jsx("p", { className: "text-xs font-medium text-text-primary", children: payload[0]?.payload?.date }), payload.map((entry) => (_jsxs("p", { className: "text-xs text-text-secondary", style: { color: entry.color }, children: [entry.name, ": ", entry.value] }, entry.name)))] }));
}
export default function HistoryStatsPage() {
    const api = useMemo(() => getApiClients(), []);
    const [filters, setFilters] = useState({
        period: 'month',
    });
    const queryParams = {
        period: filters.period,
        provider: filters.provider,
        languageCode: filters.languageCode,
        action: filters.action,
    };
    const statsQuery = useQuery({
        queryKey: queryKeys.subtitleHistoryStats(queryParams),
        queryFn: () => api.subtitleHistoryApi.getHistoryStats(queryParams),
        staleTime: 30_000,
    });
    const chartData = statsQuery.data?.downloads ?? [];
    const totalDownloads = useMemo(() => {
        if (!chartData.length)
            return 0;
        return chartData.reduce((sum, item) => sum + item.series + item.movies, 0);
    }, [chartData]);
    const periodDownloads = useMemo(() => {
        if (!chartData.length)
            return 0;
        return totalDownloads;
    }, [chartData, totalDownloads]);
    const topProvider = useMemo(() => {
        const byProvider = statsQuery.data?.byProvider ?? [];
        if (!byProvider.length)
            return '-';
        const top = byProvider.reduce((max, item) => item.count > max.count ? item : max);
        return top.provider;
    }, [statsQuery.data]);
    const topLanguage = useMemo(() => {
        const byLanguage = statsQuery.data?.byLanguage ?? [];
        if (!byLanguage.length)
            return '-';
        const top = byLanguage.reduce((max, item) => item.count > max.count ? item : max);
        return top.language;
    }, [statsQuery.data]);
    const handleFilterChange = (filterState) => {
        setFilters({
            ...filters,
            provider: filterState.provider,
            languageCode: filterState.languageCode,
            action: filterState.action,
        });
    };
    const handleTimeFrameChange = (period) => {
        setFilters({ ...filters, period });
    };
    return (_jsxs("section", { className: "space-y-6", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Subtitle History Statistics" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Visualize subtitle download trends and patterns." })] }), _jsx("div", { className: "flex flex-wrap items-center gap-3", children: TIME_FRAMES.map(frame => (_jsx("button", { type: "button", onClick: () => handleTimeFrameChange(frame), className: `rounded-sm border px-3 py-1.5 text-sm capitalize ${filters.period === frame
                        ? 'border-accent-primary bg-accent-primary text-white'
                        : 'border-border-subtle bg-surface-1 text-text-primary hover:bg-surface-2'}`, children: frame }, frame))) }), _jsx(HistoryFilters, { filters: {
                    provider: filters.provider,
                    languageCode: filters.languageCode,
                    action: filters.action,
                }, onChange: handleFilterChange, providers: toMutable(PROVIDERS), languages: toMutable(LANGUAGES), actions: toMutable(ACTIONS) }), _jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [_jsx(MetricCard, { label: "Total Downloads", value: totalDownloads.toLocaleString() }), _jsx(MetricCard, { label: `This ${filters.period}`, value: periodDownloads.toLocaleString() }), _jsx(MetricCard, { label: "Top Provider", value: topProvider }), _jsx(MetricCard, { label: "Top Language", value: topLanguage })] }), _jsxs(QueryPanel, { isLoading: statsQuery.isLoading, isError: statsQuery.isError, isEmpty: statsQuery.data?.downloads.length === 0, errorMessage: statsQuery.error?.message, onRetry: () => void statsQuery.refetch(), emptyTitle: "No statistics available", emptyBody: "There is no subtitle download data to display for the selected period.", children: [_jsxs("div", { className: "rounded-lg border border-border-subtle bg-surface-1 p-4 shadow-elevation-1", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Download Trends" }), _jsx("div", { className: "h-[400px] w-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: chartData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--border-subtle)" }), _jsx(XAxis, { dataKey: "date", tick: { fill: 'var(--text-secondary)', fontSize: 12 }, stroke: "var(--border-subtle)" }), _jsx(YAxis, { tick: { fill: 'var(--text-secondary)', fontSize: 12 }, stroke: "var(--border-subtle)" }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) }), _jsx(Legend, {}), _jsx(Bar, { name: "Series", dataKey: "series", fill: "var(--accent-info)", radius: [4, 4, 0, 0] }), _jsx(Bar, { name: "Movies", dataKey: "movies", fill: "var(--accent-success)", radius: [4, 4, 0, 0] })] }) }) })] }), statsQuery.data?.byProvider.length ? (_jsxs("div", { className: "mt-4 rounded-lg border border-border-subtle bg-surface-1 p-4 shadow-elevation-1", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Top Providers" }), _jsx("div", { className: "space-y-2", children: statsQuery.data.byProvider.slice(0, 5).map((item, index) => (_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("span", { className: "w-6 text-sm text-text-muted", children: [index + 1, "."] }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "mb-1 flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-text-primary", children: item.provider }), _jsx("span", { className: "text-sm font-medium text-text-secondary", children: item.count.toLocaleString() })] }), _jsx("div", { className: "h-2 w-full rounded-full bg-surface-2", children: _jsx("div", { className: "h-2 rounded-full bg-accent-primary", style: {
                                                            width: `${(item.count / periodDownloads) * 100}%`,
                                                        } }) })] })] }, item.provider))) })] })) : null, statsQuery.data?.byLanguage.length ? (_jsxs("div", { className: "mt-4 rounded-lg border border-border-subtle bg-surface-1 p-4 shadow-elevation-1", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Top Languages" }), _jsx("div", { className: "space-y-2", children: statsQuery.data.byLanguage.slice(0, 5).map((item, index) => (_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("span", { className: "w-6 text-sm text-text-muted", children: [index + 1, "."] }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "mb-1 flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-text-primary", children: item.language }), _jsx("span", { className: "text-sm font-medium text-text-secondary", children: item.count.toLocaleString() })] }), _jsx("div", { className: "h-2 w-full rounded-full bg-surface-2", children: _jsx("div", { className: "h-2 rounded-full bg-accent-warning", style: {
                                                            width: `${(item.count / periodDownloads) * 100}%`,
                                                        } }) })] })] }, item.language))) })] })) : null] })] }));
}
//# sourceMappingURL=page.js.map