'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Download, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Modal, ModalBody, ModalHeader } from '@/components/primitives/Modal';
import { EmptyPanel } from '@/components/primitives/EmptyPanel';
import { SkeletonBlock } from '@/components/primitives/SkeletonBlock';
import { getApiClients } from '@/lib/api/client';
import { useToast } from '@/components/providers/ToastProvider';
import { QualityBadge } from '@/components/search/QualityBadge';
import { ReleaseTitle } from '@/components/search/ReleaseTitle';
import { PeersCell } from '@/components/search/PeersCell';
import { AgeCell } from '@/components/search/AgeCell';

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
  title: string;
  indexer: string;
  quality: QualityInfo;
  size: number;
  seeders?: number;
  leechers?: number;
  publishDate: string;
  ageHours: number;
  approved: boolean;
  rejections?: string[];
  customFormatScore?: number;
}

interface GrabState {
  releaseId: string | null;
  isGrabbing: boolean;
  error: string | null;
  success: boolean;
}

export interface MovieInteractiveSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieId: number;
  movieTitle: string;
  movieYear?: number;
}

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

export function MovieInteractiveSearchModal({
  isOpen,
  onClose,
  movieId,
  movieTitle,
  movieYear,
}: MovieInteractiveSearchModalProps) {
  const [releases, setReleases] = useState<ReleaseResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [grabState, setGrabState] = useState<GrabState>({
    releaseId: null,
    isGrabbing: false,
    error: null,
    success: false,
  });

  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();

  const searchReleases = useCallback(async () => {
    setIsLoading(true);
    setSearchError(null);
    setGrabState({ releaseId: null, isGrabbing: false, error: null, success: false });

    try {
      const results = await api.releaseApi.searchCandidates({ movieId, title: movieTitle });

      // Transform API response to component's expected format
      const releases: ReleaseResult[] = results.map((candidate, index) => ({
        id: candidate.title + index, // Generate unique ID from title + index
        guid: candidate.title + '-guid',
        title: candidate.title,
        indexer: candidate.indexer,
        quality: {
          quality: {
            name: candidate.quality || 'Unknown',
            resolution: 0, // API doesn't provide resolution directly
          },
          revision: { version: 1, real: 0 },
        },
        size: candidate.size,
        seeders: candidate.seeders,
        leechers: 0, // API doesn't provide leechers
        publishDate: new Date(Date.now() - (candidate.age || 0) * 60 * 60 * 1000).toISOString(),
        ageHours: candidate.age || 0,
        approved: !candidate.indexerFlags || candidate.indexerFlags.length === 0,
        rejections: candidate.indexerFlags ? [candidate.indexerFlags] : [],
        customFormatScore: 0, // API doesn't provide custom format score
      }));

      setReleases(releases);
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
  }, [movieId, movieTitle, api.releaseApi, pushToast]);

  // Search automatically when modal opens
  useEffect(() => {
    if (isOpen) {
      void searchReleases();
    }
  }, [isOpen, searchReleases]);

  const handleGrab = useCallback(async (release: ReleaseResult) => {
    setGrabState({ releaseId: release.id, isGrabbing: true, error: null, success: false });

    try {
      // Transform release to the format expected by the API
      const releaseCandidate = {
        title: release.title,
        indexer: release.indexer,
        size: release.size,
        seeders: release.seeders || 0,
        quality: release.quality.quality.name,
        age: release.ageHours,
      };

      await api.releaseApi.grabRelease(releaseCandidate);

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

  const handleClose = useCallback(() => {
    setReleases([]);
    setSearchError(null);
    setGrabState({ releaseId: null, isGrabbing: false, error: null, success: false });
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

        {!isLoading && releases.length === 0 && !searchError && (
          <EmptyPanel
            title="No releases found"
            body="Try searching again or check your indexer configuration."
          />
        )}

        {!isLoading && releases.length > 0 && (
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
                {releases.map(release => {
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
                          <Button
                            variant={isApproved ? 'primary' : 'secondary'}
                            onClick={() => void handleGrab(release)}
                            disabled={isGrabbing || !isApproved}
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
          <p className="mt-3 text-xs text-text-secondary">
            {releases.length} release{releases.length !== 1 ? 's' : ''} found
          </p>
        )}
      </ModalBody>
    </Modal>
  );
}
