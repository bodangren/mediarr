'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { Button } from '@/components/primitives/Button';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { formatBytes } from '@/lib/format';
import { QualityComparison } from '@/components/wanted/QualityComparison';
export function MovieCutoffUnmetTab({ onSearchMovie, onBulkSearch }) {
    const api = useMemo(() => getApiClients(), []);
    const queryClient = useQueryClient();
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState('qualityGap');
    const [sortDir, setSortDir] = useState('desc');
    const [selectedMovies, setSelectedMovies] = useState(new Set());
    const cutoffUnmetQuery = useQuery({
        queryKey: queryKeys.cutoffUnmetMovies({ page, pageSize: 25, sortBy, sortDir }),
        queryFn: () => api.wantedApi.listCutoffUnmetMovies({ page, pageSize: 25, sortBy, sortDir }),
    });
    const toggleMonitoredMutation = useMutation({
        mutationFn: ({ id, monitored }) => api.movieApi.update(id, { monitored }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['movies', 'cutoff-unmet'] });
        },
    });
    const handleToggleMonitored = (movie) => {
        toggleMonitoredMutation.mutate({ id: movie.id, monitored: !movie.monitored });
    };
    const handleEditMovie = (movie) => {
        router.push(`/library/movies/${movie.movieId}`);
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
            key: 'quality',
            header: 'Quality',
            render: row => _jsx(QualityComparison, { current: row.currentQuality, cutoff: row.cutoffQuality }),
        },
        {
            key: 'qualityProfile',
            header: 'Quality Profile',
            render: row => _jsx("span", { className: "text-sm", children: row.qualityProfileName || '-' }),
        },
        {
            key: 'fileSize',
            header: 'File Size',
            sortable: true,
            render: row => _jsx("span", { className: "text-sm", children: formatBytes(row.fileSize) }),
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
            render: row => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => onSearchMovie(row), className: "px-2 py-1 text-xs", children: "Search" }), _jsx(Button, { variant: "secondary", onClick: () => handleEditMovie(row), className: "px-2 py-1 text-xs", children: "Edit" })] })),
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
        if (!cutoffUnmetQuery.data)
            return;
        const selectedItems = cutoffUnmetQuery.data.items.filter((item) => selectedMovies.has(item.id));
        if (selectedItems.length > 0) {
            onBulkSearch(selectedItems);
            setSelectedMovies(new Set());
        }
    };
    return (_jsxs("section", { className: "space-y-4", children: [_jsxs("header", { className: "flex flex-wrap items-center justify-between gap-2", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold", children: "Cutoff Unmet Movies" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Movies that have files but don't meet the quality cutoff." })] }), selectedMovies.size > 0 && (_jsxs(Button, { variant: "primary", onClick: handleBulkSearch, children: ["Search for upgrades (", selectedMovies.size, ")"] }))] }), _jsx(QueryPanel, { isLoading: cutoffUnmetQuery.isPending, isError: cutoffUnmetQuery.isError, isEmpty: !cutoffUnmetQuery.data || cutoffUnmetQuery.data.items.length === 0, errorMessage: cutoffUnmetQuery.error instanceof Error ? cutoffUnmetQuery.error.message : undefined, onRetry: () => void cutoffUnmetQuery.refetch(), emptyTitle: "No cutoff unmet movies", emptyBody: "All monitored movies meet the quality cutoff.", children: cutoffUnmetQuery.data && (_jsx(DataTable, { data: cutoffUnmetQuery.data.items, columns: columns, getRowId: row => row.id, pagination: {
                        page,
                        totalPages: cutoffUnmetQuery.data.meta.totalPages,
                        onPrev: () => setPage(current => Math.max(1, current - 1)),
                        onNext: () => setPage(current => Math.min(cutoffUnmetQuery.data.meta.totalPages, current + 1)),
                    }, sort: { key: sortBy, direction: sortDir }, onSort: handleSort })) })] }));
}
//# sourceMappingURL=MovieCutoffUnmetTab.js.map