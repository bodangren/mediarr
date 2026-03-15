
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Icon } from '@/components/primitives/Icon';
import { getApiClients } from '@/lib/api/client';

interface Episode {
  id: number;
  episodeNumber: number;
  title: string;
}

interface Season {
  id: number;
  seasonNumber: number;
  episodes: Episode[];
}

interface Series {
  id: number;
  title: string;
  seasons: Season[];
}

interface ManualEpisodeMatchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  originalSeriesTitle?: string;
  originalSeasonNumber?: number;
  originalEpisodeNumber?: number;
  onSelect: (match: { seriesId: number; seasonId: number; episodeId: number; seriesTitle: string }) => void;
}

export function ManualEpisodeMatchDialog({
  isOpen,
  onClose,
  originalSeriesTitle,
  originalSeasonNumber,
  originalEpisodeNumber,
  onSelect,
}: ManualEpisodeMatchDialogProps) {
  const { mediaApi, seriesApi } = useMemo(() => getApiClients(), []);
  const [searchQuery, setSearchQuery] = useState(originalSeriesTitle || '');
  const [searchResults, setSearchResults] = useState<Series[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Selected series state
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSearchResults([]);
      setHasSearched(false);
      setSelectedSeries(null);
      setSelectedSeason(null);
      setSelectedEpisode(null);
    } else if (originalSeriesTitle && !hasSearched) {
      setSearchQuery(originalSeriesTitle);
    }
  }, [isOpen, originalSeriesTitle, hasSearched]);

  // Search for series
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setSelectedSeries(null);
    setSelectedSeason(null);
    setSelectedEpisode(null);

    try {
      const response = await mediaApi.searchMetadata({ term: searchQuery, mediaType: 'TV' });
      // The search returns basic metadata, we need to get full details for each
      const results = await Promise.all(
        response.slice(0, 10).map(async (item: any) => {
          try {
            const details = await seriesApi.getSeriesWithEpisodes(item.id);
            return details;
          } catch {
            return null;
          }
        })
      );
      setSearchResults(results.filter((r): r is Series => r !== null));
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, mediaApi, seriesApi]);

  // Select series
  const handleSelectSeries = useCallback((series: Series) => {
    setSelectedSeries(series);
    setSelectedSeason(null);
    setSelectedEpisode(null);

    // Auto-select season if we have original season number
    if (originalSeasonNumber !== undefined) {
      const season = series.seasons.find(s => s.seasonNumber === originalSeasonNumber);
      if (season) {
        setSelectedSeason(season);

        // Auto-select episode if we have original episode number
        if (originalEpisodeNumber !== undefined) {
          const episode = season.episodes.find(e => e.episodeNumber === originalEpisodeNumber);
          if (episode) {
            setSelectedEpisode(episode);
          }
        }
      }
    }
  }, [originalSeasonNumber, originalEpisodeNumber]);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    if (!selectedSeries || !selectedSeason || !selectedEpisode) return;

    onSelect({
      seriesId: selectedSeries.id,
      seasonId: selectedSeason.id,
      episodeId: selectedEpisode.id,
      seriesTitle: selectedSeries.title,
    });
    onClose();
  }, [selectedSeries, selectedSeason, selectedEpisode, onSelect, onClose]);

  const handleClose = useCallback(() => {
    setSearchResults([]);
    setHasSearched(false);
    onClose();
  }, [onClose]);

  const canConfirm = selectedSeries && selectedSeason && selectedEpisode;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      ariaLabel="Manual Episode Match"
      maxWidthClassName="max-w-3xl"
    >
      <ModalHeader title="Manual Episode Match" onClose={handleClose} />
      <ModalBody>
        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a series..."
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
            />
            <Button
              variant="default"
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
          {originalSeriesTitle && (
            <div className="text-sm text-text-secondary">
              Original: <strong>{originalSeriesTitle}</strong>
              {originalSeasonNumber !== undefined && ` - S${String(originalSeasonNumber).padStart(2, '0')}`}
              {originalEpisodeNumber !== undefined && `E${String(originalEpisodeNumber).padStart(2, '0')}`}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Series List */}
            <div className="border border-border-subtle rounded-md p-3 max-h-[400px] overflow-y-auto">
              <h4 className="text-sm font-semibold mb-2">Series</h4>
              {isSearching ? (
                <div className="flex items-center justify-center py-4">
                  <Icon name="refresh" className="animate-spin" />
                </div>
              ) : hasSearched && searchResults.length === 0 ? (
                <p className="text-sm text-text-secondary">No series found</p>
              ) : selectedSeries ? (
                <button
                  type="button"
                  className="w-full text-left p-2 rounded bg-accent-primary/20 text-sm"
                  onClick={() => {
                    setSelectedSeries(null);
                    setSelectedSeason(null);
                    setSelectedEpisode(null);
                  }}
                >
                  {selectedSeries.title}
                </button>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((series) => (
                    <button
                      key={series.id}
                      type="button"
                      className="w-full text-left p-2 rounded hover:bg-surface-2 text-sm transition-colors"
                      onClick={() => handleSelectSeries(series)}
                    >
                      {series.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Season List */}
            <div className="border border-border-subtle rounded-md p-3 max-h-[400px] overflow-y-auto">
              <h4 className="text-sm font-semibold mb-2">Season</h4>
              {selectedSeries ? (
                <div className="space-y-1">
                  {selectedSeries.seasons.map((season) => (
                    <button
                      key={season.id}
                      type="button"
                      className={`w-full text-left p-2 rounded text-sm transition-colors ${
                        selectedSeason?.id === season.id
                          ? 'bg-accent-primary/20'
                          : 'hover:bg-surface-2'
                      }`}
                      onClick={() => {
                        setSelectedSeason(season);
                        setSelectedEpisode(null);
                      }}
                    >
                      Season {season.seasonNumber}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">Select a series first</p>
              )}
            </div>

            {/* Episode List */}
            <div className="border border-border-subtle rounded-md p-3 max-h-[400px] overflow-y-auto">
              <h4 className="text-sm font-semibold mb-2">Episode</h4>
              {selectedSeason ? (
                <div className="space-y-1">
                  {selectedSeason.episodes.map((episode) => (
                    <button
                      key={episode.id}
                      type="button"
                      className={`w-full text-left p-2 rounded text-sm transition-colors ${
                        selectedEpisode?.id === episode.id
                          ? 'bg-accent-primary/20'
                          : 'hover:bg-surface-2'
                      }`}
                      onClick={() => setSelectedEpisode(episode)}
                    >
                      <span className="text-text-secondary">
                        E{String(episode.episodeNumber).padStart(2, '0')}
                      </span>
                      : {episode.title}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">Select a season first</p>
              )}
            </div>
          </div>

          {/* Selection Summary */}
          {canConfirm && (
            <div className="rounded-md border border-accent-primary/40 bg-accent-primary/10 p-3">
              <p className="text-sm">
                <strong>Match:</strong> {selectedSeries.title} - 
                S{String(selectedSeason.seasonNumber).padStart(2, '0')}
                E{String(selectedEpisode.episodeNumber).padStart(2, '0')} - 
                {selectedEpisode.title}
              </p>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="default"
          onClick={handleConfirm}
          disabled={!canConfirm}
        >
          Confirm Match
        </Button>
      </ModalFooter>
    </Modal>
  );
}
