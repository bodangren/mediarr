'use client';

import { Icon } from '@/components/primitives/Icon';
import { ProgressBar } from '@/components/primitives/ProgressBar';
import type { MovieCollection } from '@/types/collection';

interface CollectionCardProps {
  collection: MovieCollection;
  onToggleMonitored: (id: number, monitored: boolean) => void;
  onSearch: (id: number) => void;
  onEdit: (collection: MovieCollection) => void;
  onDelete: (id: number) => void;
}

export function CollectionCard({
  collection,
  onToggleMonitored,
  onSearch,
  onEdit,
  onDelete,
}: CollectionCardProps) {
  const progress = collection.movieCount > 0
    ? (collection.moviesInLibrary / collection.movieCount) * 100
    : 0;

  const posterUrl = collection.posterUrl ?? '/images/placeholder-poster.png';

  return (
    <article className="group flex flex-col gap-3 overflow-hidden rounded-md border border-border-subtle bg-surface-1 transition-all hover:shadow-elevation-2">
      {/* Poster Section */}
      <div className="relative aspect-[2/3] overflow-hidden bg-surface-2">
        <img
          src={posterUrl}
          alt={collection.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={event => {
            const target = event.currentTarget;
            target.src = '/images/placeholder-poster.png';
          }}
        />

        {/* Monitoring Toggle */}
        <button
          type="button"
          onClick={() => onToggleMonitored(collection.id, !collection.monitored)}
          className="absolute left-2 top-2 flex items-center justify-center rounded-full p-1.5 transition-colors hover:bg-surface-2/80"
          aria-label={collection.monitored ? 'Disable monitoring' : 'Enable monitoring'}
        >
          {collection.monitored ? (
            <Icon name="success" className="text-status-completed" />
          ) : (
            <Icon name="warning" className="text-text-muted" />
          )}
        </button>

        {/* Movie Count Badge */}
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-surface-0/90 px-2 py-1 text-xs font-medium text-text-primary">
          <Icon name="grid" className="h-3 w-3" />
          <span>{collection.moviesInLibrary}/{collection.movieCount}</span>
        </div>

        {/* Hover Actions */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-surface-0/80 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onSearch(collection.id)}
            className="rounded-md bg-surface-2 p-2 transition-colors hover:bg-surface-3"
            aria-label={`Search ${collection.name}`}
          >
            <Icon name="search" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(collection)}
            className="rounded-md bg-surface-2 p-2 transition-colors hover:bg-surface-3"
            aria-label={`Edit ${collection.name}`}
          >
            <Icon name="edit" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(collection.id)}
            className="rounded-md bg-status-error/20 p-2 text-status-error transition-colors hover:bg-status-error/30"
            aria-label={`Delete ${collection.name}`}
          >
            <Icon name="trash" />
          </button>
        </div>
      </div>

      {/* Collection Info */}
      <div className="flex flex-1 flex-col gap-2 px-3 pb-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-text-primary group-hover:text-accent-primary">
          {collection.name}
        </h3>

        {collection.overview && (
          <p className="line-clamp-3 text-xs text-text-secondary">
            {collection.overview}
          </p>
        )}

        {/* Progress Bar */}
        <div className="mt-auto">
          <ProgressBar
            value={progress}
            label={`${collection.moviesInLibrary} of ${collection.movieCount} movies in library`}
          />
        </div>
      </div>
    </article>
  );
}
