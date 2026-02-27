'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { SortMenu } from '@/components/primitives/SortMenu';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import type { MovieCollection } from '@/lib/api/collectionApi';

function calculateCompletion(collection: MovieCollection): number {
  if (collection.movieCount === 0) return 0;
  return Math.round((collection.moviesInLibrary / collection.movieCount) * 100);
}

export default function CollectionsLibraryPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'movieCount' | 'completion'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const collectionsQuery = useApiQuery<MovieCollection[]>({
    queryKey: queryKeys.collections(),
    queryFn: () => api.collectionApi.list(),
    staleTimeKind: 'list',
    isEmpty: data => data.length === 0,
  });

  const monitoredMutation = useMutation({
    mutationFn: ({ id, monitored }: { id: number; monitored: boolean }) =>
      api.collectionApi.update(id, { monitored }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.collections() });
      pushToast({
        title: 'Collection updated',
        message: 'Monitored status changed successfully.',
        variant: 'success',
      });
    },
    onError: () => {
      pushToast({
        title: 'Update failed',
        message: 'Could not update monitored state.',
        variant: 'error',
      });
    },
  });

  const searchMutation = useMutation({
    mutationFn: (id: number) => api.collectionApi.search(id),
    onSuccess: (result) => {
      pushToast({
        title: 'Search triggered',
        message: result.message,
        variant: 'success',
      });
    },
    onError: () => {
      pushToast({
        title: 'Search failed',
        message: 'Could not trigger search for missing movies.',
        variant: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.collectionApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.collections() });
      pushToast({
        title: 'Collection deleted',
        variant: 'success',
      });
    },
    onError: () => {
      pushToast({
        title: 'Delete failed',
        message: 'Could not delete collection.',
        variant: 'error',
      });
    },
  });

  const rawCollections = collectionsQuery.data ?? [];

  // Filter by search
  const filtered = rawCollections.filter(collection => {
    if (!search.trim()) return true;
    return collection.name.toLowerCase().includes(search.toLowerCase());
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === 'movieCount') {
      comparison = a.movieCount - b.movieCount;
    } else if (sortBy === 'completion') {
      comparison = calculateCompletion(a) - calculateCompletion(b);
    }
    return sortDir === 'asc' ? comparison : -comparison;
  });

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Collections</h1>
        <p className="text-sm text-text-secondary">
          Manage movie collections and track completion progress.
        </p>
      </header>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="block space-y-1 text-sm">
          <span className="sr-only">Filter by name</span>
          <input
            value={search}
            onChange={event => setSearch(event.currentTarget.value)}
            className="w-64 rounded-sm border border-border-subtle bg-surface-1 px-3 py-2"
            placeholder="Search collections..."
          />
        </label>

        <SortMenu
          label="Sort"
          value={sortBy}
          direction={sortDir}
          options={[
            { key: 'name', label: 'Name' },
            { key: 'movieCount', label: 'Total Movies' },
            { key: 'completion', label: 'Completion' },
          ]}
          onChange={key => {
            if (key === 'name' || key === 'movieCount' || key === 'completion') {
              setSortBy(key);
              setSortDir('asc');
            }
          }}
          onDirectionChange={setSortDir}
        />
      </div>

      <QueryPanel
        isLoading={collectionsQuery.isPending}
        isError={collectionsQuery.isError}
        isEmpty={collectionsQuery.isResolvedEmpty}
        errorMessage={collectionsQuery.error?.message}
        onRetry={() => void collectionsQuery.refetch()}
        emptyTitle="No collections found"
        emptyBody="Add collections from the Add New section when viewing a movie that belongs to a collection."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sorted.map(collection => {
            const completion = calculateCompletion(collection);
            return (
              <div
                key={collection.id}
                className="overflow-hidden rounded-lg border border-border-subtle bg-surface-1 transition-shadow hover:shadow-elevation-2"
              >
                {/* Poster */}
                <a
                  href={`/library/collections/${collection.id}`}
                  className="block aspect-[2/3] w-full bg-surface-2"
                >
                  {collection.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={collection.posterUrl}
                      alt={collection.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl text-text-muted">
                      🎬
                    </div>
                  )}
                </a>

                {/* Info */}
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <a
                      href={`/library/collections/${collection.id}`}
                      className="font-medium text-text-primary hover:underline line-clamp-1"
                    >
                      {collection.name}
                    </a>
                    <label className="flex items-center gap-1 text-xs shrink-0">
                      <input
                        type="checkbox"
                        checked={collection.monitored}
                        onChange={event => {
                          monitoredMutation.mutate({
                            id: collection.id,
                            monitored: event.currentTarget.checked,
                          });
                        }}
                        disabled={monitoredMutation.isPending}
                      />
                      Monitor
                    </label>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-text-secondary">
                      <span>{collection.moviesInLibrary} / {collection.movieCount} movies</span>
                      <span>{completion}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full bg-status-success transition-all"
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      className="flex-1 rounded-sm border border-border-subtle px-2 py-1 text-xs transition-colors hover:bg-surface-2 disabled:opacity-50"
                      onClick={() => searchMutation.mutate(collection.id)}
                      disabled={searchMutation.isPending}
                    >
                      {searchMutation.isPending ? 'Searching...' : 'Search Missing'}
                    </button>
                    <button
                      type="button"
                      className="rounded-sm border border-status-error/60 px-2 py-1 text-xs text-status-error transition-colors hover:bg-status-error/10"
                      onClick={() => {
                        const confirmed = window.confirm(`Delete "${collection.name}"? Movies will be kept.`);
                        if (confirmed) {
                          deleteMutation.mutate(collection.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </QueryPanel>
    </section>
  );
}
