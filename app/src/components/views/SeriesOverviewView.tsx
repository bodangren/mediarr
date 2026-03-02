'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/primitives/Icon';
import { ProgressBar } from '@/components/primitives/ProgressBar';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { formatBytes, formatRelativeDate } from '@/lib/format';
import { calculateEpisodeProgress, getEpisodeCounts, getLastAired, getNextAiring, type SeriesListItem } from '@/types/series';

interface OverviewViewProps {
  items: SeriesListItem[];
  onToggleMonitored: (id: number, monitored: boolean) => void;
  onDelete?: (id: number) => void;
  onRefresh?: (id: number) => void;
}

interface SeriesOverviewCardProps {
  item: SeriesListItem;
  onToggleMonitored: (id: number, monitored: boolean) => void;
  onDelete?: (id: number) => void;
  onRefresh?: (id: number) => void;
}

function SeriesOverviewCard({ item, onToggleMonitored, onDelete, onRefresh }: SeriesOverviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const progress = calculateEpisodeProgress(item);
  const { total, completed } = getEpisodeCounts(item);
  const nextAiring = getNextAiring(item);
  const lastAired = getLastAired(item);
  const posterUrl = item.posterUrl ?? '/images/placeholder-poster.png';

  return (
    <article className="flex gap-4 rounded-md border border-border-subtle bg-surface-1 p-4 transition-colors hover:border-border-subtle hover:bg-surface-2">
      {/* Poster Thumbnail */}
      <Link
        to={`/library/tv/${item.id}`}
        className="flex-shrink-0"
      >
        <div className="h-32 w-24 overflow-hidden rounded-md bg-surface-2">
          <img
            src={posterUrl}
            alt={item.title}
            className="h-full w-full object-cover transition-transform hover:scale-105"
            loading="lazy"
            onError={event => {
              const target = event.currentTarget;
              target.src = '/images/placeholder-poster.png';
            }}
          />
        </div>
      </Link>

      {/* Series Details */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link
              to={`/library/tv/${item.id}`}
              className="line-clamp-1 text-base font-medium text-text-primary hover:text-accent-primary"
            >
              {item.title}
            </Link>
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
              {item.year && <span>{item.year}</span>}
              {item.year && item.network && <span>•</span>}
              {item.network && <span>{item.network}</span>}
              {item.status && <StatusBadge status={item.status} />}
            </div>
          </div>

          {/* Monitoring Toggle */}
          <button
            type="button"
            className="flex-shrink-0 rounded-md p-1.5 transition-colors hover:bg-surface-3"
            onClick={() => onToggleMonitored(item.id, !Boolean(item.monitored))}
            aria-label={item.monitored ? 'Disable monitoring' : 'Enable monitoring'}
          >
            {item.monitored ? (
              <Icon name="success" className="text-status-completed" />
            ) : (
              <Icon name="warning" className="text-text-muted" />
            )}
          </button>
        </div>

        {/* Episode Progress */}
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <span>{completed}/{total} episodes</span>
          <div className="flex-1">
            <ProgressBar value={progress} />
          </div>
          {item.sizeOnDisk != null && item.sizeOnDisk > 0 && (
            <span className="flex-shrink-0 text-text-muted">{formatBytes(item.sizeOnDisk)}</span>
          )}
        </div>

        {/* Episode Info */}
        <div className="flex flex-col gap-1 text-xs text-text-secondary">
          {nextAiring && (
            <div className="flex items-center gap-1">
              <Icon name="play" className="h-3 w-3 text-accent-primary" />
              <span>
                Next: S{nextAiring.seasonNumber}E{nextAiring.episodeNumber} - {formatRelativeDate(nextAiring.airDate)}
              </span>
            </div>
          )}
          {lastAired && !nextAiring && (
            <div className="flex items-center gap-1">
              <span>Last: S{lastAired.seasonNumber}E{lastAired.episodeNumber} - {formatRelativeDate(lastAired.airDate)}</span>
            </div>
          )}
        </div>

        {/* Expandable Description */}
        {item.overview && (
          <div className="text-xs">
            <button
              type="button"
              className="text-accent-primary hover:underline"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
              aria-controls={`overview-${item.id}`}
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
            {isExpanded && (
              <p id={`overview-${item.id}`} className="mt-1 line-clamp-4 text-text-secondary">
                {item.overview}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-auto flex justify-end gap-2">
          {onRefresh && (
            <button
              type="button"
              className="rounded-sm border border-border-subtle px-2 py-1 text-xs transition-colors hover:bg-surface-3"
              onClick={() => onRefresh(item.id)}
              aria-label={`Refresh ${item.title}`}
            >
              <Icon name="refresh" />
            </button>
          )}
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-2 py-1 text-xs transition-colors hover:bg-surface-3"
            aria-label={`Edit ${item.title}`}
          >
            <Icon name="edit" />
          </button>
          {onDelete && (
            <button
              type="button"
              className="rounded-sm border border-status-error/60 px-2 py-1 text-xs text-status-error transition-colors hover:bg-status-error/10"
              onClick={() => {
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
    </article>
  );
}

export function SeriesOverviewView({ items, onToggleMonitored, onDelete, onRefresh }: OverviewViewProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-surface-1 py-12">
        <Icon name="search" className="mb-4 text-4xl text-text-muted" />
        <p className="text-center text-text-secondary">No series found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map(item => (
        <SeriesOverviewCard
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
