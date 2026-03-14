
import { Link } from 'react-router-dom';
import { Icon } from '@/components/primitives/Icon';
import { StatusBadge } from '@/components/ui/status-badge-compat';
import { getFileStatus, getRatingDisplay, getRuntimeDisplay, type MovieListItem } from '@/types/movie';

interface MoviePosterViewProps {
  items: MovieListItem[];
  onToggleMonitored: (id: number, monitored: boolean) => void;
  onDelete?: (id: number) => void;
  onSearch?: (id: number) => void;
  isLoading?: boolean;
}

interface MoviePosterCardProps {
  item: MovieListItem;
  onToggleMonitored: (id: number, monitored: boolean) => void;
  onDelete?: (id: number) => void;
  onSearch?: (id: number) => void;
}

function MoviePosterCard({ item, onToggleMonitored, onDelete, onSearch }: MoviePosterCardProps) {
  const fileStatus = getFileStatus(item);
  const posterUrl = item.posterUrl ?? '/images/placeholder-poster.png';
  const rating = getRatingDisplay(item);

  return (
    <Link
      to={`/library/movies/${item.id}`}
      className="group relative flex flex-col gap-2 overflow-hidden rounded-md border border-border-subtle bg-surface-1 transition-all hover:shadow-elevation-2"
    >
      {/* Poster Image */}
      <div className="relative aspect-[2/3] overflow-hidden bg-surface-2">
        <img
          src={posterUrl}
          alt={item.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={event => {
            const target = event.currentTarget;
            target.src = '/images/placeholder-poster.png';
          }}
        />

        {/* Monitoring Toggle */}
        <div className="absolute left-2 top-2">
          <button
            type="button"
            className="rounded-full p-1.5 transition-colors hover:bg-surface-2/80"
            onClick={event => {
              event.preventDefault();
              event.stopPropagation();
              onToggleMonitored(item.id, !Boolean(item.monitored));
            }}
            aria-label={item.monitored ? 'Disable monitoring' : 'Enable monitoring'}
          >
            {item.monitored ? (
              <Icon name="success" className="text-status-completed" />
            ) : (
              <Icon name="warning" className="text-text-muted" />
            )}
          </button>
        </div>

        {/* Status Badge (Top Right) */}
        <div className="absolute right-2 top-2">
          <StatusBadge status={fileStatus} />
        </div>

        {/* Rating Badge (Bottom Left) */}
        {rating && (
          <div className="absolute bottom-2 left-2 rounded-full bg-surface-0/90 px-2 py-1 text-xs font-medium text-text-primary">
            ⭐ {rating}
          </div>
        )}

        {/* Hover Action Buttons */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-surface-0/80 opacity-0 transition-opacity group-hover:opacity-100">
          {onSearch && (
            <button
              type="button"
              className="rounded-md bg-surface-2 px-3 py-2 text-sm transition-colors hover:bg-surface-3"
              onClick={event => {
                event.preventDefault();
                event.stopPropagation();
                onSearch(item.id);
              }}
              aria-label={`Search ${item.title}`}
            >
              <Icon name="search" />
            </button>
          )}
          <button
            type="button"
            className="rounded-md bg-surface-2 px-3 py-2 text-sm transition-colors hover:bg-surface-3"
            aria-label={`Edit ${item.title}`}
          >
            <Icon name="edit" />
          </button>
          {onDelete && (
            <button
              type="button"
              className="rounded-md bg-status-error/20 px-3 py-2 text-sm text-status-error transition-colors hover:bg-status-error/30"
              onClick={event => {
                event.preventDefault();
                event.stopPropagation();
                const confirmed = window.confirm(`Delete ${item.title}?`);
                if (confirmed) {
                  onDelete(item.id);
                }
              }}
              aria-label={`Delete ${item.title}`}
            >
              <Icon name="trash" />
            </button>
          )}
        </div>
      </div>

      {/* Movie Info */}
      <div className="flex flex-col gap-1 px-2 pb-2">
        <h3 className="line-clamp-2 text-sm font-medium text-text-primary group-hover:text-accent-primary">
          {item.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          {item.year && <span>{item.year}</span>}
          {item.runtime && <span>•</span>}
          {item.runtime && <span>{getRuntimeDisplay(item.runtime)}</span>}
          {item.certification && <span>•</span>}
          {item.certification && <span>{item.certification}</span>}
        </div>
      </div>
    </Link>
  );
}

function MoviePosterCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-[2/3] animate-pulse rounded-md bg-surface-2" />
      <div className="space-y-1 px-2 pb-2">
        <div className="h-4 w-full animate-pulse rounded bg-surface-2" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-surface-2" />
      </div>
    </div>
  );
}

export function MoviePosterView({ items, onToggleMonitored, onDelete, onSearch, isLoading }: MoviePosterViewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <MoviePosterCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-surface-1 py-12">
        <Icon name="search" className="mb-4 text-4xl text-text-muted" />
        <p className="text-center text-text-secondary">No movies found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map(item => (
        <MoviePosterCard
          key={item.id}
          item={item}
          onToggleMonitored={onToggleMonitored}
          onDelete={onDelete}
          onSearch={onSearch}
        />
      ))}
    </div>
  );
}
