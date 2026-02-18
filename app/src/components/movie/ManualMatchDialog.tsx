'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/primitives/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/primitives/Modal';
import { Icon } from '@/components/primitives/Icon';
import { getApiClients } from '@/lib/api/client';

interface MovieSearchResult {
  id: number;
  title: string;
  year: number;
  overview?: string;
  posterUrl?: string;
  tmdbId?: number;
  imdbId?: string;
}

interface ManualMatchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  originalTitle?: string;
  originalYear?: number;
  onSelect: (movie: MovieSearchResult) => void;
}

export function ManualMatchDialog({
  isOpen,
  onClose,
  originalTitle,
  originalYear,
  onSelect,
}: ManualMatchDialogProps) {
  const { discoverApi } = useMemo(() => getApiClients(), []);
  const [searchQuery, setSearchQuery] = useState(originalTitle || '');
  const [results, setResults] = useState<MovieSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Search for movies
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      // Use discover API to search for movies
      const response = await discoverApi.searchMovies({ query: searchQuery });
      setResults(response.results.map((m: any) => ({
        id: m.id || m.tmdbId,
        title: m.title,
        year: m.year || (m.releaseDate ? new Date(m.releaseDate).getFullYear() : undefined),
        overview: m.overview,
        posterUrl: m.posterUrl || m.posterPath,
        tmdbId: m.tmdbId || m.id,
        imdbId: m.imdbId,
      })));
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, discoverApi]);

  // Initialize search with original title when dialog opens
  useMemo(() => {
    if (isOpen && originalTitle && !hasSearched) {
      setSearchQuery(originalTitle);
    }
  }, [isOpen, originalTitle, hasSearched]);

  // Reset state when dialog closes
  const handleClose = useCallback(() => {
    setResults([]);
    setHasSearched(false);
    onClose();
  }, [onClose]);

  // Handle movie selection
  const handleSelect = useCallback((movie: MovieSearchResult) => {
    onSelect(movie);
    handleClose();
  }, [onSelect, handleClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      ariaLabel="Manual Match"
      maxWidthClassName="max-w-2xl"
    >
      <ModalHeader title="Manual Match" onClose={handleClose} />
      <ModalBody>
        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a movie..."
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
            />
            <Button
              variant="primary"
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
            >
              {isSearching ? (
                <Icon name="refresh" className="animate-spin" />
              ) : (
                <Icon name="search" />
              )}
              <span>Search</span>
            </Button>
          </div>

          {/* Original info */}
          {originalTitle && (
            <div className="text-sm text-text-secondary">
              Original: <strong>{originalTitle}</strong>
              {originalYear && ` (${originalYear})`}
            </div>
          )}

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Icon name="refresh" className="animate-spin text-2xl" />
                <span className="ml-2">Searching...</span>
              </div>
            ) : hasSearched && results.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                No movies found. Try a different search term.
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((movie) => (
                  <button
                    key={movie.id}
                    type="button"
                    className="w-full text-left p-3 rounded-lg border border-border-subtle hover:bg-surface-2 transition-colors"
                    onClick={() => handleSelect(movie)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Poster thumbnail */}
                      <div className="w-12 h-18 shrink-0 bg-surface-2 rounded overflow-hidden">
                        {movie.posterUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={movie.posterUrl}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-muted">
                            <Icon name="package" />
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-text-primary">
                          {movie.title}
                          {movie.year && (
                            <span className="text-text-secondary ml-2">({movie.year})</span>
                          )}
                        </div>
                        {movie.overview && (
                          <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                            {movie.overview}
                          </p>
                        )}
                        {movie.tmdbId && (
                          <div className="text-xs text-text-muted mt-1">
                            TMDB: {movie.tmdbId}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
}
