'use client';

import type { CastMember } from '@/types/movie';

export interface CastCardProps {
  cast: CastMember;
}

export function CastCard({ cast }: CastCardProps) {
  const { name, character, profileUrl } = cast;

  return (
    <div className="group flex flex-col gap-2">
      <div className="aspect-[2/3] overflow-hidden rounded-lg bg-surface-2 shadow-elevation-1">
        {profileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profileUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-muted">
            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">{name}</p>
        <p className="truncate text-xs text-text-secondary">{character}</p>
      </div>
    </div>
  );
}
