'use client';

import { useState } from 'react';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { Icon } from '@/components/primitives/Icon';
import { CollectionGrid } from '@/components/collections';
import { EditCollectionModal } from '@/components/collections';
import type { MovieCollection, CollectionEditForm } from '@/types/collection';
import { mockCollections } from '@/lib/mocks/collectionMocks';

export default function CollectionsPage() {
  const [collections, setCollections] = useState<MovieCollection[]>(mockCollections);
  const [editingCollection, setEditingCollection] = useState<MovieCollection | null>(null);
  const [search, setSearch] = useState('');

  const handleToggleMonitored = (id: number, monitored: boolean) => {
    setCollections(current =>
      current.map(col => (col.id === id ? { ...col, monitored } : col))
    );
  };

  const handleSearch = (id: number) => {
    const collection = collections.find(col => col.id === id);
    if (collection) {
      // In a real implementation, this would trigger a search for missing movies
      alert(`Searching for missing movies in "${collection.name}"`);
    }
  };

  const handleEdit = (collection: MovieCollection) => {
    setEditingCollection(collection);
  };

  const handleDelete = (id: number) => {
    const collection = collections.find(col => col.id === id);
    if (collection && window.confirm(`Delete collection "${collection.name}"?`)) {
      setCollections(current => current.filter(col => col.id !== id));
    }
  };

  const handleSaveEdit = (collectionId: number, data: CollectionEditForm) => {
    setCollections(current =>
      current.map(col =>
        col.id === collectionId
          ? {
              ...col,
              name: data.name,
              overview: data.overview,
              monitored: data.monitored,
            }
          : col
      )
    );
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
        isLoading={false}
        isError={false}
        isEmpty={filteredCollections.length === 0}
        emptyTitle="No collections found"
        emptyBody="Try adjusting your search or add a new collection."
        onRetry={() => {}}
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
