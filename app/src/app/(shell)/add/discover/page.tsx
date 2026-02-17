'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { EmptyPanel } from '@/components/primitives/EmptyPanel';
import { Icon } from '@/components/primitives/Icon';
import { DiscoverFilters } from '@/components/discover/DiscoverFilters';
import type { DiscoverMovie, DiscoverMode, DiscoverFilters as DiscoverFiltersType } from '@/types/discover';
import { mockDiscoverMovies } from '@/lib/mocks/discoverMocks';

interface DiscoverMovieCardProps {
  movie: DiscoverMovie;
  onAdd: (movie: DiscoverMovie) => void;
}

function DiscoverMovieCard({ movie, onAdd }: DiscoverMovieCardProps) {
  const posterUrl = movie.posterUrl ?? '/images/placeholder-poster.png';

  return (
    <div className="group relative flex flex-col gap-2 overflow-hidden rounded-md border border-border-subtle bg-surface-1 transition-all hover:shadow-elevation-2">
      <div className="relative aspect-[2/3] overflow-hidden bg-surface-2">
        <img
          src={posterUrl}
          alt={movie.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={event => {
            const target = event.currentTarget;
            target.src = '/images/placeholder-poster.png';
          }}
        />

        {/* Rating Badge */}
        <div className="absolute bottom-2 left-2 rounded-full bg-surface-0/90 px-2 py-1 text-xs font-medium text-text-primary">
          ⭐ {movie.ratings.tmdb.toFixed(1)}
        </div>

        {/* In Library Indicator */}
        {movie.inLibrary && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-status-completed/20 px-2 py-1 text-xs font-medium text-status-completed">
            <Icon name="success" className="h-3 w-3" />
            <span>In Library</span>
          </div>
        )}

        {/* Hover Action Button */}
        <div className="absolute inset-0 flex items-center justify-center bg-surface-0/80 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onAdd(movie)}
            disabled={movie.inLibrary}
            className="rounded-sm bg-accent-primary px-4 py-2 text-sm font-medium text-text-on-accent transition-colors hover:bg-accent-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {movie.inLibrary ? 'Already Added' : 'Add to Library'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1 px-2 pb-2">
        <h3 className="line-clamp-2 text-sm font-medium text-text-primary group-hover:text-accent-primary">{movie.title}</h3>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span>{movie.year}</span>
          {movie.certification && (
            <>
              <span className="text-border-subtle">•</span>
              <span>{movie.certification}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DiscoverMoviesPage() {
  const router = useRouter();
  const [mode, setMode] = useState<DiscoverMode>('popular');
  const [filters, setFilters] = useState<DiscoverFiltersType>({
    genres: [],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<DiscoverMovie | null>(null);

  const filteredMovies = useMemo(() => {
    const movies = mockDiscoverMovies[mode];

    return movies.filter(movie => {
      if (filters.minYear && movie.year < filters.minYear) {
        return false;
      }
      if (filters.maxYear && movie.year > filters.maxYear) {
        return false;
      }
      if (filters.genres.length > 0) {
        const hasGenre = filters.genres.some(genre => movie.genres.includes(genre));
        if (!hasGenre) {
          return false;
        }
      }
      if (filters.certification && movie.certification !== filters.certification) {
        return false;
      }
      return true;
    });
  }, [mode, filters]);

  const handleAddMovie = (movie: DiscoverMovie) => {
    setSelectedMovie(movie);
    router.push(`/add/new?q=${encodeURIComponent(movie.title)}`);
  };

  const handleApplyFilters = () => {
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setFilters({ genres: [] });
    setShowFilters(false);
  };

  const activeFiltersCount =
    (filters.minYear ? 1 : 0) +
    (filters.maxYear ? 1 : 0) +
    filters.genres.length +
    (filters.certification ? 1 : 0) +
    (filters.language ? 1 : 0);

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Discover Movies</h1>
        <p className="text-sm text-text-secondary">Browse and discover new movies to add to your library.</p>
      </header>

      {/* Mode Tabs */}
      <div className="flex flex-wrap gap-2">
        {(['popular', 'top-rated', 'new-releases', 'upcoming'] as const).map(m => (
          <button
            key={m}
            type="button"
            className={`rounded-sm border px-3 py-1.5 text-sm capitalize transition-colors ${
              mode === m
                ? 'border-accent-primary bg-accent-primary/20 text-accent-primary'
                : 'border-border-subtle bg-surface-1 text-text-primary hover:bg-surface-2'
            }`}
            onClick={() => setMode(m)}
          >
            {m.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 rounded-sm border px-3 py-1.5 text-sm transition-colors ${
            activeFiltersCount > 0
              ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
              : 'border-border-subtle bg-surface-1 text-text-primary hover:bg-surface-2'
          }`}
        >
          <Icon name="settings" />
          <span>Filters</span>
          {activeFiltersCount > 0 && <span className="rounded-full bg-accent-primary px-1.5 text-xs text-text-on-accent">{activeFiltersCount}</span>}
        </button>
        <span className="text-sm text-text-secondary">{filteredMovies.length} results</span>
      </div>

      <div className="flex gap-4">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="hidden w-64 lg:block">
            <DiscoverFilters
              filters={filters}
              onChange={setFilters}
              onApply={handleApplyFilters}
              onClear={handleClearFilters}
            />
          </div>
        )}

        {/* Movie Grid */}
        <div className="flex-1">
          <QueryPanel
            isLoading={false}
            isError={false}
            isEmpty={filteredMovies.length === 0}
            emptyTitle="No movies found"
            emptyBody="Try adjusting your filters or switching to a different mode."
            onRetry={() => {}}
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredMovies.map(movie => (
                <DiscoverMovieCard key={movie.tmdbId} movie={movie} onAdd={handleAddMovie} />
              ))}
            </div>
          </QueryPanel>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-3/70 p-4 lg:hidden">
          <div className="w-full max-w-md rounded-md bg-surface-1 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="rounded-sm border border-border-subtle px-2 py-1 text-sm"
              >
                Close
              </button>
            </div>
            <DiscoverFilters
              filters={filters}
              onChange={setFilters}
              onApply={handleApplyFilters}
              onClear={handleClearFilters}
            />
          </div>
        </div>
      )}
    </section>
  );
}
