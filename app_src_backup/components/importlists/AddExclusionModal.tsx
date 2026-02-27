'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/primitives/Button';
import { Alert } from '@/components/primitives/Alert';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { getApiClients } from '@/lib/api/client';
import type { CreateExclusionInput, ImportListExclusion } from '@/lib/api/importListsApi';
import type { DiscoverMovie } from '@/lib/api/discoverApi';

interface AddExclusionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (input: CreateExclusionInput) => Promise<void> | void;
  existingExclusions: ImportListExclusion[];
  isLoading?: boolean;
}

interface SearchResult {
  id: number;
  title: string;
  year: number;
  overview?: string;
  posterUrl?: string;
  mediaType: 'movie' | 'tv';
}

export function AddExclusionModal({
  isOpen,
  onClose,
  onAdd,
  existingExclusions,
  isLoading = false,
}: AddExclusionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      // Search movies using discover API
      const movieResults = await getApiClients().discoverApi.searchMovies({ query: searchQuery.trim() });
      
      // Transform to our format
      const results: SearchResult[] = movieResults.results.map((movie: DiscoverMovie) => ({
        id: movie.tmdbId,
        title: movie.title,
        year: movie.year,
        overview: movie.overview,
        posterUrl: movie.posterUrl,
        mediaType: 'movie' as const,
      }));

      setSearchResults(results);
    } catch (error) {
      setSearchError('Failed to search. Please try again.');
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleAddExclusion = async () => {
    if (!selectedResult) return;

    await onAdd({
      tmdbId: selectedResult.id,
      title: `${selectedResult.title} (${selectedResult.year})`,
    });

    // Reset state
    setSearchQuery('');
    setSearchResults([]);
    setSelectedResult(null);
  };

  const isExcluded = (result: SearchResult): boolean => {
    return existingExclusions.some((ex) => ex.tmdbId === result.id);
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedResult(null);
    setSearchError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      ariaLabel="Add Exclusion"
      onClose={handleClose}
      maxWidthClassName="max-w-2xl"
    >
      <ModalHeader title="Add Exclusion" onClose={handleClose} />
      <ModalBody>
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Search for a movie or TV series to exclude from automatic import.
          </p>

          {/* Search Input */}
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary"
              placeholder="Search for a movie or TV series..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button variant="primary" onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Search Error */}
          {searchError && (
            <Alert variant="danger">
              <p>{searchError}</p>
            </Alert>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-text-primary">Search Results</h4>
              <div className="max-h-64 overflow-y-auto space-y-2 rounded-sm border border-border-subtle">
                {searchResults.map((result) => {
                  const excluded = isExcluded(result);
                  const isSelected = selectedResult?.id === result.id;
                  return (
                    <button
                      key={`${result.mediaType}-${result.id}`}
                      type="button"
                      className={`w-full text-left p-3 flex gap-3 hover:bg-surface-1 transition ${
                        isSelected ? 'bg-accent-primary/10 border-l-2 border-accent-primary' : ''
                      } ${excluded ? 'opacity-50' : ''}`}
                      onClick={() => !excluded && setSelectedResult(result)}
                      disabled={excluded}
                    >
                      {result.posterUrl ? (
                        <img
                          src={result.posterUrl}
                          alt={result.title}
                          className="w-12 h-16 object-cover rounded-sm"
                        />
                      ) : (
                        <div className="w-12 h-16 bg-surface-2 rounded-sm flex items-center justify-center">
                          <span className="text-xs text-text-muted">No Image</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary truncate">
                            {result.title}
                          </span>
                          <span className="text-xs text-text-muted">({result.year})</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-text-muted capitalize">
                            {result.mediaType}
                          </span>
                          {excluded && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-status-warning/15 text-status-warning">
                              Excluded
                            </span>
                          )}
                        </div>
                        {result.overview && (
                          <p className="text-xs text-text-secondary line-clamp-2 mt-1">
                            {result.overview}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Results */}
          {searchQuery && !isSearching && searchResults.length === 0 && !searchError && (
            <p className="text-sm text-text-muted text-center py-4">
              No results found for &ldquo;{searchQuery}&rdquo;
            </p>
          )}

          {/* Selected Item */}
          {selectedResult && (
            <div className="rounded-sm border border-accent-primary bg-accent-primary/5 p-3">
              <h4 className="text-sm font-medium text-text-primary mb-2">Selected for Exclusion:</h4>
              <div className="flex items-center gap-3">
                <span className="font-medium">{selectedResult.title}</span>
                <span className="text-sm text-text-muted">({selectedResult.year})</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-text-muted capitalize">
                  {selectedResult.mediaType}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-2">
                TMDB ID: {selectedResult.id}
              </p>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleAddExclusion}
          disabled={!selectedResult || isLoading}
        >
          {isLoading ? 'Adding...' : 'Add Exclusion'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
