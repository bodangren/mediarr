'use client';

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useToast } from '@/components/providers/ToastProvider';
import { CollectionGrid } from './CollectionGrid';
import { EditCollectionModal } from './EditCollectionModal';
import type { MovieCollection, CollectionEditForm } from '@/types/collection';

export function CollectionsPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { pushToast } = useToast();

  const [editingCollection, setEditingCollection] = useState<MovieCollection | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTmdbId, setAddTmdbId] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const { data: collections = [], isLoading } = useQuery({
    queryKey: queryKeys.collections(),
    queryFn: () => api.collectionApi.list(),
  });

  const { data: qualityProfiles = [] } = useQuery({
    queryKey: queryKeys.qualityProfiles(),
    queryFn: () => api.qualityProfileApi.list(),
  });

  const toggleMonitoredMutation = useMutation({
    mutationFn: ({ id, monitored }: { id: number; monitored: boolean }) =>
      api.collectionApi.update(id, { monitored }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.collections() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.collectionApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.collections() });
      pushToast({ variant: 'success', message: 'Collection deleted.' });
    },
    onError: () => {
      pushToast({ variant: 'error', message: 'Failed to delete collection.' });
    },
  });

  const searchMutation = useMutation({
    mutationFn: (id: number) => api.collectionApi.search(id),
    onSuccess: result => {
      pushToast({ variant: 'success', message: `Searching for ${result.missing} missing movies.` });
    },
    onError: () => {
      pushToast({ variant: 'error', message: 'Search failed.' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CollectionEditForm> }) =>
      api.collectionApi.update(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.collections() });
      setEditingCollection(null);
      pushToast({ variant: 'success', message: 'Collection updated.' });
    },
    onError: () => {
      pushToast({ variant: 'error', message: 'Failed to update collection.' });
    },
  });

  const handleAddCollection = async (event: React.FormEvent) => {
    event.preventDefault();
    const tmdbCollectionId = Number.parseInt(addTmdbId, 10);
    if (!tmdbCollectionId) return;

    setIsAdding(true);
    try {
      await api.collectionApi.create({ tmdbCollectionId });
      void queryClient.invalidateQueries({ queryKey: queryKeys.collections() });
      setShowAddModal(false);
      setAddTmdbId('');
      pushToast({ variant: 'success', message: 'Collection added.' });
    } catch {
      pushToast({ variant: 'error', message: 'Failed to add collection.' });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Collections</h1>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="rounded-md bg-accent-primary px-3 py-2 text-sm font-medium text-text-on-accent hover:bg-accent-primary/90"
        >
          Add Collection
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-text-secondary">
          Loading collections…
        </div>
      ) : (
        <CollectionGrid
          collections={collections}
          onToggleMonitored={(id, monitored) => toggleMonitoredMutation.mutate({ id, monitored })}
          onSearch={id => searchMutation.mutate(id)}
          onEdit={collection => setEditingCollection(collection)}
          onDelete={id => deleteMutation.mutate(id)}
          onNavigate={id => navigate(`/library/collections/${id}`)}
        />
      )}

      {/* Add Collection Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-surface-3/70"
            aria-label="Close modal"
            onClick={() => { setShowAddModal(false); setAddTmdbId(''); }}
          />
          <div
            role="dialog"
            aria-label="Add Collection"
            className="relative z-10 w-full max-w-sm rounded-md border border-border-subtle bg-surface-1 p-6 shadow-elevation-3"
          >
            <h2 className="mb-4 text-base font-semibold">Add Collection</h2>
            <form onSubmit={handleAddCollection} className="space-y-4">
              <label className="block space-y-1 text-sm">
                <span className="font-medium">TMDB Collection ID</span>
                <input
                  type="number"
                  value={addTmdbId}
                  onChange={event => { const v = event.currentTarget.value; setAddTmdbId(v); }}
                  placeholder="TMDB Collection ID"
                  required
                  className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setAddTmdbId(''); }}
                  className="rounded-sm border border-border-subtle px-3 py-1.5 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="rounded-sm bg-accent-primary px-3 py-1.5 text-sm text-text-on-accent hover:bg-accent-primary/90 disabled:opacity-50"
                >
                  {isAdding ? 'Adding…' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Collection Modal */}
      {editingCollection && (
        <EditCollectionModal
          collection={editingCollection}
          qualityProfiles={qualityProfiles}
          isOpen
          onClose={() => setEditingCollection(null)}
          onSave={(id, data) => updateMutation.mutate({ id, data })}
        />
      )}
    </div>
  );
}
