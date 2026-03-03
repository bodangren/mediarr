'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FilterBuilder } from '@/components/filters/FilterBuilder';
import { FilterDropdown } from '@/components/filters/FilterDropdown';
import { Icon } from '@/components/primitives/Icon';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { SortMenu } from '@/components/primitives/SortMenu';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { SelectProvider, useSelectContext } from '@/components/primitives/SelectProvider';
import { SelectCheckboxCell } from '@/components/primitives/SelectCheckboxCell';
import { SeriesOverviewView } from '@/components/views/SeriesOverviewView';
import { SeriesPosterView } from '@/components/views/SeriesPosterView';
import { ColumnPicker, JumpBar, SeriesBulkEditModal } from '@/components/series';
import { useToast } from '@/components/providers/ToastProvider';
import { useSeriesViewMode } from '@/lib/hooks/useSeriesOptions';
import { useLocalStorage } from '@/lib/hooks/useLocalStorage';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useOptimisticMutation } from '@/lib/query/useOptimisticMutation';
import { nextSortState } from '@/lib/table/sort';
const ALL_COLUMNS = [
    { key: 'title', label: 'Title' },
    { key: 'network', label: 'Network' },
    { key: 'genres', label: 'Genres' },
    { key: 'rating', label: 'Rating' },
    { key: 'seasons', label: 'Seasons' },
    { key: 'episodes', label: 'Episodes' },
    { key: 'size', label: 'Size' },
    { key: 'nextAiring', label: 'Next Airing' },
    { key: 'status', label: 'Status' },
];
const DEFAULT_COLUMNS = ['title', 'network', 'status', 'seasons', 'episodes', 'nextAiring'];
function getEpisodeCount(row) {
    return row.seasons?.reduce((total, season) => total + (season.episodes?.length ?? 0), 0) ?? 0;
}
function getGenresLabel(row) {
    if (!Array.isArray(row.genres) || row.genres.length === 0) {
        return '-';
    }
    return row.genres.map(genre => String(genre)).join(', ');
}
function getNetworkLabel(row) {
    return typeof row.network === 'string' && row.network.trim().length > 0 ? row.network : '-';
}
function getRatingLabel(row) {
    const direct = typeof row.rating === 'number' ? row.rating : undefined;
    const nested = row.ratings && typeof row.ratings === 'object' && typeof row.ratings.value === 'number'
        ? row.ratings.value
        : undefined;
    const value = direct ?? nested;
    return typeof value === 'number' ? value.toFixed(1) : '-';
}
function getSeasonCount(row) {
    return Array.isArray(row.seasons) ? row.seasons.length : 0;
}
function getSeriesSize(row) {
    const fromStats = Number(row.statistics?.sizeOnDisk ?? 0);
    if (fromStats > 0) {
        return fromStats;
    }
    return (row.seasons?.reduce((seriesTotal, season) => {
        const seasonTotal = season.episodes?.reduce((episodeTotal, episode) => {
            const variantTotal = episode.fileVariants?.reduce((variantSum, variant) => {
                const parsed = Number(variant.fileSize ?? 0);
                return variantSum + (Number.isFinite(parsed) ? parsed : 0);
            }, 0) ?? 0;
            return episodeTotal + variantTotal;
        }, 0) ?? 0;
        return seriesTotal + seasonTotal;
    }, 0) ?? 0);
}
function formatSize(size) {
    if (size <= 0) {
        return '-';
    }
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = size;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
function getNextAiringDate(row) {
    const now = new Date();
    const dates = row.seasons
        ?.flatMap(season => season.episodes ?? [])
        .map(episode => episode.airDateUtc)
        .filter((airDate) => Boolean(airDate))
        .map(airDate => new Date(airDate))
        .filter(date => date.getTime() > now.getTime())
        .sort((left, right) => left.getTime() - right.getTime()) ?? [];
    return dates[0] ?? null;
}
function fileStatus(row) {
    const episodes = row.seasons?.flatMap(season => season.episodes ?? []) ?? [];
    if (episodes.length === 0) {
        return 'missing';
    }
    return episodes.some(episode => Boolean(episode.path)) ? 'completed' : 'wanted';
}
// Select All header component - renders the select all checkbox
function SelectAllHeader({ allIds }) {
    const { selectedIds, isSelected, toggleRow, clearSelection } = useSelectContext();
    const allSelected = allIds.length > 0 && allIds.every(id => isSelected(id));
    const someSelected = allIds.some(id => isSelected(id)) && !allSelected;
    const handleToggle = () => {
        if (allSelected) {
            clearSelection();
        }
        else {
            // Select all visible items that aren't already selected
            allIds.forEach(id => {
                if (!isSelected(id)) {
                    toggleRow(id);
                }
            });
        }
    };
    return (_jsx("input", { type: "checkbox", checked: allSelected, ref: input => {
            if (input) {
                input.indeterminate = someSelected;
            }
        }, onChange: handleToggle, "aria-label": "Select all series on this page", title: "Select all series on this page" }));
}
// Bulk Edit Toolbar component
function BulkEditToolbar({ onOpenBulkEdit }) {
    const { selectedIds, clearSelection } = useSelectContext();
    if (selectedIds.length === 0) {
        return null;
    }
    return (_jsxs("div", { className: "flex items-center gap-3 rounded-sm border border-accent-primary/50 bg-accent-primary/10 px-4 py-2 mb-3", children: [_jsxs("span", { className: "text-sm font-medium", children: [selectedIds.length, " series", selectedIds.length === 1 ? '' : '', " selected"] }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle bg-surface-1 px-3 py-1 text-sm hover:bg-surface-2", onClick: () => onOpenBulkEdit(selectedIds), children: "Bulk Edit" }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle bg-surface-1 px-3 py-1 text-sm hover:bg-surface-2", onClick: clearSelection, children: "Clear" })] }));
}
export default function SeriesLibraryPage() {
    const api = useMemo(() => getApiClients(), []);
    const queryClient = useQueryClient();
    const { pushToast } = useToast();
    const [viewMode, setViewMode] = useSeriesViewMode();
    const [visibleColumns, setVisibleColumns] = useLocalStorage('mediarr:series:list-columns', DEFAULT_COLUMNS);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('title');
    const [sortDir, setSortDir] = useState('asc');
    const [jump, setJump] = useState('All');
    const [selectedFilterId, setSelectedFilterId] = useState(null);
    const [customFilter, setCustomFilter] = useState(null);
    const [filterBuilderOpen, setFilterBuilderOpen] = useState(false);
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
    const [selectedSeriesIds, setSelectedSeriesIds] = useState([]);
    const filtersQuery = useApiQuery({
        queryKey: queryKeys.filtersList('series'),
        queryFn: () => api.filtersApi.list('series'),
        staleTimeKind: 'list',
        isEmpty: data => data.length === 0,
    });
    const savedFilters = filtersQuery.data ?? [];
    const activeSavedFilter = typeof selectedFilterId === 'number' ? savedFilters.find(filter => filter.id === selectedFilterId) ?? null : null;
    const queryInput = {
        page,
        pageSize: 25,
        search: search.trim() || undefined,
        sortBy,
        sortDir,
        filterId: typeof selectedFilterId === 'number' ? selectedFilterId : undefined,
        customFilter: selectedFilterId === 'custom' && customFilter ? JSON.stringify(customFilter) : undefined,
        jump: jump === 'All' ? undefined : jump,
    };
    const seriesQuery = useApiQuery({
        queryKey: queryKeys.seriesList(queryInput),
        queryFn: () => api.mediaApi.listSeries(queryInput),
        staleTimeKind: 'list',
        isEmpty: data => data.items.length === 0,
    });
    const monitoredMutation = useOptimisticMutation({
        queryKey: ['series'],
        mutationFn: ({ id, monitored }) => api.mediaApi.setSeriesMonitored(id, monitored),
        updater: (current, variables) => ({
            ...current,
            items: current.items.map(item => item.id === variables.id
                ? {
                    ...item,
                    monitored: variables.monitored,
                }
                : item),
        }),
        errorMessage: 'Could not update monitored state.',
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => api.mediaApi.deleteSeries(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['series'] });
            pushToast({
                title: 'Series deleted',
                variant: 'success',
            });
        },
    });
    const handleViewModeChange = (mode) => {
        setViewMode(mode);
    };
    const data = seriesQuery.data;
    const series = (data?.items ?? []);
    // Get selected series titles for the modal
    const selectedSeriesTitles = useMemo(() => {
        return selectedSeriesIds
            .map(id => series.find(s => s.id === id)?.title)
            .filter(Boolean);
    }, [selectedSeriesIds, series]);
    const activeFilterForBuilder = selectedFilterId === 'custom'
        ? {
            id: undefined,
            name: 'Custom',
            conditions: customFilter ?? { operator: 'and', conditions: [] },
        }
        : activeSavedFilter;
    const applyBuilderFilter = (conditions) => {
        setPage(1);
        setSelectedFilterId('custom');
        setCustomFilter(conditions);
    };
    return (_jsxs("section", { className: "space-y-4", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Series Library" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Browse monitored series with paging, sorting, and row-level actions." })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-4", children: [_jsxs("label", { className: "block space-y-1 text-sm", children: [_jsx("span", { className: "sr-only", children: "Filter by title" }), _jsx("input", { value: search, onChange: event => {
                                    setPage(1);
                                    setSearch(event.currentTarget.value);
                                }, className: "w-64 rounded-sm border border-border-subtle bg-surface-1 px-3 py-2", placeholder: "Search series..." })] }), _jsx(SortMenu, { label: "Sort", value: sortBy, direction: sortDir, options: [
                            { key: 'title', label: 'Title' },
                            { key: 'year', label: 'Year' },
                            { key: 'status', label: 'Status' },
                        ], onChange: key => {
                            if (key === 'title' || key === 'year' || key === 'status') {
                                setSortBy(key);
                                setSortDir('asc');
                            }
                        }, onDirectionChange: setSortDir }), _jsx(FilterDropdown, { filters: savedFilters, selectedFilterId: selectedFilterId, onSelectFilter: value => {
                            setPage(1);
                            setSelectedFilterId(value);
                            if (value !== 'custom') {
                                setCustomFilter(null);
                            }
                        }, onOpenBuilder: () => setFilterBuilderOpen(true) }), _jsx(ColumnPicker, { options: ALL_COLUMNS, visibleColumns: visibleColumns, onChange: columns => setVisibleColumns(columns) }), _jsxs("div", { className: "flex items-center gap-1 rounded-sm border border-border-subtle bg-surface-1 p-1", children: [_jsx("button", { type: "button", className: `rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'table'
                                    ? 'bg-surface-3 text-text-primary'
                                    : 'text-text-secondary hover:text-text-primary'}`, onClick: () => handleViewModeChange('table'), "aria-label": "Table view", "aria-pressed": viewMode === 'table', children: "Table" }), _jsx("button", { type: "button", className: `rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'posters'
                                    ? 'bg-surface-3 text-text-primary'
                                    : 'text-text-secondary hover:text-text-primary'}`, onClick: () => handleViewModeChange('posters'), "aria-label": "Poster view", "aria-pressed": viewMode === 'posters', children: "Posters" }), _jsx("button", { type: "button", className: `rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'overview'
                                    ? 'bg-surface-3 text-text-primary'
                                    : 'text-text-secondary hover:text-text-primary'}`, onClick: () => handleViewModeChange('overview'), "aria-label": "Overview view", "aria-pressed": viewMode === 'overview', children: "Overview" })] }), _jsxs(Link, { href: "/library/series/seasonpass", className: "flex items-center gap-1.5 rounded-sm border border-border-subtle bg-surface-1 px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary", children: [_jsx(Icon, { name: "check", className: "h-4 w-4" }), "Season Pass"] })] }), _jsx(QueryPanel, { isLoading: seriesQuery.isPending, isError: seriesQuery.isError, isEmpty: seriesQuery.isResolvedEmpty, errorMessage: seriesQuery.error?.message, onRetry: () => void seriesQuery.refetch(), emptyTitle: "No series found", emptyBody: "Adjust filters or add a new series from Add Media.", children: viewMode === 'table' ? (_jsxs(SelectProvider, { rowIds: series.map(s => s.id), children: [_jsx(BulkEditToolbar, { onOpenBulkEdit: (ids) => {
                                setSelectedSeriesIds(ids);
                                setIsBulkEditOpen(true);
                            } }), _jsx(JumpBar, { value: jump, onChange: value => {
                                setPage(1);
                                setJump(value);
                            } }), _jsx("div", { className: "overflow-x-auto rounded-sm border border-border-subtle", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-surface-2 text-text-secondary", children: _jsxs("tr", { children: [_jsx("th", { className: "w-10 px-3 py-2", children: _jsx(SelectAllHeader, { allIds: series.map(s => s.id) }) }), visibleColumns.includes('title') && (_jsx("th", { className: "px-3 py-2 font-semibold text-left", children: _jsxs("button", { type: "button", className: "inline-flex items-center gap-1 text-left", onClick: () => {
                                                            const next = nextSortState({ key: sortBy, direction: sortDir }, 'title');
                                                            setSortBy(next.key);
                                                            setSortDir(next.direction);
                                                        }, children: ["Title", sortBy === 'title' && (_jsx("span", { "aria-hidden": "true", children: sortDir === 'asc' ? '↑' : '↓' }))] }) })), visibleColumns.includes('network') && _jsx("th", { className: "px-3 py-2 font-semibold text-left", children: "Network" }), visibleColumns.includes('genres') && _jsx("th", { className: "px-3 py-2 font-semibold text-left", children: "Genres" }), visibleColumns.includes('rating') && _jsx("th", { className: "px-3 py-2 font-semibold text-left", children: "Rating" }), visibleColumns.includes('seasons') && _jsx("th", { className: "px-3 py-2 font-semibold text-left", children: "Seasons" }), visibleColumns.includes('episodes') && _jsx("th", { className: "px-3 py-2 font-semibold text-left", children: "Episodes" }), visibleColumns.includes('size') && _jsx("th", { className: "px-3 py-2 font-semibold text-left", children: "Size" }), visibleColumns.includes('nextAiring') && _jsx("th", { className: "px-3 py-2 font-semibold text-left", children: "Next Airing" }), visibleColumns.includes('status') && (_jsx("th", { className: "px-3 py-2 font-semibold text-left", children: _jsxs("button", { type: "button", className: "inline-flex items-center gap-1 text-left", onClick: () => {
                                                            const next = nextSortState({ key: sortBy, direction: sortDir }, 'status');
                                                            setSortBy(next.key);
                                                            setSortDir(next.direction);
                                                        }, children: ["Status", sortBy === 'status' && (_jsx("span", { "aria-hidden": "true", children: sortDir === 'asc' ? '↑' : '↓' }))] }) })), _jsx("th", { className: "px-3 py-2 font-semibold text-right", children: "Actions" })] }) }), _jsx("tbody", { className: "divide-y divide-border-subtle bg-surface-1", children: series.map(row => (_jsxs("tr", { className: "hover:bg-surface-2", children: [_jsx(SelectCheckboxCell, { rowId: row.id }), visibleColumns.includes('title') && (_jsx("td", { className: "px-3 py-2", children: _jsx(Link, { href: `/library/series/${row.id}`, className: "font-medium hover:underline", children: row.title }) })), visibleColumns.includes('network') && _jsx("td", { className: "px-3 py-2", children: getNetworkLabel(row) }), visibleColumns.includes('genres') && _jsx("td", { className: "px-3 py-2", children: getGenresLabel(row) }), visibleColumns.includes('rating') && _jsx("td", { className: "px-3 py-2", children: getRatingLabel(row) }), visibleColumns.includes('seasons') && _jsx("td", { className: "px-3 py-2", children: getSeasonCount(row) }), visibleColumns.includes('episodes') && _jsx("td", { className: "px-3 py-2", children: getEpisodeCount(row) }), visibleColumns.includes('size') && _jsx("td", { className: "px-3 py-2", children: formatSize(getSeriesSize(row)) }), visibleColumns.includes('nextAiring') && (_jsx("td", { className: "px-3 py-2", children: getNextAiringDate(row)?.toLocaleDateString() ?? '-' })), visibleColumns.includes('status') && (_jsx("td", { className: "px-3 py-2", children: _jsx(StatusBadge, { status: row.status ?? 'unknown' }) })), _jsx("td", { className: "px-3 py-2", children: _jsxs("div", { className: "flex justify-end gap-2", children: [_jsxs("label", { className: "inline-flex items-center gap-1 rounded-sm border border-border-subtle px-2 py-1 text-xs", children: [_jsx("input", { type: "checkbox", checked: Boolean(row.monitored), onChange: event => {
                                                                            monitoredMutation.mutate({
                                                                                id: row.id,
                                                                                monitored: event.currentTarget.checked,
                                                                            });
                                                                        } }), row.monitored ? 'Monitored' : 'Unmonitored'] }), _jsxs("span", { className: "inline-flex items-center rounded-sm border border-border-subtle px-2 py-1 text-xs", children: ["File: ", fileStatus(row)] }), _jsx(Link, { href: `/library/series/${row.id}`, className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", children: "Open" }), _jsx("button", { type: "button", className: "rounded-sm border border-status-error/60 px-2 py-1 text-xs text-status-error", onClick: () => {
                                                                    const confirmed = window.confirm(`Delete ${row.title}?`);
                                                                    if (!confirmed) {
                                                                        return;
                                                                    }
                                                                    deleteMutation.mutate(row.id);
                                                                }, children: "Delete" })] }) })] }, row.id))) })] }) }), data && data.meta.totalPages > 1 && (_jsxs("div", { className: "flex justify-center gap-2 pt-4", children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-4 py-2 text-sm transition-colors hover:bg-surface-2 disabled:opacity-50", onClick: () => setPage(current => Math.max(1, current - 1)), disabled: page === 1, children: "Previous" }), _jsxs("span", { className: "px-4 py-2 text-sm text-text-secondary", children: ["Page ", page, " of ", data.meta.totalPages] }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-4 py-2 text-sm transition-colors hover:bg-surface-2 disabled:opacity-50", onClick: () => setPage(current => Math.min(data.meta.totalPages, current + 1)), disabled: page === data.meta.totalPages, children: "Next" })] }))] })) : viewMode === 'posters' ? (_jsxs("div", { className: "space-y-4", children: [_jsx(SeriesPosterView, { items: series, onToggleMonitored: (id, monitored) => {
                                monitoredMutation.mutate({ id, monitored });
                            }, onDelete: id => {
                                const item = series.find(i => i.id === id);
                                if (item) {
                                    const confirmed = window.confirm(`Delete ${item.title}?`);
                                    if (confirmed) {
                                        deleteMutation.mutate(id);
                                    }
                                }
                            } }), data && data.meta.totalPages > 1 && (_jsxs("div", { className: "flex justify-center gap-2", children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle bg-surface-1 px-3 py-1.5 text-xs hover:bg-surface-2 disabled:opacity-50", onClick: () => setPage(current => Math.max(1, current - 1)), disabled: page === 1, children: "Previous" }), _jsxs("span", { className: "flex items-center px-2 text-xs text-text-secondary", children: ["Page ", page, " of ", data.meta.totalPages] }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle bg-surface-1 px-3 py-1.5 text-xs hover:bg-surface-2 disabled:opacity-50", onClick: () => setPage(current => Math.min(data.meta.totalPages, current + 1)), disabled: page === data.meta.totalPages, children: "Next" })] }))] })) : (_jsxs("div", { className: "space-y-4", children: [_jsx(SeriesOverviewView, { items: series, onToggleMonitored: (id, monitored) => {
                                monitoredMutation.mutate({ id, monitored });
                            }, onDelete: id => {
                                const item = series.find(i => i.id === id);
                                if (item) {
                                    const confirmed = window.confirm(`Delete ${item.title}?`);
                                    if (confirmed) {
                                        deleteMutation.mutate(id);
                                    }
                                }
                            } }), data && data.meta.totalPages > 1 && (_jsxs("div", { className: "flex justify-center gap-2", children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle bg-surface-1 px-3 py-1.5 text-xs hover:bg-surface-2 disabled:opacity-50", onClick: () => setPage(current => Math.max(1, current - 1)), disabled: page === 1, children: "Previous" }), _jsxs("span", { className: "flex items-center px-2 text-xs text-text-secondary", children: ["Page ", page, " of ", data.meta.totalPages] }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle bg-surface-1 px-3 py-1.5 text-xs hover:bg-surface-2 disabled:opacity-50", onClick: () => setPage(current => Math.min(data.meta.totalPages, current + 1)), disabled: page === data.meta.totalPages, children: "Next" })] }))] })) }), _jsx(FilterBuilder, { isOpen: filterBuilderOpen, activeFilter: activeFilterForBuilder, onClose: () => setFilterBuilderOpen(false), onApply: conditions => {
                    applyBuilderFilter(conditions);
                    setFilterBuilderOpen(false);
                }, onSave: async ({ id, name, conditions }) => {
                    if (id) {
                        await api.filtersApi.update(id, { name, conditions });
                    }
                    else {
                        const created = await api.filtersApi.create({ name, type: 'series', conditions });
                        setSelectedFilterId(created.id);
                        setCustomFilter(null);
                    }
                    await queryClient.invalidateQueries({ queryKey: queryKeys.filtersList('series') });
                    pushToast({ title: 'Filter saved', variant: 'success' });
                    setFilterBuilderOpen(false);
                }, onDelete: async (id) => {
                    await api.filtersApi.delete(id);
                    await queryClient.invalidateQueries({ queryKey: queryKeys.filtersList('series') });
                    setSelectedFilterId(null);
                    setCustomFilter(null);
                    setFilterBuilderOpen(false);
                    pushToast({ title: 'Filter deleted', variant: 'success' });
                } }), _jsx(SeriesBulkEditModal, { isOpen: isBulkEditOpen, onClose: () => setIsBulkEditOpen(false), selectedSeriesIds: selectedSeriesIds, selectedSeriesTitles: selectedSeriesTitles })] }));
}
//# sourceMappingURL=page.js.map