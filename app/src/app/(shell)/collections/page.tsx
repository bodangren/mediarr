'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { Icon } from '@/components/primitives/Icon';
import { CollectionGrid } from '@/components/collections';
import { EditCollectionModal } from '@/components/collections';
import type { MovieCollection, CollectionEditForm } from '@/types/collection';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';

export default function CollectionsPage() {
  const { collectionApi } = getApiClients();

  const { data: collections = [], isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.collections(),
    queryFn: () => collectionApi.list(),
  });
  const [editingCollection, setEditingCollection] = useState<MovieCollection | null>(null);
  const [search, setSearch] = useState('');

  const handleToggleMonitored = (id: number, monitored: boolean) => {
    // TODO: Wire to collectionApi.update() in Phase 3
    console.log('Toggle monitored for collection', id, monitored);
  };

  const handleSearch = async (id: number) => {
    const collection = collections.find(col => col.id === id);
    if (collection) {
      try {
        await collectionApi.search(id);
        // Optionally show success feedback or refetch
      } catch (error) {
        console.error('Failed to search collection:', error);
        // Optionally show error feedback
      }
    }
  };

  const handleEdit = (collection: MovieCollection) => {
    setEditingCollection(collection);
  };

  const handleDelete = (id: number) => {
    const collection = collections.find(col => col.id === id);
    if (collection && window.confirm(`Delete collection "${collection.name}"?`)) {
      // TODO: Wire to collectionApi.delete() in Phase 3
      console.log('Delete collection', id);
      refetch();
    }
  };

  const handleSaveEdit = (collectionId: number, data: CollectionEditForm) => {
    // TODO: Wire to collectionApi.update() in Phase 3
    console.log('Save collection', collectionId, data);
    setEditingCollection(null);
    refetch();
  };

  const filteredCollections = search
    ? collections.filter(col => col.name.toLowerCase().includes(search.toLowerCase()))
    : collections;

  const monitoredCount = collections.filter(col => col.monitored).length;

  return (
    <section className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Collections</h1>
          <p className="text-sm text-text-secondary">
            Manage movie collections with progress tracking and bulk operations. {monitoredCount} of {collections.length} monitored.
          </p>
        </div>
      </header>

      {/* Search */}
      <label className="block w-full max-w-md space-y-1 text-sm">
        <span className="sr-only">Search collections</span>
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={event => setSearch(event.currentTarget.value)}
            placeholder="Search collections..."
            className="w-full rounded-sm border border-border-subtle bg-surface-1 pl-10 pr-3 py-2"
          />
        </div>
      </label>

      {/* Collections Grid */}
      <QueryPanel
        isLoading={isPending}
        isError={isError}
        isEmpty={filteredCollections.length === 0}
        emptyTitle="No collections found"
        emptyBody="Try adjusting your search or add a new collection."
        onRetry={() => refetch()}
      >
        <CollectionGrid
          collections={filteredCollections}
          onToggleMonitored={handleToggleMonitored}
          onSearch={handleSearch}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </QueryPanel>

      {/* Edit Modal */}
      {editingCollection && (
        <EditCollectionModal
          collection={editingCollection}
          isOpen
          onClose={() => setEditingCollection(null)}
          onSave={handleSaveEdit}
        />
      )}
    </section>
  );
}
