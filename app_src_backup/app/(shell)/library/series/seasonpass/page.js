'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/components/primitives/Icon';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
function SeasonRow({ seriesId, season, onToggleSeason, onToggleEpisode }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const episodeCount = season.episodes?.length ?? 0;
    const monitoredCount = season.episodes?.filter(ep => ep.monitored).length ?? 0;
    const hasFiles = season.episodes?.some(ep => ep.fileVariants && ep.fileVariants.length > 0) ?? false;
    return (_jsxs("div", { className: "border-b border-border-subtle last:border-b-0", children: [_jsxs("div", { className: "flex items-center gap-3 py-2 px-3 hover:bg-surface-2", children: [_jsx("button", { type: "button", className: "flex-shrink-0 rounded p-1 hover:bg-surface-3 disabled:opacity-50", onClick: () => setIsExpanded(!isExpanded), disabled: episodeCount === 0, "aria-expanded": isExpanded, children: _jsx(Icon, { name: isExpanded ? 'chevron-down' : 'chevron-right', className: "h-4 w-4" }) }), _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: season.monitored, onChange: e => onToggleSeason(seriesId, season.seasonNumber, e.currentTarget.checked), className: "rounded border-border-subtle" }), _jsxs("span", { className: "text-sm font-medium", children: ["Season ", season.seasonNumber] })] }), _jsxs("div", { className: "flex items-center gap-3 text-xs text-text-secondary", children: [_jsxs("span", { children: [monitoredCount, "/", episodeCount, " monitored"] }), hasFiles && (_jsxs("span", { className: "flex items-center gap-1 text-status-completed", children: [_jsx(Icon, { name: "check", className: "h-3 w-3" }), "Files"] }))] })] }), isExpanded && season.episodes && season.episodes.length > 0 && (_jsx("div", { className: "ml-10 border-l border-border-subtle bg-surface-2/50 py-1", children: season.episodes.map(episode => (_jsxs("div", { className: "flex items-center gap-3 py-1.5 px-3 hover:bg-surface-3", children: [_jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: episode.monitored, onChange: e => onToggleEpisode(episode.id, e.currentTarget.checked), className: "rounded border-border-subtle" }), _jsxs("span", { className: "text-xs", children: ["E", episode.episodeNumber.toString().padStart(2, '0')] })] }), episode.fileVariants && episode.fileVariants.length > 0 && (_jsx(Icon, { name: "download", className: "h-3 w-3 text-status-completed" }))] }, episode.id))) }))] }));
}
function SeriesPassRow({ series, isSelected, onToggleSelect, onApplyMonitoring, onToggleSeason, onToggleEpisode, isApplying, }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedStrategy, setSelectedStrategy] = useState('all');
    const seasonCount = series.seasons?.length ?? 0;
    const monitoredSeasonCount = series.seasons?.filter(s => s.monitored).length ?? 0;
    const totalEpisodes = series.seasons?.reduce((sum, s) => sum + (s.episodes?.length ?? 0), 0) ?? 0;
    const monitoredEpisodes = series.seasons?.reduce((sum, s) => sum + (s.episodes?.filter(ep => ep.monitored).length ?? 0), 0) ?? 0;
    return (_jsxs("div", { className: "rounded-md border border-border-subtle bg-surface-1", children: [_jsxs("div", { className: "flex items-center gap-3 p-3", children: [_jsx("input", { type: "checkbox", checked: isSelected, onChange: () => onToggleSelect(series.id), className: "rounded border-border-subtle", "aria-label": `Select ${series.title}` }), _jsx("button", { type: "button", className: "flex-shrink-0 rounded p-1 hover:bg-surface-2", onClick: () => setIsExpanded(!isExpanded), "aria-expanded": isExpanded, children: _jsx(Icon, { name: isExpanded ? 'chevron-down' : 'chevron-right', className: "h-4 w-4" }) }), _jsxs(Link, { href: `/library/series/${series.id}`, className: "min-w-0 flex-1 font-medium hover:text-accent-primary", children: [series.title, series.year && _jsxs("span", { className: "ml-2 text-text-secondary", children: ["(", series.year, ")"] })] }), series.status && _jsx(StatusBadge, { status: series.status }), _jsxs("div", { className: "text-xs text-text-secondary", children: [monitoredEpisodes, "/", totalEpisodes, " eps"] }), _jsxs("select", { value: selectedStrategy, onChange: e => setSelectedStrategy(e.currentTarget.value), className: "rounded border border-border-subtle bg-surface-1 px-2 py-1 text-xs", disabled: isApplying, children: [_jsx("option", { value: "all", children: "All Episodes" }), _jsx("option", { value: "none", children: "None" }), _jsx("option", { value: "firstSeason", children: "First Season" }), _jsx("option", { value: "lastSeason", children: "Last Season" }), _jsx("option", { value: "latestSeason", children: "Latest Season" }), _jsx("option", { value: "pilotOnly", children: "Pilot Only" }), _jsx("option", { value: "existing", children: "Existing Episodes" })] }), _jsx("button", { type: "button", className: "rounded border border-accent-primary bg-accent-primary/10 px-3 py-1 text-xs text-accent-primary hover:bg-accent-primary/20 disabled:opacity-50", onClick: () => onApplyMonitoring(series.id, selectedStrategy), disabled: isApplying, children: "Apply" })] }), isExpanded && series.seasons && series.seasons.length > 0 && (_jsx("div", { className: "border-t border-border-subtle", children: series.seasons
                    .sort((a, b) => a.seasonNumber - b.seasonNumber)
                    .map(season => (_jsx(SeasonRow, { seriesId: series.id, season: season, onToggleSeason: onToggleSeason, onToggleEpisode: onToggleEpisode }, season.seasonNumber))) }))] }));
}
const MONITORING_STRATEGIES = [
    { value: 'all', label: 'Monitor All Episodes' },
    { value: 'none', label: 'Unmonitor All' },
    { value: 'firstSeason', label: 'Monitor First Season' },
    { value: 'lastSeason', label: 'Monitor Last Season' },
    { value: 'latestSeason', label: 'Monitor Latest Season' },
    { value: 'pilotOnly', label: 'Monitor Pilot Only' },
    { value: 'existing', label: 'Monitor Existing Episodes' },
];
export default function SeasonPassPage() {
    const api = useMemo(() => getApiClients(), []);
    const queryClient = useQueryClient();
    const { pushToast } = useToast();
    const [selectedSeries, setSelectedSeries] = useState(new Set());
    const [bulkStrategy, setBulkStrategy] = useState('all');
    // Fetch all series with seasons and episodes
    const seriesQuery = useApiQuery({
        queryKey: queryKeys.seriesList({ pageSize: 1000 }),
        queryFn: () => api.mediaApi.listSeries({ pageSize: 1000 }),
        staleTimeKind: 'list',
        isEmpty: data => data.items.length === 0,
    });
    // Apply monitoring mutation for single series
    const applyMonitoringMutation = useMutation({
        mutationFn: ({ seriesId, monitoringType }) => api.mediaApi.applySeriesMonitoring(seriesId, monitoringType),
        onSuccess: (result) => {
            pushToast({
                title: 'Monitoring Updated',
                body: `Updated ${result.updatedEpisodes} of ${result.totalEpisodes} episodes`,
                variant: 'success',
            });
            void queryClient.invalidateQueries({ queryKey: ['series'] });
        },
        onError: (error) => {
            pushToast({
                title: 'Failed to Update Monitoring',
                body: error.message,
                variant: 'error',
            });
        },
    });
    // Bulk monitoring mutation
    const bulkMonitoringMutation = useMutation({
        mutationFn: ({ seriesIds, monitoringType }) => api.mediaApi.applyBulkSeriesMonitoring(seriesIds, monitoringType),
        onSuccess: (result) => {
            const totalUpdated = result.results.reduce((sum, r) => sum + r.updatedEpisodes, 0);
            pushToast({
                title: 'Bulk Monitoring Updated',
                body: `Updated ${totalUpdated} episodes across ${result.results.length} series`,
                variant: 'success',
            });
            setSelectedSeries(new Set());
            void queryClient.invalidateQueries({ queryKey: ['series'] });
        },
        onError: (error) => {
            pushToast({
                title: 'Failed to Update Bulk Monitoring',
                body: error.message,
                variant: 'error',
            });
        },
    });
    // Season monitoring mutation
    const seasonMonitoringMutation = useMutation({
        mutationFn: ({ seriesId, seasonNumber, monitored, }) => api.mediaApi.setSeasonMonitoring(seriesId, seasonNumber, monitored),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['series'] });
        },
        onError: (error) => {
            pushToast({
                title: 'Failed to Update Season',
                body: error.message,
                variant: 'error',
            });
        },
    });
    // Episode monitoring mutation
    const episodeMonitoringMutation = useMutation({
        mutationFn: ({ episodeId, monitored }) => api.mediaApi.setEpisodeMonitored(episodeId, monitored),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['series'] });
        },
        onError: (error) => {
            pushToast({
                title: 'Failed to Update Episode',
                body: error.message,
                variant: 'error',
            });
        },
    });
    const handleToggleSelect = useCallback((id) => {
        setSelectedSeries(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            }
            else {
                next.add(id);
            }
            return next;
        });
    }, []);
    const handleSelectAll = useCallback(() => {
        const allIds = seriesQuery.data?.items.map(s => s.id) ?? [];
        setSelectedSeries(new Set(allIds));
    }, [seriesQuery.data]);
    const handleSelectNone = useCallback(() => {
        setSelectedSeries(new Set());
    }, []);
    const handleApplyBulk = useCallback(() => {
        if (selectedSeries.size === 0)
            return;
        bulkMonitoringMutation.mutate({
            seriesIds: Array.from(selectedSeries),
            monitoringType: bulkStrategy,
        });
    }, [selectedSeries, bulkStrategy, bulkMonitoringMutation]);
    const handleApplyMonitoring = useCallback((seriesId, monitoringType) => {
        applyMonitoringMutation.mutate({ seriesId, monitoringType });
    }, [applyMonitoringMutation]);
    const handleToggleSeason = useCallback((seriesId, seasonNumber, monitored) => {
        seasonMonitoringMutation.mutate({ seriesId, seasonNumber, monitored });
    }, [seasonMonitoringMutation]);
    const handleToggleEpisode = useCallback((episodeId, monitored) => {
        episodeMonitoringMutation.mutate({ episodeId, monitored });
    }, [episodeMonitoringMutation]);
    const series = seriesQuery.data?.items ?? [];
    const isLoading = seriesQuery.isPending;
    const isError = seriesQuery.isError;
    const isEmpty = seriesQuery.isResolvedEmpty;
    return (_jsxs("section", { className: "space-y-4", children: [_jsxs("header", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Season Pass" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Bulk-configure monitoring for series and seasons" })] }), _jsx(Link, { href: "/library/series", className: "rounded border border-border-subtle px-3 py-1.5 text-sm hover:bg-surface-2", children: "Back to Series" })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 rounded-md border border-border-subtle bg-surface-1 p-3", children: [_jsxs("span", { className: "text-sm text-text-secondary", children: [selectedSeries.size, " selected"] }), _jsx("button", { type: "button", className: "rounded border border-border-subtle px-2 py-1 text-xs hover:bg-surface-2", onClick: handleSelectAll, children: "Select All" }), _jsx("button", { type: "button", className: "rounded border border-border-subtle px-2 py-1 text-xs hover:bg-surface-2", onClick: handleSelectNone, children: "Select None" }), _jsx("div", { className: "h-4 w-px bg-border-subtle" }), _jsx("select", { value: bulkStrategy, onChange: e => setBulkStrategy(e.currentTarget.value), className: "rounded border border-border-subtle bg-surface-1 px-2 py-1 text-sm", disabled: selectedSeries.size === 0, children: MONITORING_STRATEGIES.map(strategy => (_jsx("option", { value: strategy.value, children: strategy.label }, strategy.value))) }), _jsx("button", { type: "button", className: "rounded bg-accent-primary px-3 py-1.5 text-sm text-white hover:bg-accent-primary/90 disabled:opacity-50", onClick: handleApplyBulk, disabled: selectedSeries.size === 0 || bulkMonitoringMutation.isPending, children: bulkMonitoringMutation.isPending ? 'Applying...' : 'Apply to Selected' })] }), _jsx(QueryPanel, { isLoading: isLoading, isError: isError, isEmpty: isEmpty, errorMessage: seriesQuery.error?.message, onRetry: () => void seriesQuery.refetch(), emptyTitle: "No series found", emptyBody: "Add series to your library to use Season Pass.", children: _jsx("div", { className: "space-y-2", children: series.map(item => (_jsx(SeriesPassRow, { series: item, isSelected: selectedSeries.has(item.id), onToggleSelect: handleToggleSelect, onApplyMonitoring: handleApplyMonitoring, onToggleSeason: handleToggleSeason, onToggleEpisode: handleToggleEpisode, isApplying: applyMonitoringMutation.isPending }, item.id))) }) })] }));
}
//# sourceMappingURL=page.js.map