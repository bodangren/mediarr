import { useEffect, useMemo, useState } from 'react';
import { Folder } from 'lucide-react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { MovieInteractiveSearchModal } from '@/components/movie/MovieInteractiveSearchModal';
import { ImportWizard } from '@/components/import/ImportWizard';
import { MovieOverviewView } from '@/components/views';
import { getApiClients } from '@/lib/api/client';
import type { MovieListItem as MovieViewItem } from '@/types/movie';

export function MoviesLibraryPage() {
  const api = useMemo(() => getApiClients(), []);
  const [movies, setMovies] = useState<MovieViewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchMovieId, setSearchMovieId] = useState<number | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [sortBy, setSortBy] = useState('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const page = await api.mediaApi.listMovies({ page: 1, pageSize: 10_000 });
      setMovies(page.items as MovieViewItem[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load movies');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [api]);

  const sortedMovies = useMemo(() => {
    const sign = sortDir === 'desc' ? -1 : 1;
    const field = sortBy === 'title' ? 'sortTitle' : sortBy;
    return [...movies].sort((a, b) => {
      const aVal = (a as any)[field] ?? (sortBy === 'title' ? a.title : 0);
      const bVal = (b as any)[field] ?? (sortBy === 'title' ? b.title : 0);
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * sign;
      return String(aVal ?? '').localeCompare(String(bVal ?? '')) * sign;
    });
  }, [movies, sortBy, sortDir]);

  const selectedMovie = movies.find(movie => movie.id === searchMovieId) ?? null;

  return (
    <RouteScaffold
      title="Movies"
      description="Unified movie library view with interactive search and grab actions."
      actions={
        <button
          type="button"
          onClick={() => setIsImportOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border-subtle bg-surface-2 px-3 py-1.5 text-sm font-medium hover:bg-surface-3"
        >
          <Folder size={14} />
          Import Existing
        </button>
      }
    >
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <span>Sort:</span>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
        >
          <option value="title">Name</option>
          <option value="year">Year</option>
          <option value="sizeOnDisk">Size</option>
          <option value="status">Status</option>
        </select>
        <button
          type="button"
          onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary hover:bg-surface-2"
          aria-label={sortDir === 'asc' ? 'Sort ascending' : 'Sort descending'}
        >
          {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
        </button>
      </div>
      <MovieOverviewView
        items={sortedMovies}
        isLoading={isLoading}
        onToggleMonitored={(id, monitored) => {
          void api.mediaApi.setMovieMonitored(id, monitored).then(load);
        }}
        onDelete={async id => {
          const deleteFiles = window.confirm('Also delete files from disk? This cannot be undone.');
          await api.mediaApi.deleteMovie(id, deleteFiles);
          await load();
        }}
        onSearch={id => setSearchMovieId(id)}
      />
      {selectedMovie ? (
        <MovieInteractiveSearchModal
          isOpen
          onClose={() => setSearchMovieId(null)}
          movieId={selectedMovie.id}
          movieTitle={selectedMovie.title}
          movieYear={selectedMovie.year ?? undefined}
          imdbId={selectedMovie.imdbId ?? undefined}
          tmdbId={selectedMovie.tmdbId ?? undefined}
        />
      ) : null}
      <ImportWizard
        isOpen={isImportOpen}
        onClose={() => { setIsImportOpen(false); void load(); }}
        mediaType="movie"
      />
    </RouteScaffold>
  );
}
