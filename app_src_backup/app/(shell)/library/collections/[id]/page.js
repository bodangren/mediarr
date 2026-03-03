'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
export default function CollectionDetailPage() {
    const params = useParams();
    const collectionId = Number(params.id);
    const api = useMemo(() => getApiClients(), []);
    const queryClient = useQueryClient();
    const router = useRouter();
    const { pushToast } = useToast();
    const [isSearching, setIsSearching] = useState(false);
    const collectionQuery = useApiQuery({
        queryKey: queryKeys.collectionDetail(collectionId),
        queryFn: async () => {
            const response = await fetch(`/api/collections/${collectionId}`);
            if (!response.ok)
                throw new Error('Failed to fetch collection');
            const envelope = await response.json();
            return envelope.data;
        },
        staleTimeKind: 'detail',
    });
    const monitoredMutation = useMutation({
        mutationFn: (monitored) => api.collectionApi.update(collectionId, { monitored }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.collectionDetail(collectionId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.collections() });
            pushToast({
                title: 'Collection updated',
                message: 'Monitored status changed successfully.',
                variant: 'success',
            });
        },
    });
    const searchMutation = useMutation({
        mutationFn: () => api.collectionApi.search(collectionId),
        onSuccess: (result) => {
            setIsSearching(false);
            pushToast({
                title: 'Search triggered',
                message: result.message,
                variant: 'success',
            });
        },
        onError: () => {
            setIsSearching(false);
            pushToast({
                title: 'Search failed',
                message: 'Could not trigger search for missing movies.',
                variant: 'error',
            });
        },
    });
    const deleteMutation = useMutation({
        mutationFn: () => api.collectionApi.delete(collectionId),
        onSuccess: () => {
            pushToast({
                title: 'Collection deleted',
                variant: 'success',
            });
            router.push('/library/collections');
        },
    });
    const handleSearch = useCallback(() => {
        setIsSearching(true);
        searchMutation.mutate();
    }, [searchMutation]);
    const handleDelete = useCallback(() => {
        const confirmed = window.confirm('Delete this collection? Movies will be kept in your library.');
        if (confirmed) {
            deleteMutation.mutate();
        }
    }, [deleteMutation]);
    const collection = collectionQuery.data;
    if (!collection) {
        return (_jsx("section", { className: "space-y-5", children: _jsx(QueryPanel, { isLoading: collectionQuery.isPending, isError: collectionQuery.isError, isEmpty: collectionQuery.isResolvedEmpty, errorMessage: collectionQuery.error?.message, onRetry: () => void collectionQuery.refetch(), emptyTitle: "Collection not found", emptyBody: "The collection you're looking for doesn't exist or has been deleted.", children: _jsx("div", {}) }) }));
    }
    const completion = collection.movieCount > 0
        ? Math.round((collection.moviesInLibrary / collection.movieCount) * 100)
        : 0;
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("div", { className: "relative overflow-hidden rounded-lg", children: [collection.backdropUrl && (_jsx("div", { className: "absolute inset-0 bg-cover bg-center opacity-20", style: { backgroundImage: `url(${collection.backdropUrl})` } })), _jsx("div", { className: "relative bg-surface-1/80 backdrop-blur-sm p-6", children: _jsxs("div", { className: "flex gap-6", children: [_jsx("div", { className: "w-32 shrink-0", children: collection.posterUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    _jsx("img", { src: collection.posterUrl, alt: collection.name, className: "aspect-[2/3] w-full rounded-lg object-cover shadow-elevation-2" })) : (_jsx("div", { className: "aspect-[2/3] w-full rounded-lg bg-surface-2 flex items-center justify-center text-4xl", children: "\uD83C\uDFAC" })) }), _jsxs("div", { className: "flex-1 space-y-3", children: [_jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-semibold", children: collection.name }), _jsxs("p", { className: "text-sm text-text-secondary", children: [collection.movieCount, " movies \u00B7 ", collection.moviesInLibrary, " in library"] })] }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: collection.monitored, onChange: event => monitoredMutation.mutate(event.currentTarget.checked), disabled: monitoredMutation.isPending }), "Monitored"] })] }), _jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-text-secondary", children: [_jsx("span", { children: "Completion" }), _jsxs("span", { children: [completion, "%"] })] }), _jsx("div", { className: "h-3 overflow-hidden rounded-full bg-surface-2", children: _jsx("div", { className: "h-full bg-status-success transition-all", style: { width: `${completion}%` } }) })] }), collection.overview && (_jsx("p", { className: "text-sm text-text-secondary line-clamp-3", children: collection.overview })), _jsxs("div", { className: "flex items-center gap-3 pt-2", children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle bg-surface-2 px-4 py-2 text-sm transition-colors hover:bg-surface-3 disabled:opacity-50", onClick: handleSearch, disabled: isSearching, children: isSearching ? 'Searching...' : 'Search Missing Movies' }), _jsx("button", { type: "button", className: "rounded-sm border border-status-error/60 px-4 py-2 text-sm text-status-error transition-colors hover:bg-status-error/10", onClick: handleDelete, children: "Delete Collection" })] })] })] }) })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Movies" }), collection.movies.length === 0 ? (_jsx("p", { className: "text-sm text-text-secondary", children: "No movies in this collection." })) : (_jsx("div", { className: "space-y-2", children: collection.movies.map(movie => (_jsxs("div", { className: "flex items-center justify-between gap-4 rounded-lg border border-border-subtle bg-surface-1 p-4", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("a", { href: `/library/movies/${movie.id}`, className: "font-medium hover:underline truncate", children: movie.title }), _jsxs("span", { className: "text-sm text-text-secondary shrink-0", children: ["(", movie.year, ")"] })] }), _jsxs("div", { className: "flex items-center gap-2 mt-1", children: [_jsx(StatusBadge, { status: movie.inLibrary ? 'downloaded' : 'missing' }), movie.quality && (_jsx("span", { className: "text-xs text-text-secondary", children: movie.quality }))] })] }), _jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [!movie.inLibrary && (_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-1 text-xs transition-colors hover:bg-surface-2", onClick: () => {
                                                // Navigate to movie page for search
                                                window.location.href = `/library/movies/${movie.id}`;
                                            }, children: "Search" })), _jsx("a", { href: `/library/movies/${movie.id}`, className: "rounded-sm border border-border-subtle px-3 py-1 text-xs transition-colors hover:bg-surface-2", children: "Open" })] })] }, movie.id))) }))] })] }));
}
//# sourceMappingURL=page.js.map