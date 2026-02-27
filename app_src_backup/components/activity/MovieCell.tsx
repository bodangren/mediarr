'use client';

import Link from 'next/link';

export interface MovieCellProps {
  movieId?: number;
  title: string;
  posterUrl?: string;
  year?: number;
  size?: 'small' | 'medium';
}

const SIZE_CONFIG = {
  small: {
    posterWidth: 'w-10',
    posterHeight: 'h-15',
  },
  medium: {
    posterWidth: 'w-12',
    posterHeight: 'h-18',
  },
} as const;

export function MovieCell({ movieId, title, posterUrl, year, size = 'small' }: MovieCellProps) {
  const config = SIZE_CONFIG[size];

  const content = (
    <div className="flex items-center gap-3">
      {posterUrl ? (
        <div
          className={`relative overflow-hidden rounded-sm border border-border-subtle bg-surface-2 ${config.posterWidth} ${config.posterHeight} flex-shrink-0`}
        >
          <img
            src={posterUrl}
            alt={`${title} poster`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div
          className={`flex items-center justify-center rounded-sm border border-border-subtle bg-surface-2 ${config.posterWidth} ${config.posterHeight} flex-shrink-0 text-text-muted`}
        >
          <span className="text-xs">No poster</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-text-primary">{title}</p>
        {year && <p className="text-xs text-text-secondary">{year}</p>}
      </div>
    </div>
  );

  if (movieId) {
    return (
      <Link
        href={`/movie/${movieId}`}
        className="block transition-colors hover:text-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2"
      >
        {content}
      </Link>
    );
  }

  return content;
}
