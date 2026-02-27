'use client';

import { Icon } from '@/components/primitives/Icon';
import { CollectionCard } from './CollectionCard';
import type { MovieCollection } from '@/types/collection';

interface CollectionGridProps {
  collections: MovieCollection[];
  onToggleMonitored: (id: number, monitored: boolean) => void;
  onSearch: (id: number) => void;
  onEdit: (collection: MovieCollection) => void;
  onDelete: (id: number) => void;
}

export function CollectionGrid({
  collections,
  onToggleMonitored,
  onSearch,
  onEdit,
  onDelete,
}: CollectionGridProps) {
  if (collections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-surface-1 py-12">
        <Icon name="grid" className="mb-4 h-12 w-12 text-text-muted" />
        <p className="text-center text-text-secondary">No collections found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {collections.map(collection => (
        <CollectionCard
          key={collection.id}
          collection={collection}
          onToggleMonitored={onToggleMonitored}
          onSearch={onSearch}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
