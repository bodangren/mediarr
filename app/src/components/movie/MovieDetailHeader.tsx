'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/primitives/Icon';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import type { MovieDetail } from '@/types/movie';
import { formatFileSize } from '@/types/movie';
import { getRuntimeDisplay } from '@/types/movie';

export interface MovieDetailHeaderProps {
  movie: MovieDetail;
  onMonitoredChange: (monitored: boolean) => void;
  onPreviousMovie?: () => void;
  onNextMovie?: () => void;
}

export function MovieDetailHeader({ movie, onMonitoredChange, onPreviousMovie, onNextMovie }: MovieDetailHeaderProps) {
  const [overviewExpanded, setOverviewExpanded] = useState(false);

  const { title, year, overview, runtime, certification, posterUrl, status, monitored, sizeOnDisk, ratings, qualityProfileName, genres, studio, collection } = movie;

  const toggleMonitored = () => {
    onMonitoredChange(!monitored);
  };

  return (
    <div className="space-y-4 rounded-lg border border-border-subtle bg-surface-1 p-4">
      {/* Backdrop gradient background */}
      <div className="absolute inset-0 -z-10 h-48 bg-gradient-to-b from-surface-2 to-surface-1 rounded-t-lg" />

      <div className="flex flex-col gap-4 md:flex-row">
        {/* Poster */}
        <div className="flex-shrink-0">
          <div className="h-80 w-56 overflow-hidden rounded-lg bg-surface-2 shadow-elevation-1">
            {posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={posterUrl} alt={title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-text-muted">
                <svg className="h-24 w-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Movie Info */}
        <div className="flex-1 space-y-3">
          {/* Title and Year with Nav */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <span>{year}</span>
                <span>·</span>
                <span>{getRuntimeDisplay(runtime)}</span>
              </div>
            </div>
            <div className="flex gap-1">
              {onPreviousMovie && (
                <button
                  type="button"
                  className="rounded-sm border border-border-subtle px-2 py-1 text-text-secondary hover:bg-surface-2"
                  onClick={onPreviousMovie}
                >
                  <Icon name="chevron-left" />
                </button>
              )}
              {onNextMovie && (
                <button
                  type="button"
                  className="rounded-sm border border-border-subtle px-2 py-1 text-text-secondary hover:bg-surface-2"
                  onClick={onNextMovie}
                >
                  <Icon name="chevron-right" />
                </button>
              )}
            </div>
          </div>

          {/* Monitored Toggle and Metadata */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleMonitored}
              className={`flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm transition-colors ${
                monitored
                  ? 'bg-status-monitored/20 text-status-monitored border border-status-monitored/30'
                  : 'bg-surface-2 text-text-secondary border border-border-subtle hover:text-text-primary'
              }`}
            >
              <Icon name={monitored ? 'monitor' : 'monitor'} />
              <span>{monitored ? 'Monitored' : 'Unmonitored'}</span>
            </button>

            {certification && (
              <span className="rounded-sm bg-surface-2 px-2 py-1 text-xs text-text-secondary">{certification}</span>
            )}

            <StatusBadge status={status as any} />

            {qualityProfileName && (
              <span className="rounded-sm bg-surface-2 px-2 py-1 text-xs text-text-secondary">{qualityProfileName}</span>
            )}
          </div>

          {/* Ratings */}
          <div className="flex flex-wrap gap-2 text-sm">
            {ratings.tmdb && (
              <div className="flex items-center gap-1.5 rounded-sm bg-surface-2 px-2 py-1">
                <span className="font-medium text-text-secondary">TMDB</span>
                <span className="font-medium text-accent-primary">
                  <Icon name="star" className="h-3 w-3" />
                  {ratings.tmdb.toFixed(1)}
                </span>
              </div>
            )}
            {ratings.imdb && (
              <div className="flex items-center gap-1.5 rounded-sm bg-surface-2 px-2 py-1">
                <span className="font-medium text-text-secondary">IMDb</span>
                <span className="font-medium text-accent-primary">
                  <Icon name="star" className="h-3 w-3" />
                  {ratings.imdb.toFixed(1)}
                </span>
              </div>
            )}
            {ratings.rottenTomatoes && (
              <div className="flex items-center gap-1.5 rounded-sm bg-surface-2 px-2 py-1">
                <span className="font-medium text-text-secondary">RT</span>
                <span className="font-medium text-accent-success">
                  <Icon name="star" className="h-3 w-3" />
                  {ratings.rottenTomatoes.toFixed(0)}%
                </span>
              </div>
            )}
          </div>

          {/* Size and Path */}
          <div className="flex flex-wrap gap-3 text-sm text-text-secondary">
            {sizeOnDisk && (
              <div className="flex items-center gap-1.5">
                <Icon name="disk" className="h-4 w-4" />
                <span>{formatFileSize(sizeOnDisk)}</span>
              </div>
            )}
            {collection && (
              <div className="flex items-center gap-1.5">
                <Icon name="package" className="h-4 w-4" />
                <Link
                  to={`/library/collections/${collection.id}`}
                  className="hover:text-accent-primary hover:underline"
                >
                  {collection.name}
                </Link>
              </div>
            )}
          </div>

          {/* Genres and Studio */}
          {(genres?.length || studio) && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
              {genres?.length && (
                <div className="flex flex-wrap gap-1.5">
                  {genres.map((genre, idx) => (
                    <span key={idx} className="rounded-sm bg-surface-2 px-2 py-0.5 text-xs">
                      {genre}
                    </span>
                  ))}
                </div>
              )}
              {studio && <span>{studio}</span>}
            </div>
          )}

          {/* Overview */}
          {overview && (
            <div className="text-sm">
              <button
                type="button"
                className="flex items-center gap-2 text-text-secondary hover:text-text-primary"
                onClick={() => setOverviewExpanded(!overviewExpanded)}
              >
                <span className="font-medium">Overview</span>
                <Icon name={overviewExpanded ? 'chevron-up' : 'chevron-down'} />
              </button>
              {overviewExpanded && (
                <p className="mt-2 text-text-secondary leading-relaxed">{overview}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
