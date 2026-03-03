'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { SortMenu } from '@/components/primitives/SortMenu';
import { ViewMenu } from '@/components/primitives/ViewMenu';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { SelectProvider, useSelectContext } from '@/components/primitives/SelectProvider';
import { SelectCheckboxCell } from '@/components/primitives/SelectCheckboxCell';
import { MoviePosterView, MovieOverviewView } from '@/components/views';
import { MovieBulkEditModal } from '@/components/movie';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useOptimisticMutation } from '@/lib/query/useOptimisticMutation';
import { nextSortState } from '@/lib/table/sort';
import { getFileStatus } from '@/types/movie';
function fileStatus(item) {
    return getFileStatus(item);
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
        }, onChange: handleToggle, "aria-label": "Select all movies on this page", title: "Select all movies on this page" }));
}
// Bulk Edit Toolbar component
function BulkEditToolbar({ onOpenBulkEdit }) {
    const { selectedIds, clearSelection } = useSelectContext();
    if (selectedIds.length === 0) {
        return null;
    }
    return (_jsxs("div", { className: "flex items-center gap-3 rounded-sm border border-accent-primary/50 bg-accent-primary/10 px-4 py-2 mb-3", children: [_jsxs("span", { className: "text-sm font-medium", children: [selectedIds.length, " movie", selectedIds.length === 1 ? '' : 's', " selected"] }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle bg-surface-1 px-3 py-1 text-sm hover:bg-surface-2", onClick: () => onOpenBulkEdit(selectedIds), children: "Bulk Edit" }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle bg-surface-1 px-3 py-1 text-sm hover:bg-surface-2", onClick: clearSelection, children: "Clear" })] }));
}
export default function MoviesLibraryPage() {
    const api = useMemo(() => getApiClients(), []);
    const queryClient = useQueryClient();
    const { pushToast } = useToast();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('title');
    const [sortDir, setSortDir] = useState('asc');
    const [viewMode, setViewMode] = useState('table');
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
    const [selectedMovieIds, setSelectedMovieIds] = useState([]);
    const queryInput = {
        page,
        pageSize: 25,
        search: search.trim() || undefined,
        sortBy,
        sortDir,
    };
    const moviesQuery = useApiQuery({
        queryKey: queryKeys.moviesList(queryInput),
        queryFn: () => api.mediaApi.listMovies(queryInput),
        staleTimeKind: 'list',
        isEmpty: data => data.items.length === 0,
    });
    const monitoredMutation = useOptimisticMutation({
        queryKey: ['movies'],
        mutationFn: ({ id, monitored }) => api.mediaApi.setMovieMonitored(id, monitored),
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
        mutationFn: (id) => api.mediaApi.deleteMovie(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['movies'] });
            pushToast({
                title: 'Movie deleted',
                variant: 'success',
            });
        },
    });
    const searchMutation = useMutation({
        mutationFn: async (movieId) => {
            if (!moviesQuery.data) {
                return 0;
            }
            const movie = moviesQuery.data.items.find(m => m.id === movieId);
            if (!movie) {
                return 0;
            }
            const candidates = await api.releaseApi.searchCandidates({
                type: 'movie',
                title: movie.title,
                year: movie.year,
            });
            return candidates.meta.totalCount;
        },
        onSuccess: (count, movieId) => {
            const movie = moviesQuery.data?.items.find(m => m.id === movieId);
            pushToast({
                title: 'Search complete',
                message: `${count} candidate releases found for ${movie?.title || 'movie'}.`,
                variant: 'success',
            });
        },
    });
    const columns = useMemo(() => [
        {
            key: 'title',
            header: 'Title',
            sortable: true,
            render: row => (_jsx("a", { href: `/library/movies/${row.id}`, className: "font-medium hover:underline", children: row.title })),
        },
        {
            key: 'year',
            header: 'Year',
            sortable: true,
            render: row => row.year ?? '-',
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: row => _jsx(StatusBadge, { status: row.status ?? 'unknown' }),
        },
        {
            key: 'fileState',
            header: 'File',
            render: row => _jsx(StatusBadge, { status: fileStatus(row) }),
        },
        {
            key: 'monitored',
            header: 'Monitored',
            render: row => (_jsxs("label", { className: "inline-flex items-center gap-2 text-xs", children: [_jsx("input", { type: "checkbox", checked: Boolean(row.monitored), onChange: event => {
                            monitoredMutation.mutate({
                                id: row.id,
                                monitored: event.currentTarget.checked,
                            });
                        } }), row.monitored ? 'On' : 'Off'] })),
        },
    ], [monitoredMutation]);
    const data = moviesQuery.data;
    const movies = data?.items ?? [];
    // Get selected movie titles for the modal
    const selectedMovieTitles = useMemo(() => {
        return selectedMovieIds
            .map(id => movies.find(m => m.id === id)?.title)
            .filter(Boolean);
    }, [selectedMovieIds, movies]);
    return (_jsxs("section", { className: "space-y-4", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Movie Library" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Browse monitored movies with paging, sorting, and multiple view modes." })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-4", children: [_jsxs("label", { className: "block space-y-1 text-sm", children: [_jsx("span", { className: "sr-only", children: "Filter by title" }), _jsx("input", { value: search, onChange: event => {
                                    setPage(1);
                                    setSearch(event.currentTarget.value);
                                }, className: "w-64 rounded-sm border border-border-subtle bg-surface-1 px-3 py-2", placeholder: "Search movies..." })] }), _jsx(SortMenu, { label: "Sort", value: sortBy, direction: sortDir, options: [
                            { key: 'title', label: 'Title' },
                            { key: 'year', label: 'Year' },
                            { key: 'status', label: 'Status' },
                        ], onChange: key => {
                            if (key === 'title' || key === 'year' || key === 'status') {
                                setSortBy(key);
                                setSortDir('asc');
                            }
                        }, onDirectionChange: setSortDir }), _jsx(ViewMenu, { value: viewMode, onChange: setViewMode })] }), _jsxs(QueryPanel, { isLoading: moviesQuery.isPending, isError: moviesQuery.isError, isEmpty: moviesQuery.isResolvedEmpty, errorMessage: moviesQuery.error?.message, onRetry: () => void moviesQuery.refetch(), emptyTitle: "No movies found", emptyBody: "Adjust filters or add a new movie from Add Media.", children: [viewMode === 'table' && (_jsxs(SelectProvider, { rowIds: movies.map(m => m.id), children: [_jsx(BulkEditToolbar, { onOpenBulkEdit: (ids) => {
                                    setSelectedMovieIds(ids);
                                    setIsBulkEditOpen(true);
                                } }), _jsx("div", { className: "overflow-x-auto rounded-sm border border-border-subtle", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-surface-2 text-text-secondary", children: _jsxs("tr", { children: [_jsx("th", { className: "w-10 px-3 py-2", children: _jsx(SelectAllHeader, { allIds: movies.map(m => m.id) }) }), _jsx("th", { className: "px-3 py-2 font-semibold text-left", children: _jsxs("button", { type: "button", className: "inline-flex items-center gap-1 text-left", onClick: () => {
                                                                const next = nextSortState({ key: sortBy, direction: sortDir }, 'title');
                                                                setSortBy(next.key);
                                                                setSortDir(next.direction);
                                                            }, children: ["Title", sortBy === 'title' && (_jsx("span", { "aria-hidden": "true", children: sortDir === 'asc' ? '↑' : '↓' }))] }) }), _jsx("th", { className: "px-3 py-2 font-semibold text-left", children: _jsxs("button", { type: "button", className: "inline-flex items-center gap-1 text-left", onClick: () => {
                                                                const next = nextSortState({ key: sortBy, direction: sortDir }, 'year');
                                                                setSortBy(next.key);
                                                                setSortDir(next.direction);
                                                            }, children: ["Year", sortBy === 'year' && (_jsx("span", { "aria-hidden": "true", children: sortDir === 'asc' ? '↑' : '↓' }))] }) }), _jsx("th", { className: "px-3 py-2 font-semibold text-left", children: _jsxs("button", { type: "button", className: "inline-flex items-center gap-1 text-left", onClick: () => {
                                                                const next = nextSortState({ key: sortBy, direction: sortDir }, 'status');
                                                                setSortBy(next.key);
                                                                setSortDir(next.direction);
                                                            }, children: ["Status", sortBy === 'status' && (_jsx("span", { "aria-hidden": "true", children: sortDir === 'asc' ? '↑' : '↓' }))] }) }), _jsx("th", { className: "px-3 py-2 font-semibold text-left", children: "File" }), _jsx("th", { className: "px-3 py-2 font-semibold text-left", children: "Monitored" }), _jsx("th", { className: "px-3 py-2 font-semibold text-right", children: "Actions" })] }) }), _jsx("tbody", { className: "divide-y divide-border-subtle bg-surface-1", children: movies.map(row => (_jsxs("tr", { className: "hover:bg-surface-2", children: [_jsx("td", { className: "w-10 px-3 py-2", children: _jsx(SelectCheckboxCell, { rowId: row.id }) }), _jsx("td", { className: "px-3 py-2", children: _jsx("a", { href: `/library/movies/${row.id}`, className: "font-medium hover:underline", children: row.title }) }), _jsx("td", { className: "px-3 py-2", children: row.year ?? '-' }), _jsx("td", { className: "px-3 py-2", children: _jsx(StatusBadge, { status: row.status ?? 'unknown' }) }), _jsx("td", { className: "px-3 py-2", children: _jsx(StatusBadge, { status: fileStatus(row) }) }), _jsx("td", { className: "px-3 py-2", children: _jsxs("label", { className: "inline-flex items-center gap-2 text-xs", children: [_jsx("input", { type: "checkbox", checked: Boolean(row.monitored), onChange: event => {
                                                                        monitoredMutation.mutate({
                                                                            id: row.id,
                                                                            monitored: event.currentTarget.checked,
                                                                        });
                                                                    } }), row.monitored ? 'On' : 'Off'] }) }), _jsx("td", { className: "px-3 py-2", children: _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("a", { href: `/library/movies/${row.id}`, className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", children: "Open" }), _jsx("button", { type: "button", className: "rounded-sm border border-status-error/60 px-2 py-1 text-xs text-status-error", onClick: () => {
                                                                        const confirmed = window.confirm(`Delete ${row.title}?`);
                                                                        if (!confirmed) {
                                                                            return;
                                                                        }
                                                                        deleteMutation.mutate(row.id);
                                                                    }, children: "Delete" })] }) })] }, row.id))) })] }) }), data && data.meta.totalPages > 1 && (_jsxs("div", { className: "flex justify-center gap-2 pt-4", children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-4 py-2 text-sm transition-colors hover:bg-surface-2 disabled:opacity-50", onClick: () => setPage(current => Math.max(1, current - 1)), disabled: page === 1, children: "Previous" }), _jsxs("span", { className: "px-4 py-2 text-sm text-text-secondary", children: ["Page ", page, " of ", data.meta.totalPages] }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-4 py-2 text-sm transition-colors hover:bg-surface-2 disabled:opacity-50", onClick: () => setPage(current => Math.min(data.meta.totalPages, current + 1)), disabled: page === data.meta.totalPages, children: "Next" })] }))] })), viewMode === 'poster' && (_jsxs(_Fragment, { children: [_jsx(MoviePosterView, { items: movies, onToggleMonitored: (id, monitored) => {
                                    monitoredMutation.mutate({ id, monitored });
                                }, onDelete: id => {
                                    const movie = movies.find(m => m.id === id);
                                    const confirmed = window.confirm(`Delete ${movie?.title || 'this movie'}?`);
                                    if (confirmed) {
                                        deleteMutation.mutate(id);
                                    }
                                }, onSearch: id => {
                                    searchMutation.mutate(id);
                                }, isLoading: moviesQuery.isPending }), data && data.meta.totalPages > 1 && (_jsxs("div", { className: "flex justify-center gap-2 pt-4", children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-4 py-2 text-sm transition-colors hover:bg-surface-2 disabled:opacity-50", onClick: () => setPage(current => Math.max(1, current - 1)), disabled: page === 1, children: "Previous" }), _jsxs("span", { className: "px-4 py-2 text-sm text-text-secondary", children: ["Page ", page, " of ", data.meta.totalPages] }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-4 py-2 text-sm transition-colors hover:bg-surface-2 disabled:opacity-50", onClick: () => setPage(current => Math.min(data.meta.totalPages, current + 1)), disabled: page === data.meta.totalPages, children: "Next" })] }))] })), viewMode === 'overview' && (_jsxs(_Fragment, { children: [_jsx(MovieOverviewView, { items: movies, onToggleMonitored: (id, monitored) => {
                                    monitoredMutation.mutate({ id, monitored });
                                }, onDelete: id => {
                                    const movie = movies.find(m => m.id === id);
                                    const confirmed = window.confirm(`Delete ${movie?.title || 'this movie'}?`);
                                    if (confirmed) {
                                        deleteMutation.mutate(id);
                                    }
                                }, onSearch: id => {
                                    searchMutation.mutate(id);
                                }, isLoading: moviesQuery.isPending }), data && data.meta.totalPages > 1 && (_jsxs("div", { className: "flex justify-center gap-2 pt-4", children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-4 py-2 text-sm transition-colors hover:bg-surface-2 disabled:opacity-50", onClick: () => setPage(current => Math.max(1, current - 1)), disabled: page === 1, children: "Previous" }), _jsxs("span", { className: "px-4 py-2 text-sm text-text-secondary", children: ["Page ", page, " of ", data.meta.totalPages] }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-4 py-2 text-sm transition-colors hover:bg-surface-2 disabled:opacity-50", onClick: () => setPage(current => Math.min(data.meta.totalPages, current + 1)), disabled: page === data.meta.totalPages, children: "Next" })] }))] }))] }), _jsx(MovieBulkEditModal, { isOpen: isBulkEditOpen, onClose: () => setIsBulkEditOpen(false), selectedMovieIds: selectedMovieIds, selectedMovieTitles: selectedMovieTitles })] }));
}
//# sourceMappingURL=page.js.map