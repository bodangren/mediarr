'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/primitives/Icon';
import { ProgressBar } from '@/components/primitives/ProgressBar';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { calculateEpisodeProgress, type SeriesListItem } from '@/types/series';

interface PosterViewProps {
  items: SeriesListItem[];
  onToggleMonitored: (id: number, monitored: boolean) => void;
  onDelete?: (id: number) => void;
  onRefresh?: (id: number) => void;
}

interface SeriesPosterCardProps {
  item: SeriesListItem;
  onToggleMonitored: (id: number, monitored: boolean) => void;
  onDelete?: (id: number) => void;
  onRefresh?: (id: number) => void;
}

function SeriesPosterCard({ item, onToggleMonitored, onDelete, onRefresh }: SeriesPosterCardProps) {
  const progress = calculateEpisodeProgress(item);
  const posterUrl = item.posterUrl ?? '/images/placeholder-poster.png';

  return (
    <Link
      href={`/library/series/${item.id}`}
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

        {/* Progress Bar Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-accent-primary"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-label={`Episode progress: ${Math.round(progress)}%`}
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Hover Action Buttons */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-surface-0/80 opacity-0 transition-opacity group-hover:opacity-100">
          {onRefresh && (
            <button
              type="button"
              className="rounded-md bg-surface-2 px-3 py-2 text-sm transition-colors hover:bg-surface-3"
              onClick={event => {
                event.preventDefault();
                event.stopPropagation();
                onRefresh(item.id);
              }}
              aria-label={`Refresh ${item.title}`}
            >
              <Icon name="refresh" />
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

      {/* Series Info */}
      <div className="flex flex-col gap-1 px-2 pb-2">
        <h3 className="line-clamp-2 text-sm font-medium text-text-primary group-hover:text-accent-primary">
          {item.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          {item.year && <span>{item.year}</span>}
          {item.status && <StatusBadge status={item.status} />}
        </div>
      </div>
    </Link>
  );
}

export function SeriesPosterView({ items, onToggleMonitored, onDelete, onRefresh }: PosterViewProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-surface-1 py-12">
        <Icon name="search" className="mb-4 text-4xl text-text-muted" />
        <p className="text-center text-text-secondary">No series found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map(item => (
        <SeriesPosterCard
          key={item.id}
          item={item}
          onToggleMonitored={onToggleMonitored}
          onDelete={onDelete}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}
