'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClients } from '@/lib/api/client';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';

type MovieRow = {
    id: number;
    title: string;
    year?: number;
};

export default function SubtitlesPage() {
    const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
    const api = useMemo(() => getApiClients(), []);

    const moviesQuery = useQuery({
        queryKey: ['movies-for-subtitles'],
        queryFn: () => api.mediaApi.listMovies({ pageSize: 1000 }),
    });

    const columns: DataTableColumn<MovieRow>[] = [
        {
            key: 'title',
            header: 'Movie',
            render: row => (
                <div>
                    <p className="font-medium">{row.title}</p>
                    <p className="text-xs text-gray-500">{row.year ?? 'Unknown year'}</p>
                </div>
            )
        },
        {
            key: 'actions',
            header: 'Actions',
            render: row => (
                <button 
                    onClick={() => setSelectedMovieId(row.id)}
                    className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100"
                >
                    Manage Subtitles
                </button>
            )
        }
    ];

    if (selectedMovieId) {
        return <SubtitleInventoryView movieId={selectedMovieId} onBack={() => setSelectedMovieId(null)} />;
    }

    return (
        <section className="space-y-4">
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold">Subtitle Management</h1>
                <p className="text-sm text-text-secondary">Browse your library and manage subtitle tracks.</p>
            </header>

            <QueryPanel
                isLoading={moviesQuery.isLoading}
                isError={moviesQuery.isError}
                isEmpty={moviesQuery.data?.items.length === 0}
                onRetry={() => moviesQuery.refetch()}
                emptyTitle="No movies found"
                emptyBody="Add some movies to your library to manage subtitles."
            >
                <DataTable 
                    data={moviesQuery.data?.items ?? []} 
                    columns={columns} 
                    getRowId={row => row.id} 
                />
            </QueryPanel>
        </section>
    );
}

function SubtitleInventoryView({ movieId, onBack }: { movieId: number, onBack: () => void }) {
    const api = useMemo(() => getApiClients(), []);
    const [searchingVariantId, setSearchingVariantId] = useState<number | null>(null);

    const inventoryQuery = useQuery({
        queryKey: ['subtitle-inventory', movieId],
        queryFn: () => api.subtitleApi.listMovieVariants(movieId),
    });

    const columns: DataTableColumn<any>[] = [
        {
            key: 'path',
            header: 'File',
            render: row => <span className="text-xs font-mono break-all">{row.path}</span>
        },
        {
            key: 'subtitles',
            header: 'Tracks',
            render: row => (
                <div className="flex flex-wrap gap-1">
                    {row.subtitleTracks.map((st: any, i: number) => (
                        <span key={i} className="text-[10px] bg-green-100 text-green-800 px-1 rounded">
                            {st.languageCode} {st.isForced ? '(F)' : ''}
                        </span>
                    ))}
                    {row.missingSubtitles.map((ms: any, i: number) => (
                        <span key={i} className="text-[10px] bg-red-100 text-red-800 px-1 rounded opacity-60">
                            {ms.languageCode} (Missing)
                        </span>
                    ))}
                </div>
            )
        },
        {
            key: 'actions',
            header: 'Actions',
            render: row => (
                <button 
                    onClick={() => setSearchingVariantId(row.variantId)}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                >
                    Search
                </button>
            )
        }
    ];

    if (searchingVariantId) {
        return (
            <ManualSearchView 
                variantId={searchingVariantId} 
                onBack={() => setSearchingVariantId(null)} 
            />
        );
    }

    return (
        <section className="space-y-4">
            <button onClick={onBack} className="text-sm text-blue-600 hover:underline">← Back to Movies</button>
            <h2 className="text-xl font-semibold">Inventory for Movie #{movieId}</h2>
            
            <QueryPanel
                isLoading={inventoryQuery.isLoading}
                isError={inventoryQuery.isError}
                isEmpty={inventoryQuery.data?.length === 0}
                onRetry={() => inventoryQuery.refetch()}
                emptyTitle="No files found"
                emptyBody="This movie doesn't have any video files tracked yet."
            >
                <DataTable 
                    data={inventoryQuery.data ?? []} 
                    columns={columns} 
                    getRowId={row => row.variantId} 
                />
            </QueryPanel>
        </section>
    );
}

function ManualSearchView({ variantId, onBack }: { variantId: number, onBack: () => void }) {
    const api = useMemo(() => getApiClients(), []);
    const queryClient = useQueryClient();

    const searchQuery = useQuery({
        queryKey: ['manual-subtitle-search', variantId],
        queryFn: () => api.subtitleApi.manualSearch({ variantId }),
    });

    const downloadMutation = useMutation({
        mutationFn: (candidate: any) => api.subtitleApi.manualDownload({ variantId, candidate }),
        onSuccess: () => {
            alert('Subtitle downloaded successfully');
            queryClient.invalidateQueries({ queryKey: ['subtitle-inventory'] });
            onBack();
        }
    });

    const columns: DataTableColumn<any>[] = [
        {
            key: 'language',
            header: 'Language',
            render: row => row.languageCode
        },
        {
            key: 'provider',
            header: 'Provider',
            render: row => row.provider
        },
        {
            key: 'score',
            header: 'Score',
            render: row => row.score
        },
        {
            key: 'actions',
            header: 'Actions',
            render: row => (
                <button 
                    onClick={() => downloadMutation.mutate(row)}
                    disabled={downloadMutation.isPending}
                    className="text-xs bg-green-600 text-white px-2 py-1 rounded disabled:opacity-50"
                >
                    {downloadMutation.isPending ? 'Downloading...' : 'Download'}
                </button>
            )
        }
    ];

    return (
        <section className="space-y-4">
            <button onClick={onBack} className="text-sm text-blue-600 hover:underline">← Back to Inventory</button>
            <h2 className="text-xl font-semibold">Manual Search</h2>

            <QueryPanel
                isLoading={searchQuery.isLoading}
                isError={searchQuery.isError}
                isEmpty={searchQuery.data?.length === 0}
                onRetry={() => searchQuery.refetch()}
                emptyTitle="No subtitles found"
                emptyBody="Try searching again or check your API configuration."
            >
                <DataTable 
                    data={searchQuery.data ?? []} 
                    columns={columns} 
                    getRowId={row => `${row.provider}-${row.languageCode}-${row.score}`} 
                />
            </QueryPanel>
        </section>
    );
}
