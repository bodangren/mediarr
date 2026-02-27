'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Download, AlertCircle, CheckCircle, Loader2, Filter, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Modal, ModalBody, ModalHeader } from '@/components/primitives/Modal';
import { EmptyPanel } from '@/components/primitives/EmptyPanel';
import { SkeletonBlock } from '@/components/primitives/SkeletonBlock';
import { FilterMenu } from '@/components/primitives/FilterMenu';
import { getApiClients } from '@/lib/api/client';
import { useToast } from '@/components/providers/ToastProvider';
import { QualityBadge } from '@/components/search/QualityBadge';
import { ReleaseTitle } from '@/components/search/ReleaseTitle';
import { PeersCell } from '@/components/search/PeersCell';
import { AgeCell } from '@/components/search/AgeCell';
import type { ReleaseCandidate } from '@/lib/api/releaseApi';

interface QualityInfo {
  quality: {
    name: string;
    resolution: number;
  };
  revision: {
    version: number;
    real: number;
  };
}

export interface ReleaseResult {
  id: string;
  guid: string;
  indexer: string;
  indexerId: number;
  title: string;
  quality: QualityInfo;
  size: number;
  seeders?: number;
  leechers?: number;
  publishDate: string;
  ageHours: number;
  approved: boolean;
  rejections?: string[];
  customFormatScore?: number;
  protocol?: 'torrent' | 'usenet';
}

interface GrabState {
  releaseId: string | null;
  isGrabbing: boolean;
  error: string | null;
  success: boolean;
}

interface OverrideMatchState {
  isOpen: boolean;
  releaseId: string | null;
  title: string;
  year: string;
}

export interface MovieInteractiveSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieId: number;
  movieTitle: string;
  movieYear?: number;
  imdbId?: string;
  tmdbId?: number;
}

type SortField = 'seeders' | 'size' | 'age' | 'quality';

function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function formatScore(score: number | undefined): string | null {
  if (score === undefined || score === null || score === 0) {
    return null;
  }
  const prefix = score > 0 ? '+' : '';
  return `${prefix}${score}`;
}

const qualityOptions: { key: string; label: string }[] = [
  { key: 'all', label: 'All Qualities' },
  { key: '2160p', label: '2160p (4K)' },
  { key: '1080p', label: '1080p' },
  { key: '720p', label: '720p' },
  { key: '480p', label: '480p' },
  { key: 'sd', label: 'SD' },
];

const sortOptions: { key: string; label: string }[] = [
  { key: 'seeders', label: 'Seeders' },
  { key: 'size', label: 'Size' },
  { key: 'age', label: 'Age' },
  { key: 'quality', label: 'Quality' },
];

