'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/primitives/Icon';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { LanguageBadge } from '@/components/subtitles/LanguageBadge';
import { formatBytes } from '@/lib/format';
import { getFileStatus, getRatingDisplay, getRuntimeDisplay, type MovieListItem } from '@/types/movie';
import {
  summarizeSubtitleCoverage,
  subtitleStatusLabel,
  subtitleStatusBadgeClass,
} from '@/lib/subtitles/coverage';

interface MovieOverviewViewProps {
  items: MovieListItem[];
  onToggleMonitored: (id: number, monitored: boolean) => void;
  onDelete?: (id: number) => void;
  onSearch?: (id: number) => void;
  isLoading?: boolean;
}

interface MovieOverviewCardProps {
  item: MovieListItem;
  onToggleMonitored: (id: number, monitored: boolean) => void;
  onDelete?: (id: number) => void;
  onSearch?: (id: number) => void;
}

function summarizeMovieSubtitles(item: MovieListItem): ReturnType<typeof summarizeSubtitleCoverage> {
  const availableSet = new Set<string>();
  const missingSet = new Set<string>();

  for (const variant of item.fileVariants ?? []) {
    for (const track of variant.subtitleTracks ?? []) {
      const code = track.languageCode?.trim().toLowerCase();
      if (code) availableSet.add(code);
    }
    for (const missing of variant.missingSubtitles ?? []) {
      const code = missing.languageCode?.trim().toLowerCase();
      if (code) missingSet.add(code);
    }
  }

  return summarizeSubtitleCoverage([...availableSet], [...missingSet]);
}

function MovieOverviewCard({ item, onToggleMonitored, onDelete, onSearch }: MovieOverviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const fileStatus = getFileStatus(item);
  const posterUrl = item.posterUrl ?? '/images/placeholder-poster.png';
  const rating = getRatingDisplay(item);
  const subtitleSummary = summarizeMovieSubtitles(item);

  return (
    <article className="flex gap-4 rounded-md border border-border-subtle bg-surface-1 p-4 transition-colors hover:border-border-subtle hover:bg-surface-2">
      {/* Poster Thumbnail */}
      <Link
        to={`/library/movies/${item.id}`}
        className="flex-shrink-0"
      >
        <div className="h-32 w-20 overflow-hidden rounded-md bg-surface-2">
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

      {/* Movie Details */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link
              to={`/library/movies/${item.id}`}
              className="line-clamp-1 text-base font-medium text-text-primary hover:text-accent-primary"
            >
              {item.title}
            </Link>
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
              {item.year && <span>{item.year}</span>}
              {item.certification && <span>•</span>}
              {item.certification && <span>{item.certification}</span>}
              {item.runtime && <span>•</span>}
              {item.runtime && <span>{getRuntimeDisplay(item.runtime)}</span>}
              <StatusBadge status={fileStatus} />
              {item.sizeOnDisk != null && item.sizeOnDisk > 0 && (
                <span className="text-text-muted">• {formatBytes(item.sizeOnDisk)}</span>
              )}
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

        {/* Rating and Additional Info */}
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          {rating && (
            <div className="flex items-center gap-1">
              <span className="text-yellow-400">⭐</span>
              <span>{rating}</span>
            </div>
          )}
          {item.tmdbId && (
            <div className="flex items-center gap-1 text-text-muted">
              <Icon name="info" />
              <span>TMDb: {item.tmdbId}</span>
            </div>
          )}
        </div>

        {subtitleSummary.status !== 'none' && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className={`rounded-sm px-1.5 py-0.5 text-[10px] ${subtitleStatusBadgeClass(subtitleSummary.status)}`}>
              {subtitleStatusLabel(subtitleSummary.status)}
            </span>
            {subtitleSummary.availableLanguages.slice(0, 3).map(code => (
              <LanguageBadge key={`available-${item.id}-${code}`} languageCode={code} variant="available" />
            ))}
            {subtitleSummary.missingLanguages.slice(0, 3).map(code => (
              <LanguageBadge key={`missing-${item.id}-${code}`} languageCode={code} variant="missing" />
            ))}
            {subtitleSummary.availableLanguages.length > 3 && (
              <span className="text-[10px] text-text-muted">+{subtitleSummary.availableLanguages.length - 3} available</span>
            )}
            {subtitleSummary.missingLanguages.length > 3 && (
              <span className="text-[10px] text-text-muted">+{subtitleSummary.missingLanguages.length - 3} missing</span>
            )}
          </div>
        )}

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
              <p id={`overview-${item.id}`} className="mt-1 line-clamp-3 text-text-secondary">
                {item.overview}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-auto flex justify-end gap-2">
          {onSearch && (
            <button
              type="button"
              className="rounded-sm border border-border-subtle px-2 py-1 text-xs transition-colors hover:bg-surface-3"
              onClick={() => onSearch(item.id)}
              aria-label={`Search ${item.title}`}
            >
              <Icon name="search" />
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

function MovieOverviewCardSkeleton() {
  return (
    <article className="flex gap-4 rounded-md border border-border-subtle bg-surface-1 p-4">
      <div className="h-32 w-20 animate-pulse rounded-md bg-surface-2" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-5 w-3/4 animate-pulse rounded bg-surface-2" />
        <div className="flex gap-2">
          <div className="h-3 w-12 animate-pulse rounded bg-surface-2" />
          <div className="h-3 w-12 animate-pulse rounded bg-surface-2" />
        </div>
        <div className="flex-1 animate-pulse rounded bg-surface-2" />
        <div className="h-6 w-20 animate-pulse rounded bg-surface-2 self-end" />
      </div>
    </article>
  );
}

export function MovieOverviewView({ items, onToggleMonitored, onDelete, onSearch, isLoading }: MovieOverviewViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <MovieOverviewCardSkeleton key={i} />
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
    <div className="space-y-3">
      {items.map(item => (
        <MovieOverviewCard
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
