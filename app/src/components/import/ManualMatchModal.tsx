
import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/primitives/Modal';
import { Button } from '@/components/primitives/Button';
import { SkeletonBlock } from '@/components/primitives/SkeletonBlock';
import type { DetectedSeries, SeriesSearchResult } from './types';
import { mockSearchResults } from './types';

interface ManualMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  series: DetectedSeries | null;
  onMatch: (detectedSeriesId: number, matchedSeries: SeriesSearchResult) => void;
}

export function ManualMatchModal({ isOpen, onClose, series, onMatch }: ManualMatchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SeriesSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SeriesSearchResult | null>(null);

  // Reset state when modal opens/closes or series changes
  useEffect(() => {
    if (isOpen && series) {
      setSearchTerm(series.folderName);
      setSelectedResult(null);
      // Auto-search on open
      performSearch(series.folderName);
    }
  }, [isOpen, series]);

  const performSearch = async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    
    // Mock implementation - replace with actual API call when backend is ready
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Filter mock results based on search term
    const filtered = mockSearchResults.filter(
      r => r.title.toLowerCase().includes(term.toLowerCase())
    );
    
    setResults(filtered);
    setIsSearching(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchTerm);
  };

  const handleSelect = (result: SeriesSearchResult) => {
    setSelectedResult(result);
  };

  const handleConfirm = () => {
    if (series && selectedResult) {
      onMatch(series.id, selectedResult);
      onClose();
    }
  };

  if (!series) return null;

  return (
    <Modal isOpen={isOpen} ariaLabel="Manual Series Match" onClose={onClose} maxWidthClassName="max-w-2xl">
      <ModalHeader title={`Match: ${series.folderName}`} onClose={onClose} />
      <ModalBody>
        <div className="space-y-4">
          {/* Series Info */}
          <div className="rounded-md border border-border-subtle bg-surface-2 p-3 text-sm">
            <p className="text-xs text-text-secondary">Detected from:</p>
            <p className="font-medium text-text-primary">{series.path}</p>
            <p className="text-xs text-text-secondary mt-1">
              {series.fileCount} files found
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search for series..."
              className="flex-1 rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
              aria-label="Search for series"
            />
            <Button type="submit" disabled={isSearching || !searchTerm.trim()}>
              Search
            </Button>
          </form>

          {/* Search Results */}
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {isSearching ? (
              <div className="space-y-2">
                <SkeletonBlock className="h-16 w-full" />
                <SkeletonBlock className="h-16 w-full" />
                <SkeletonBlock className="h-16 w-full" />
              </div>
            ) : results.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-secondary">
                No results found. Try a different search term.
              </p>
            ) : (
              results.map(result => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => handleSelect(result)}
                  className={`w-full rounded-md border p-3 text-left transition ${
                    selectedResult?.id === result.id
                      ? 'border-accent-primary bg-accent-primary/10'
                      : 'border-border-subtle bg-surface-1 hover:border-accent-primary/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-text-primary">
                        {result.title}
                        {result.year && (
                          <span className="ml-2 text-text-secondary">({result.year})</span>
                        )}
                      </p>
                      {result.network && (
                        <p className="text-xs text-text-secondary">{result.network}</p>
                      )}
                      {result.status && (
                        <p className="text-xs text-text-secondary capitalize">{result.status}</p>
                      )}
                    </div>
                    {selectedResult?.id === result.id && (
                      <span className="text-accent-primary">✓</span>
                    )}
                  </div>
                  {result.overview && (
                    <p className="mt-2 line-clamp-2 text-xs text-text-secondary">
                      {result.overview}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleConfirm} disabled={!selectedResult}>
          Confirm Match
        </Button>
      </ModalFooter>
    </Modal>
  );
}