export function MovieInteractiveSearchModal({
  isOpen,
  onClose,
  movieId,
  movieTitle,
  movieYear,
  imdbId,
  tmdbId,
}: MovieInteractiveSearchModalProps) {
  const [releases, setReleases] = useState<ReleaseResult[]>([]);
  const [filteredReleases, setFilteredReleases] = useState<ReleaseResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [grabState, setGrabState] = useState<GrabState>({
    releaseId: null,
    isGrabbing: false,
    error: null,
    success: false,
  });
  const [qualityFilter, setQualityFilter] = useState('all');
  const [indexerFilter, setIndexerFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('seeders');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [overrideMatch, setOverrideMatch] = useState<OverrideMatchState>({
    isOpen: false,
    releaseId: null,
    title: '',
    year: '',
  });
  const [availableIndexers, setAvailableIndexers] = useState<{ key: string; label: string }[]>([
    { key: 'all', label: 'All Indexers' },
  ]);

  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();

  const searchReleases = useCallback(async () => {
    setIsLoading(true);
    setSearchError(null);
    setGrabState({ releaseId: null, isGrabbing: false, error: null, success: false });

    try {
      const result = await api.movieApi.searchReleases(movieId, {
        title: movieTitle,
        ...(imdbId ? { imdbId } : {}),
        ...(!imdbId && tmdbId ? { tmdbId } : {}),
        ...(movieYear ? { year: movieYear } : {}),
      });

      // Transform API response to component's expected format
      // PaginatedResult has items property
      const releasesData: ReleaseResult[] = (result.items || []).map((candidate: ReleaseCandidate, index: number) => ({
        id: candidate.guid || `${candidate.indexer}-${index}`,
        guid: candidate.guid || `${candidate.indexer}-${index}`,
        indexer: candidate.indexer,
        indexerId: candidate.indexerId,
        title: candidate.title,
        quality: {
          quality: {
            name: candidate.quality || 'Unknown',
            resolution: getResolutionFromQuality(candidate.quality || ''),
          },
          revision: { version: 1, real: 0 },
        },
        size: candidate.size,
        seeders: candidate.seeders,
        leechers: candidate.leechers || 0,
        publishDate: candidate.publishDate || new Date().toISOString(),
        ageHours: candidate.age || 0,
        approved: !candidate.indexerFlags || candidate.indexerFlags.length === 0,
        rejections: candidate.indexerFlags ? [candidate.indexerFlags] : [],
        customFormatScore: candidate.customFormatScore ?? 0,
        protocol: candidate.protocol,
      }));

      setReleases(releasesData);

      // Extract unique indexers for filter
      const uniqueIndexers = Array.from(new Set(releasesData.map(r => r.indexer)))
        .sort()
        .map(indexer => ({ key: indexer, label: indexer }));
      setAvailableIndexers([{ key: 'all', label: 'All Indexers' }, ...uniqueIndexers]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search for releases';
      setSearchError(errorMessage);
      pushToast({
        title: 'Search failed',
        message: errorMessage,
        variant: 'error',
      });
      setReleases([]);
    } finally {
      setIsLoading(false);
    }
  }, [movieId, movieTitle, movieYear, imdbId, tmdbId, api.movieApi, pushToast]);

  // Filter and sort releases
  useEffect(() => {
    let filtered = [...releases];

    // Apply quality filter
    if (qualityFilter !== 'all') {
      filtered = filtered.filter(r => r.quality.quality.name.toLowerCase().includes(qualityFilter));
    }

    // Apply indexer filter
    if (indexerFilter !== 'all') {
      filtered = filtered.filter(r => r.indexer === indexerFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'seeders':
          comparison = (a.seeders || 0) - (b.seeders || 0);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'age':
          comparison = a.ageHours - b.ageHours;
          break;
        case 'quality':
          comparison = getQualityOrder(a.quality.quality.name) - getQualityOrder(b.quality.quality.name);
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    setFilteredReleases(filtered);
  }, [releases, qualityFilter, indexerFilter, sortField, sortDirection]);

  // Search automatically when modal opens
  useEffect(() => {
    if (isOpen) {
      void searchReleases();
    }
  }, [isOpen, searchReleases]);

  const handleGrab = useCallback(async (release: ReleaseResult) => {
    setGrabState({ releaseId: release.id, isGrabbing: true, error: null, success: false });

    try {
      await api.releaseApi.grabRelease(release.guid, release.indexerId);

      setGrabState({ releaseId: release.id, isGrabbing: false, error: null, success: true });

      pushToast({
        title: 'Release grabbed successfully',
        message: `${release.title} has been added to your download queue.`,
        variant: 'success',
      });

      // Reset success state after 3 seconds
      setTimeout(() => {
        setGrabState(prev => ({ ...prev, success: false }));
      }, 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to grab release';
      setGrabState({
        releaseId: release.id,
        isGrabbing: false,
        error: errorMessage,
        success: false,
      });

      pushToast({
        title: 'Failed to grab release',
        message: errorMessage,
        variant: 'error',
      });
    }
  }, [api.releaseApi, pushToast]);

  const handleOverrideMatch = useCallback((release: ReleaseResult) => {
    setOverrideMatch({
      isOpen: true,
      releaseId: release.id,
      title: movieTitle,
      year: movieYear ? String(movieYear) : '',
    });
  }, [movieTitle, movieYear]);

  const handleSaveOverride = useCallback(async () => {
    // This would typically call an API to save the override
    // For now, just close the modal and show a toast
    pushToast({
      title: 'Match override saved',
      message: `Release matched to "${overrideMatch.title} (${overrideMatch.year})"`,
      variant: 'success',
    });
    setOverrideMatch({ isOpen: false, releaseId: null, title: '', year: '' });
  }, [overrideMatch.title, overrideMatch.year, pushToast]);

  const handleClose = useCallback(() => {
    setReleases([]);
    setFilteredReleases([]);
    setSearchError(null);
    setGrabState({ releaseId: null, isGrabbing: false, error: null, success: false });
    setQualityFilter('all');
    setIndexerFilter('all');
    onClose();
  }, [onClose]);

  const headerTitle = (
    <span>
      Interactive Search - {movieTitle} {movieYear && `(${movieYear})`}
    </span>
  );

  const headerActions = (
    <Button
      variant="primary"
      onClick={() => void searchReleases()}
      disabled={isLoading}
      className="flex items-center gap-2"
    >
      <Search size={16} />
      {isLoading ? 'Searching...' : 'Search'}
    </Button>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        ariaLabel={`Interactive search for ${movieTitle}`}
        onClose={handleClose}
        maxWidthClassName="max-w-4xl lg:max-w-6xl"
      >
        <ModalHeader title={headerTitle} onClose={handleClose} actions={headerActions} />
        <ModalBody>
          {searchError && (
            <div className="mb-4 rounded-md border border-status-error/50 bg-status-error/10 p-3">
              <div className="flex items-center gap-2 text-status-error">
                <AlertCircle size={16} />
                <span className="text-sm">{searchError}</span>
              </div>
            </div>
          )}

          {/* Filter and Sort Controls */}
          {!isLoading && releases.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-4 rounded-md border border-border-subtle bg-surface-2 p-3">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-text-secondary" />
                <FilterMenu
                  label="Quality"
                  value={qualityFilter}
                  options={qualityOptions}
                  onChange={setQualityFilter}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-text-secondary" />
                <FilterMenu
                  label="Indexer"
                  value={indexerFilter}
                  options={availableIndexers}
                  onChange={setIndexerFilter}
                />
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown size={16} className="text-text-secondary" />
                <FilterMenu
                  label="Sort By"
                  value={sortField}
                  options={sortOptions}
                  onChange={(value) => setSortField(value as SortField)}
                />
                <Button
                  variant="secondary"
                  onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="px-2 py-1 text-xs"
                >
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4 rounded-md border border-border-subtle p-3">
                  <SkeletonBlock className="h-4 w-24" />
                  <SkeletonBlock className="h-4 flex-1" />
                  <SkeletonBlock className="h-4 w-20" />
                  <SkeletonBlock className="h-4 w-16" />
                  <SkeletonBlock className="h-4 w-20" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && filteredReleases.length === 0 && !searchError && (
            <EmptyPanel
              title={releases.length === 0 ? 'No releases found' : 'No releases match your filters'}
              body={releases.length === 0
                ? 'Try searching again or check your indexer configuration.'
                : 'Try adjusting your filters to see more results.'}
            />
          )}

          {!isLoading && filteredReleases.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-border-subtle">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-surface-2 text-text-secondary">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Source</th>
                    <th className="px-3 py-2 font-semibold">Release Title</th>
                    <th className="px-3 py-2 font-semibold">Quality</th>
                    <th className="px-3 py-2 font-semibold">Size</th>
                    <th className="px-3 py-2 font-semibold hidden md:table-cell">Peers</th>
                    <th className="px-3 py-2 font-semibold hidden lg:table-cell">Age</th>
                    <th className="px-3 py-2 font-semibold hidden lg:table-cell">Score</th>
                    <th className="px-3 py-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-surface-1">
                  {filteredReleases.map(release => {
                    const isGrabbing = grabState.releaseId === release.id && grabState.isGrabbing;
                    const grabSuccess = grabState.releaseId === release.id && grabState.success;
                    const grabError = grabState.releaseId === release.id && grabState.error;
                    const isApproved = release.approved && (!release.rejections || release.rejections.length === 0);

                    return (
                      <tr
                        key={release.id}
                        className={!isApproved ? 'bg-status-error/5' : ''}
                      >
                        <td className="px-3 py-2 text-text-primary">
                          <span className="text-xs">{release.indexer}</span>
                        </td>
                        <td className="px-3 py-2 text-text-primary max-w-xs">
                          <ReleaseTitle title={release.title} />
                          {!isApproved && release.rejections && release.rejections.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {release.rejections.map((rejection, idx) => (
                                <p key={idx} className="text-xs text-status-error">
                                  {rejection}
                                </p>
                              ))}
                            </div>
                          )}
                          {grabError && (
                            <p className="mt-1 text-xs text-status-error">{grabError}</p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <QualityBadge quality={release.quality.quality} />
                        </td>
                        <td className="px-3 py-2 text-text-primary text-xs">
                          {formatSize(release.size)}
                        </td>
                        <td className="px-3 py-2 hidden md:table-cell">
                          <PeersCell seeders={release.seeders} leechers={release.leechers} />
                        </td>
                        <td className="px-3 py-2 hidden lg:table-cell">
                          <AgeCell ageHours={release.ageHours} publishDate={release.publishDate} />
                        </td>
                        <td className="px-3 py-2 hidden lg:table-cell">
                          {formatScore(release.customFormatScore) && (
                            <span className={`text-xs font-medium ${
                              (release.customFormatScore ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {formatScore(release.customFormatScore)}
                            </span>
                          )}
                          {!formatScore(release.customFormatScore) && (
                            <span className="text-xs text-text-secondary">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {grabSuccess ? (
                            <div className="inline-flex items-center gap-1 text-green-400">
                              <CheckCircle size={16} />
                              <span className="text-xs">Grabbed</span>
                            </div>
                          ) : (
                            <div className="inline-flex gap-2">
                              {overrideMatch.isOpen && overrideMatch.releaseId === release.id ? (
                                <Button
                                  variant="secondary"
                                  onClick={() => handleOverrideMatch(release)}
                                  className="text-xs"
                                >
                                  Override
                                </Button>
                              ) : null}
                              <Button
                                variant={isApproved ? 'primary' : 'secondary'}
                                onClick={() => void handleGrab(release)}
                                disabled={isGrabbing}
                                className="inline-flex items-center gap-1"
                              >
                                {isGrabbing ? (
                                  <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span className="hidden sm:inline">Grabbing...</span>
                                  </>
                                ) : (
                                  <>
                                    <Download size={14} />
                                    <span className="hidden sm:inline">Grab</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && releases.length > 0 && (
            <div className="mt-3 flex justify-between text-xs text-text-secondary">
              <span>
                {filteredReleases.length} of {releases.length} release{releases.length !== 1 ? 's' : ''} shown
              </span>
              {filteredReleases.length < releases.length && (
                <span>Filter applied - showing matching releases</span>
              )}
            </div>
          )}
        </ModalBody>
      </Modal>

      {/* Override Match Modal */}
      {overrideMatch.isOpen && (
        <Modal
          isOpen={overrideMatch.isOpen}
          onClose={() => setOverrideMatch({ isOpen: false, releaseId: null, title: '', year: '' })}
          maxWidthClassName="max-w-md"
          ariaLabel="Override match for release"
        >
          <ModalHeader
            title="Override Match"
            onClose={() => setOverrideMatch({ isOpen: false, releaseId: null, title: '', year: '' })}
          />
          <ModalBody>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-text-primary">Title</label>
              <input
                type="text"
                value={overrideMatch.title}
                onChange={(e) => setOverrideMatch(prev => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-text-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-text-primary">Year</label>
              <input
                type="text"
                value={overrideMatch.year}
                onChange={(e) => setOverrideMatch(prev => ({ ...prev, year: e.target.value }))}
                className="w-full rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-text-primary"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setOverrideMatch({ isOpen: false, releaseId: null, title: '', year: '' })}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveOverride}>
                Save Override
              </Button>
            </div>
            </div>
          </ModalBody>
        </Modal>
      )}
    </>
  );
}

// Helper functions
function getResolutionFromQuality(quality: string): number {
  if (quality.includes('2160') || quality.includes('4K')) return 2160;
  if (quality.includes('1080')) return 1080;
  if (quality.includes('720')) return 720;
  if (quality.includes('480')) return 480;
  return 0;
}

function getQualityOrder(quality: string): number {
  const qualityLower = quality.toLowerCase();
  if (qualityLower.includes('2160') || qualityLower.includes('4k')) return 4;
  if (qualityLower.includes('1080')) return 3;
  if (qualityLower.includes('720')) return 2;
  if (qualityLower.includes('480')) return 1;
  return 0;
}
