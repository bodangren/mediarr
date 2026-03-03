'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { DataTable } from '@/components/primitives/DataTable';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { Button } from '@/components/primitives/Button';
import { queryKeys } from '@/lib/query/queryKeys';
export default function MovieMassEditPage() {
    const api = useMemo(() => getApiClients(), []);
    const router = useRouter();
    const queryClient = useQueryClient();
    const { pushToast } = useToast();
    const [selectedMovies, setSelectedMovies] = useState(new Set());
    const [selectedProfileId, setSelectedProfileId] = useState(null);
    const [selectAll, setSelectAll] = useState(false);
    // Query for all movies
    const moviesQuery = useQuery({
        queryKey: queryKeys.moviesList({}),
        queryFn: async () => {
            const result = await api.mediaApi.listMovies({ pageSize: 1000 });
            return result.items.map((movie) => ({
                id: movie.id,
                title: movie.title,
                year: movie.year,
                languageProfile: 'Default',
                missingSubtitles: movie.missingSubtitles ?? [],
            }));
        },
    });
    // Query for language profiles
    const profilesQuery = useQuery({
        queryKey: ['language-profiles'],
        queryFn: () => api.languageProfilesApi.listProfiles(),
    });
    // Bulk update mutation
    const bulkUpdateMutation = useMutation({
        mutationFn: async ({ movieIds, languageProfileId }) => {
            return api.subtitleApi.bulkUpdateMovies({ movieIds, languageProfileId });
        },
        onSuccess: (data) => {
            if (data.failedCount > 0) {
                pushToast({
                    title: `Updated ${data.updatedCount} movies`,
                    message: `${data.failedCount} movies failed to update`,
                    variant: 'warning',
                });
            }
            else {
                pushToast({
                    title: `Updated ${data.updatedCount} movies successfully`,
                    variant: 'success',
                });
            }
            // Invalidate movies list to refresh the data
            void queryClient.invalidateQueries({ queryKey: queryKeys.moviesList({}) });
            // Clear selection after successful update
            setSelectedMovies(new Set());
            setSelectAll(false);
        },
        onError: (error) => {
            pushToast({
                title: 'Failed to update movies',
                message: error.message,
                variant: 'error',
            });
        },
    });
    const handleSelectAll = useCallback(() => {
        const newSelectAll = !selectAll;
        setSelectAll(newSelectAll);
        if (newSelectAll && moviesQuery.data) {
            setSelectedMovies(new Set(moviesQuery.data.map(movie => movie.id)));
        }
        else {
            setSelectedMovies(new Set());
        }
    }, [selectAll, moviesQuery.data]);
    const handleSelectMovie = useCallback((movieId) => {
        setSelectedMovies(prev => {
            const newSet = new Set(prev);
            if (newSet.has(movieId)) {
                newSet.delete(movieId);
            }
            else {
                newSet.add(movieId);
            }
            setSelectAll(newSet.size === moviesQuery.data?.length);
            return newSet;
        });
    }, [moviesQuery.data?.length]);
    const handleApplyChanges = useCallback(() => {
        if (selectedMovies.size === 0) {
            pushToast({
                title: 'No Movies Selected',
                message: 'Please select at least one movie to update',
                variant: 'warning',
            });
            return;
        }
        if (selectedProfileId === null) {
            pushToast({
                title: 'No Language Profile Selected',
                message: 'Please select a language profile to apply',
                variant: 'warning',
            });
            return;
        }
        bulkUpdateMutation.mutate({
            movieIds: Array.from(selectedMovies),
            languageProfileId: selectedProfileId,
        });
    }, [selectedMovies, selectedProfileId, pushToast, bulkUpdateMutation]);
    const handleCancel = useCallback(() => {
        router.push('/subtitles/movies');
    }, [router]);
    const columns = [
        {
            key: 'select',
            header: '',
            render: row => (_jsx("input", { type: "checkbox", checked: selectedMovies.has(row.id), onChange: () => handleSelectMovie(row.id), className: "h-4 w-4 rounded border-border-subtle bg-surface-1 text-accent-primary focus:ring-2 focus:ring-accent-primary/50", "aria-label": `Select ${row.title}` })),
        },
        {
            key: 'title',
            header: 'Title',
            render: row => (_jsxs("div", { children: [_jsx("p", { className: "font-medium text-text-primary", children: row.title }), row.year && _jsx("p", { className: "text-xs text-text-muted", children: row.year })] })),
        },
        {
            key: 'languageProfile',
            header: 'Language Profile',
            render: row => (_jsx("span", { className: "inline-flex rounded-md bg-surface-2 px-2 py-1 text-xs text-text-primary", children: row.languageProfile ?? 'Default' })),
        },
        {
            key: 'missingSubtitles',
            header: 'Missing Subtitles',
            render: row => (_jsx("div", { className: "flex flex-wrap gap-1", children: row.missingSubtitles.length > 0 ? (row.missingSubtitles.map(lang => (_jsx("span", { className: "inline-flex rounded-md bg-accent-danger/20 px-2 py-0.5 text-xs text-accent-danger", children: lang }, lang)))) : (_jsx("span", { className: "text-xs text-text-muted", children: "None" })) })),
        },
    ];
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Mass Edit Movies" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Select movies to update their language profiles in bulk." })] }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-1 p-4", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("label", { htmlFor: "profile-select", className: "text-sm font-medium text-text-primary", children: "Language Profile:" }), _jsxs("select", { id: "profile-select", value: selectedProfileId ?? '', onChange: e => setSelectedProfileId(e.target.value ? Number(e.target.value) : null), disabled: profilesQuery.isPending, className: "rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 disabled:opacity-50", children: [_jsx("option", { value: "", children: "Select a profile..." }), profilesQuery.data?.map(profile => (_jsx("option", { value: profile.id, children: profile.name }, profile.id)))] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("label", { className: "flex items-center gap-2 text-sm text-text-primary", children: [_jsx("input", { type: "checkbox", checked: selectAll, onChange: handleSelectAll, className: "h-4 w-4 rounded border-border-subtle bg-surface-1 text-accent-primary focus:ring-2 focus:ring-accent-primary/50", "aria-label": "Select all movies" }), "Select All"] }), selectedMovies.size > 0 && (_jsxs("span", { className: "text-sm text-text-secondary", children: [selectedMovies.size, " movie", selectedMovies.size !== 1 ? 's' : '', " selected"] }))] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: "primary", onClick: handleApplyChanges, disabled: selectedMovies.size === 0 || selectedProfileId === null || bulkUpdateMutation.isPending, children: bulkUpdateMutation.isPending ? 'Updating...' : 'Apply Changes' }), _jsx(Button, { variant: "secondary", onClick: handleCancel, disabled: bulkUpdateMutation.isPending, children: "Cancel" })] })] }), _jsx(QueryPanel, { isLoading: moviesQuery.isPending, isError: moviesQuery.isError, isEmpty: moviesQuery.data?.length === 0, errorMessage: moviesQuery.error?.message, onRetry: () => void moviesQuery.refetch(), emptyTitle: "No movies found", emptyBody: "Add some movies to your library to manage subtitles.", children: _jsx(DataTable, { data: moviesQuery.data ?? [], columns: columns, getRowId: row => row.id }) })] }));
}
//# sourceMappingURL=page.js.map