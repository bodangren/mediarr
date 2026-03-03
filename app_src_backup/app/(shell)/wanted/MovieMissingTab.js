'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { Button } from '@/components/primitives/Button';
import { ConfirmModal } from '@/components/primitives/Modal';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import {} from '@/lib/api/wantedApi';
export function MovieMissingTab({ onSearchMovie, onBulkSearch }) {
    const api = useMemo(() => getApiClients(), []);
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState('cinemaDate');
    const [sortDir, setSortDir] = useState('desc');
    const [selectedMovies, setSelectedMovies] = useState(new Set());
    const [movieToDelete, setMovieToDelete] = useState(null);
    const missingQuery = useApiQuery({
        queryKey: queryKeys.missingMovies({ page, pageSize: 25, sortBy, sortDir }),
        queryFn: () => api.wantedApi.listMissingMovies({ page, pageSize: 25, sortBy, sortDir }),
        isEmpty: (data) => data.items.length === 0,
    });
    const toggleMonitoredMutation = useMutation({
        mutationFn: ({ id, monitored }) => api.movieApi.update(id, { monitored }),
        onSuccess: () => {
            missingQuery.refetch();
        },
    });
    const deleteMovieMutation = useMutation({
        mutationFn: (id) => api.movieApi.remove(id),
        onSuccess: () => {
            setMovieToDelete(null);
            missingQuery.refetch();
        },
    });
    const handleToggleMonitored = (movie) => {
        toggleMonitoredMutation.mutate({ id: movie.id, monitored: !movie.monitored });
    };
    const handleEditMovie = (movie) => {
        router.push(`/library/movies/${movie.movieId}`);
    };
    const handleDeleteMovie = (movie) => {
        setMovieToDelete(movie);
    };
    const confirmDeleteMovie = () => {
        if (movieToDelete) {
            deleteMovieMutation.mutate(movieToDelete.id);
        }
    };
    const cancelDeleteMovie = () => {
        setMovieToDelete(null);
    };
    const columns = [
        {
            key: 'select',
            header: '',
            render: row => (_jsx("input", { type: "checkbox", checked: selectedMovies.has(row.id), onChange: () => {
                    const newSelected = new Set(selectedMovies);
                    if (newSelected.has(row.id)) {
                        newSelected.delete(row.id);
                    }
                    else {
                        newSelected.add(row.id);
                    }
                    setSelectedMovies(newSelected);
                }, className: "rounded-sm border-border-subtle bg-surface-1" })),
        },
        {
            key: 'movie',
            header: 'Movie',
            render: row => (_jsxs("div", { className: "flex items-center gap-3", children: [row.posterUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    _jsx("img", { src: row.posterUrl, alt: row.title, className: "h-12 w-8 rounded-sm object-cover" })), _jsxs("div", { children: [_jsx("div", { className: "font-medium", children: row.title }), _jsx("div", { className: "text-sm text-text-secondary", children: row.year })] })] })),
        },
        {
            key: 'status',
            header: 'Status',
            render: row => _jsx(StatusBadge, { status: row.status === 'missing' ? 'wanted' : 'monitored' }),
        },
        {
            key: 'releaseDates',
            header: 'Release Dates',
            render: row => (_jsxs("div", { className: "flex flex-col gap-1 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-text-secondary", children: "Cinema:" }), ' ', _jsx("span", { className: "text-text-primary", children: row.cinemaDate || '-' })] }), _jsxs("div", { children: [_jsx("span", { className: "text-text-secondary", children: "Digital:" }), ' ', _jsx("span", { className: "text-text-primary", children: row.digitalRelease || '-' })] }), _jsxs("div", { children: [_jsx("span", { className: "text-text-secondary", children: "Physical:" }), ' ', _jsx("span", { className: "text-text-primary", children: row.physicalRelease || '-' })] })] })),
        },
        {
            key: 'qualityProfile',
            header: 'Quality Profile',
            render: row => _jsx("span", { className: "text-sm", children: row.qualityProfileName || '-' }),
        },
        {
            key: 'runtime',
            header: 'Runtime',
            render: row => _jsx("span", { className: "text-sm", children: row.runtime ? `${row.runtime} min` : '-' }),
        },
        {
            key: 'monitored',
            header: 'Monitored',
            render: row => (_jsx("button", { type: "button", onClick: () => handleToggleMonitored(row), disabled: toggleMonitoredMutation.isPending, className: `rounded-sm px-2 py-1 text-xs font-medium transition-colors ${row.monitored
                    ? 'bg-accent-success text-text-primary'
                    : 'bg-surface-2 text-text-secondary'} ${toggleMonitoredMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`, children: row.monitored ? 'Monitored' : 'Unmonitored' })),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: row => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => onSearchMovie(row), className: "px-2 py-1 text-xs", children: "Search" }), _jsx(Button, { variant: "secondary", onClick: () => handleEditMovie(row), className: "px-2 py-1 text-xs", children: "Edit" }), _jsx(Button, { variant: "secondary", onClick: () => handleDeleteMovie(row), className: "px-2 py-1 text-xs text-accent-danger", children: "Delete" })] })),
        },
    ];
    const handleSort = (key) => {
        if (key === sortBy) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        }
        else {
            setSortBy(key);
            setSortDir('asc');
        }
        setPage(1);
    };
    const handleBulkSearch = () => {
        if (!missingQuery.data)
            return;
        const selectedItems = missingQuery.data.items.filter(item => selectedMovies.has(item.id));
        if (selectedItems.length > 0) {
            onBulkSearch(selectedItems);
            setSelectedMovies(new Set());
        }
    };
    return (_jsxs("section", { className: "space-y-4", children: [_jsxs("header", { className: "flex flex-wrap items-center justify-between gap-2", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold", children: "Missing Movies" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Monitored movies that are not yet downloaded." })] }), selectedMovies.size > 0 && (_jsxs(Button, { variant: "primary", onClick: handleBulkSearch, children: ["Search ", selectedMovies.size, " selected"] }))] }), _jsx(QueryPanel, { isLoading: missingQuery.isPending, isError: missingQuery.isError, isEmpty: missingQuery.isResolvedEmpty, errorMessage: missingQuery.error instanceof Error ? missingQuery.error.message : undefined, onRetry: () => void missingQuery.refetch(), emptyTitle: "No missing movies", emptyBody: "All monitored movies have been downloaded.", children: missingQuery.data && (_jsx(DataTable, { data: missingQuery.data.items, columns: columns, getRowId: row => row.id, pagination: {
                        page,
                        totalPages: missingQuery.data.meta.totalPages,
                        onPrev: () => setPage(current => Math.max(1, current - 1)),
                        onNext: () => setPage(current => Math.min(missingQuery.data.meta.totalPages, current + 1)),
                    }, sort: { key: sortBy, direction: sortDir }, onSort: handleSort })) }), _jsx(ConfirmModal, { isOpen: movieToDelete !== null, title: "Delete Movie", description: movieToDelete ? (_jsxs(_Fragment, { children: ["Are you sure you want to delete ", _jsxs("strong", { children: [movieToDelete.title, " (", movieToDelete.year, ")"] }), "? This action cannot be undone."] })) : undefined, onCancel: cancelDeleteMovie, onConfirm: confirmDeleteMovie, confirmLabel: deleteMovieMutation.isPending ? 'Deleting...' : 'Delete', isConfirming: deleteMovieMutation.isPending })] }));
}
//# sourceMappingURL=MovieMissingTab.js.map