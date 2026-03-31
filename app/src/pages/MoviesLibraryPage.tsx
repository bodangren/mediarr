import { useEffect, useMemo, useState } from 'react';
import { Folder, RefreshCw } from 'lucide-react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { MovieInteractiveSearchModal } from '@/components/movie/MovieInteractiveSearchModal';
import { ImportWizard } from '@/components/import/ImportWizard';
import { MovieOverviewView } from '@/components/views';
import { getApiClients } from '@/lib/api/client';
import type { MovieListItem as MovieViewItem } from '@/types/movie';
import type { MetadataSearchResult } from '@/lib/api/mediaApi';

interface UnknownMovieGroup {
  title: string;
  files: string[];
}

export function MoviesLibraryPage() {
  const api = useMemo(() => getApiClients(), []);
  const [movies, setMovies] = useState<MovieViewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchMovieId, setSearchMovieId] = useState<number | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const [rescanResult, setRescanResult] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<{ label: string; files: string[] }[]>([]);
  const [unknownMovies, setUnknownMovies] = useState<UnknownMovieGroup[]>([]);

  // Per-unknown-movie search state
  const [searchingFor, setSearchingFor] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<MetadataSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const handleRescan = async () => {
    setIsRescanning(true);
    setRescanResult(null);
    setDuplicates([]);
    setUnknownMovies([]);
    try {
      const res = await fetch('/api/library/rescan/movies', { method: 'POST' });
      const data = await res.json() as { data?: { filesLinked: number; staleCleared: number; skipped: number; duplicates: { label: string; files: string[] }[]; unknownMovies: UnknownMovieGroup[] } };
      const d = data.data;
      if (d) {
        setRescanResult(`Linked ${d.filesLinked} file(s), cleared ${d.staleCleared} stale, skipped ${d.skipped}`);
        setDuplicates(d.duplicates ?? []);
        setUnknownMovies(d.unknownMovies ?? []);
      } else {
        setRescanResult('Rescan complete');
      }
      void load();
    } catch {
      setRescanResult('Rescan failed');
    } finally {
      setIsRescanning(false);
    }
  };

  const handleDeleteDuplicate = async (filePath: string, groupLabel: string) => {
    try {
      await fetch('/api/library/file', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: filePath }) });
      setDuplicates(prev => prev.map(g =>
        g.label === groupLabel ? { ...g, files: g.files.filter(f => f !== filePath) } : g
      ).filter(g => g.files.length > 1));
    } catch {
      // ignore
    }
  };

  const openSearch = (title: string) => {
    setSearchingFor(title);
    setSearchTerm(title);
    setSearchResults([]);
  };

  const runSearch = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    try {
      const results = await api.mediaApi.searchMetadata({ term: searchTerm, mediaType: 'MOVIE' });
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddAndLink = async (item: MetadataSearchResult, group: UnknownMovieGroup) => {
    const key = `${item.tmdbId}-${item.tvdbId}`;
    setAddingId(key);
    try {
      const created = await api.mediaApi.addToWanted({
        mediaType: 'MOVIE',
        tmdbId: item.tmdbId,
        title: item.title,
        year: item.year,
        status: item.status,
        overview: item.overview,
        posterUrl: item.images?.find(i => i.coverType === 'poster')?.url,
      });

      // Link the first file to the newly-added movie
      if (group.files[0]) {
        await fetch('/api/library/link-movie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ movieId: created.id, path: group.files[0] }),
        });
      }

      setUnknownMovies(prev => prev.filter(g => g.title !== group.title));
      setSearchingFor(null);
      void load();
    } finally {
      setAddingId(null);
    }
  };

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleRescan()}
            disabled={isRescanning}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border-subtle bg-surface-2 px-3 py-1.5 text-sm font-medium hover:bg-surface-3 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRescanning ? 'animate-spin' : ''} />
            {isRescanning ? 'Rescanning…' : 'Rescan Library'}
          </button>
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border-subtle bg-surface-2 px-3 py-1.5 text-sm font-medium hover:bg-surface-3"
          >
            <Folder size={14} />
            Import Existing
          </button>
        </div>
      }
    >
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      {rescanResult ? <p className="text-sm text-text-secondary">{rescanResult}</p> : null}
      {duplicates.length > 0 && (
        <div className="rounded-sm border border-border-subtle bg-surface-2 p-3 text-sm space-y-3">
          <p className="font-medium text-status-warning">Duplicates found — keep first file, delete others:</p>
          {duplicates.map(group => (
            <div key={group.label} className="space-y-1">
              <p className="font-medium">{group.label}</p>
              {group.files.map((f, i) => (
                <div key={f} className="flex items-center justify-between gap-2 pl-2">
                  <span className="truncate text-text-secondary font-mono text-xs">{f}</span>
                  {i === 0
                    ? <span className="shrink-0 text-xs text-status-success">kept</span>
                    : <button type="button" onClick={() => void handleDeleteDuplicate(f, group.label)} className="shrink-0 rounded-sm border border-status-error px-2 py-0.5 text-xs text-status-error hover:bg-status-error hover:text-white">Delete</button>
                  }
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {unknownMovies.length > 0 && (
        <div className="rounded-sm border border-border-subtle bg-surface-2 p-3 text-sm space-y-3">
          <p className="font-medium text-status-warning">Unknown movies found — add to watchlist to link files:</p>
          {unknownMovies.map(group => (
            <div key={group.title} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{group.title}</p>
                  <p className="text-xs text-text-secondary">{group.files.length} file(s)</p>
                </div>
                <button
                  type="button"
                  onClick={() => openSearch(group.title)}
                  className="shrink-0 rounded-sm border border-border-subtle bg-surface-3 px-3 py-1 text-xs font-medium hover:bg-surface-1"
                >
                  Search & Add
                </button>
              </div>
              {searchingFor === group.title && (
                <div className="pl-2 space-y-2 border-l border-border-subtle">
                  <div className="flex gap-2">
                    <input
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') void runSearch(); }}
                      className="flex-1 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs"
                      placeholder="Search title..."
                    />
                    <button
                      type="button"
                      onClick={() => void runSearch()}
                      disabled={isSearching}
                      className="rounded-sm border border-border-subtle bg-surface-3 px-3 py-1 text-xs font-medium disabled:opacity-50"
                    >
                      {isSearching ? '…' : 'Search'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSearchingFor(null)}
                      className="rounded-sm border border-border-subtle bg-surface-3 px-2 py-1 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  {searchResults.length > 0 && (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {searchResults.map((item, idx) => (
                        <div key={`${item.tmdbId}-${idx}`} className="flex items-center justify-between gap-2 rounded-sm bg-surface-1 px-2 py-1.5">
                          <div className="min-w-0">
                            <span className="font-medium">{item.title}</span>
                            {item.year ? <span className="ml-1 text-text-secondary">({item.year})</span> : null}
                          </div>
                          <button
                            type="button"
                            disabled={addingId === `${item.tmdbId}-${item.tvdbId}`}
                            onClick={() => void handleAddAndLink(item, group)}
                            className="shrink-0 rounded-sm border border-border-subtle bg-surface-2 px-2 py-0.5 text-xs font-medium disabled:opacity-50 hover:bg-surface-3"
                          >
                            Add & Link
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
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
