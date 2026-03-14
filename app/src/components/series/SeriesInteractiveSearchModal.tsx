
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Download, AlertCircle, CheckCircle, Loader2, Filter, ArrowUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal, ModalBody, ModalHeader } from '@/components/ui/modal';
import { EmptyPanel } from '@/components/ui/empty-panel';
import { SkeletonBlock } from '@/components/ui/skeleton-compat';
import { FilterMenu } from '@/components/ui/filter-menu-compat';
import { getApiClients } from '@/lib/api/client';
import { useToast } from '@/components/providers/ToastProvider';
import { QualityBadge } from '@/components/search/QualityBadge';
import { ReleaseTitle } from '@/components/search/ReleaseTitle';
import { PeersCell } from '@/components/search/PeersCell';
import { AgeCell } from '@/components/search/AgeCell';
import type { ReleaseCandidate } from '@/lib/api/releaseApi';

export type SearchLevel = 'series' | 'season' | 'episode';
const SEARCH_PAGE_SIZE = 100;

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

interface ReleaseResult {
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
  magnetUrl?: string;
  downloadUrl?: string;
  infoHash?: string;
}

interface GrabState {
  releaseId: string | null;
  isGrabbing: boolean;
  error: string | null;
  success: boolean;
}

export interface SeriesInteractiveSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  seriesId: number;
  seriesTitle: string;
  initialLevel?: SearchLevel;
  initialSeason?: number;
  initialEpisode?: number;
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
  if (score === undefined || score === null || score === 0) return null;
  const prefix = score > 0 ? '+' : '';
  return `${prefix}${score}`;
}

function getResolutionFromQuality(quality: string): number {
  if (quality.includes('2160') || quality.includes('4K')) return 2160;
  if (quality.includes('1080')) return 1080;
  if (quality.includes('720')) return 720;
  if (quality.includes('480')) return 480;
  return 0;
}

function getQualityOrder(quality: string): number {
  const q = quality.toLowerCase();
  if (q.includes('2160') || q.includes('4k')) return 4;
  if (q.includes('1080')) return 3;
  if (q.includes('720')) return 2;
  if (q.includes('480')) return 1;
  return 0;
}

function inferQualityFromTitle(title: string): string | undefined {
  const lowered = title.toLowerCase();
  const resolution = lowered.match(/(?:^|[\s._-])(480|720|1080|2160)p(?:$|[\s._-])/i)?.[1];
  let source: string | undefined;
  if (lowered.includes('webrip')) source = 'WEBRip';
  else if (lowered.includes('webdl') || lowered.includes('web-dl')) source = 'WEB-DL';
  else if (lowered.includes('bluray') || lowered.includes('blu-ray') || lowered.includes('bdrip')) source = 'BluRay';
  else if (lowered.includes('hdtv')) source = 'HDTV';
  else if (lowered.includes('dvd')) source = 'DVD';

  if (resolution && source) return `${resolution}p ${source}`;
  if (resolution) return `${resolution}p`;
  return source;
}

function resolveAgeHours(candidate: ReleaseCandidate): number {
  if (typeof candidate.age === 'number' && Number.isFinite(candidate.age)) {
    return Math.max(0, candidate.age);
  }

  if (candidate.publishDate) {
    const publishedAt = new Date(candidate.publishDate).getTime();
    if (Number.isFinite(publishedAt)) {
      return Math.max(0, (Date.now() - publishedAt) / (1000 * 60 * 60));
    }
  }

  return 0;
}

const qualityOptions = [
  { key: 'all', label: 'All Qualities' },
  { key: '2160p', label: '2160p (4K)' },
  { key: '1080p', label: '1080p' },
  { key: '720p', label: '720p' },
  { key: '480p', label: '480p' },
  { key: 'sd', label: 'SD' },
];

const sortOptions = [
  { key: 'seeders', label: 'Seeders' },
  { key: 'size', label: 'Size' },
  { key: 'age', label: 'Age' },
  { key: 'quality', label: 'Quality' },
];

const levelOptions = [
  { value: 'series', label: 'Series' },
  { value: 'season', label: 'Season' },
  { value: 'episode', label: 'Episode' },
];

export function SeriesInteractiveSearchModal({
  isOpen,
  onClose,
  seriesId,
  seriesTitle,
  initialLevel = 'series',
  initialSeason,
  initialEpisode,
}: SeriesInteractiveSearchModalProps) {
  const [level, setLevel] = useState<SearchLevel>(initialLevel);
  const [season, setSeason] = useState<number>(initialSeason ?? 1);
  const [episode, setEpisode] = useState<number>(initialEpisode ?? 1);
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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('seeders');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [availableIndexers, setAvailableIndexers] = useState<{ key: string; label: string }[]>([
    { key: 'all', label: 'All Indexers' },
  ]);

  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();
  const searchReleasesRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const searchReleases = useCallback(async () => {
    setIsLoading(true);
    setSearchError(null);
    setGrabState({ releaseId: null, isGrabbing: false, error: null, success: false });

    try {
      const input: {
        seasonNumber?: number;
        episodeNumber?: number;
        page?: number;
        pageSize?: number;
      } = {};

      if (level === 'season' || level === 'episode') {
        input.seasonNumber = season;
      }
      if (level === 'episode') {
        input.episodeNumber = episode;
      }

      let page = 1;
      let totalPages = 1;
      const allCandidates: ReleaseCandidate[] = [];

      do {
        const result = await api.seriesApi.searchReleases(seriesId, {
          ...input,
          page,
          pageSize: SEARCH_PAGE_SIZE,
        });
        allCandidates.push(...(result.items || []));
        totalPages = result.meta?.totalPages ?? 1;
        page += 1;
      } while (page <= totalPages);

      const releasesData: ReleaseResult[] = allCandidates.map(
        (candidate: ReleaseCandidate, index: number) => {
          const qualityName = candidate.quality || inferQualityFromTitle(candidate.title) || 'Unknown';
          const ageHours = resolveAgeHours(candidate);
          const publishDate = candidate.publishDate
            || new Date(Date.now() - ageHours * 60 * 60 * 1000).toISOString();

          return {
            id: candidate.guid || `${candidate.indexer}-${index}`,
            guid: candidate.guid || `${candidate.indexer}-${index}`,
            indexer: candidate.indexer,
            indexerId: candidate.indexerId,
            title: candidate.title,
            quality: {
              quality: {
                name: qualityName,
                resolution: getResolutionFromQuality(qualityName),
              },
              revision: { version: 1, real: 0 },
            },
            size: candidate.size,
            seeders: candidate.seeders,
            leechers: candidate.leechers || 0,
            publishDate,
            ageHours,
            approved: !candidate.indexerFlags || candidate.indexerFlags.length === 0,
            rejections: candidate.indexerFlags ? [candidate.indexerFlags] : [],
            customFormatScore: candidate.customFormatScore ?? 0,
            protocol: candidate.protocol,
            magnetUrl: candidate.magnetUrl,
            downloadUrl: candidate.downloadUrl,
            infoHash: candidate.infoHash,
          };
        },
      );

      setReleases(releasesData);

      const uniqueIndexers = Array.from(new Set(releasesData.map(r => r.indexer)))
        .sort()
        .map(indexer => ({ key: indexer, label: indexer }));
      setAvailableIndexers([{ key: 'all', label: 'All Indexers' }, ...uniqueIndexers]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search for releases';
      setSearchError(errorMessage);
      pushToast({ title: 'Search failed', message: errorMessage, variant: 'error' });
      setReleases([]);
    } finally {
      setIsLoading(false);
    }
  }, [seriesId, level, season, episode, api.seriesApi, pushToast]);

  // Filter and sort
  useEffect(() => {
    let filtered = [...releases];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(r => r.title.toLowerCase().includes(query));
    }

    if (qualityFilter !== 'all') {
      filtered = filtered.filter(r => r.quality.quality.name.toLowerCase().includes(qualityFilter));
    }
    if (indexerFilter !== 'all') {
      filtered = filtered.filter(r => r.indexer === indexerFilter);
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'seeders': comparison = (a.seeders || 0) - (b.seeders || 0); break;
        case 'size': comparison = a.size - b.size; break;
        case 'age': comparison = a.ageHours - b.ageHours; break;
        case 'quality':
          comparison = getQualityOrder(a.quality.quality.name) - getQualityOrder(b.quality.quality.name);
          break;
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    setFilteredReleases(filtered);
  }, [releases, searchQuery, qualityFilter, indexerFilter, sortField, sortDirection]);

  // Keep ref current so the open-effect always uses the latest searchReleases
  useEffect(() => {
    searchReleasesRef.current = searchReleases;
  }, [searchReleases]);

  // Auto-search only when the modal transitions to open
  useEffect(() => {
    if (isOpen) {
      void searchReleasesRef.current();
    }
  }, [isOpen]);

  const handleGrab = useCallback(async (release: ReleaseResult) => {
    setGrabState({ releaseId: release.id, isGrabbing: true, error: null, success: false });

    try {
      if (release.magnetUrl || release.downloadUrl) {
        await api.releaseApi.grabCandidate({
          indexer: release.indexer,
          indexerId: release.indexerId,
          title: release.title,
          guid: release.guid,
          size: release.size,
          seeders: release.seeders ?? 0,
          leechers: release.leechers,
          quality: release.quality.quality.name,
          age: Math.round(release.ageHours),
          publishDate: release.publishDate,
          protocol: release.protocol,
          magnetUrl: release.magnetUrl,
          downloadUrl: release.downloadUrl,
          infoHash: release.infoHash,
        });
      } else {
        await api.releaseApi.grabRelease(release.guid, release.indexerId);
      }
      setGrabState({ releaseId: release.id, isGrabbing: false, error: null, success: true });
      pushToast({
        title: 'Release grabbed successfully',
        message: `${release.title} has been added to your download queue.`,
        variant: 'success',
      });
      setTimeout(() => {
        setGrabState(prev => ({ ...prev, success: false }));
      }, 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to grab release';
      setGrabState({ releaseId: release.id, isGrabbing: false, error: errorMessage, success: false });
      pushToast({ title: 'Failed to grab release', message: errorMessage, variant: 'error' });
    }
  }, [api.releaseApi, pushToast]);

  const handleClose = useCallback(() => {
    setReleases([]);
    setFilteredReleases([]);
    setSearchError(null);
    setGrabState({ releaseId: null, isGrabbing: false, error: null, success: false });
    setQualityFilter('all');
    setIndexerFilter('all');
    setSearchQuery('');
    onClose();
  }, [onClose]);

  const levelLabel = level === 'series'
    ? seriesTitle
    : level === 'season'
      ? `${seriesTitle} — Season ${season}`
      : `${seriesTitle} — S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;

  const headerTitle = <span>Interactive Search - {levelLabel}</span>;

  const headerActions = (
    <Button
      variant="default"
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
      ariaLabel={`Interactive search for ${seriesTitle}`}
      onClose={handleClose}
      maxWidthClassName="max-w-4xl lg:max-w-6xl"
    >
      <ModalHeader title={headerTitle} onClose={handleClose} actions={headerActions} />
      <ModalBody>
        {/* Level / Season / Episode selectors */}
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="series-search-level" className="mb-1 block text-xs font-medium text-text-secondary">
              Search Level
            </label>
            <select
              id="series-search-level"
              aria-label="Search level"
              value={level}
              onChange={(e) => setLevel(e.target.value as SearchLevel)}
              className="rounded-md border border-border-subtle bg-surface-1 px-3 py-1.5 text-sm text-text-primary"
            >
              {levelOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {(level === 'season' || level === 'episode') && (
            <div>
              <label htmlFor="series-search-season" className="mb-1 block text-xs font-medium text-text-secondary">
                Season Number
              </label>
              <input
                id="series-search-season"
                aria-label="Season number"
                type="number"
                min={1}
                value={season}
                onChange={(e) => setSeason(Number(e.target.value))}
                className="w-20 rounded-md border border-border-subtle bg-surface-1 px-3 py-1.5 text-sm text-text-primary"
              />
            </div>
          )}

          {level === 'episode' && (
            <div>
              <label htmlFor="series-search-episode" className="mb-1 block text-xs font-medium text-text-secondary">
                Episode Number
              </label>
              <input
                id="series-search-episode"
                aria-label="Episode number"
                type="number"
                min={1}
                value={episode}
                onChange={(e) => setEpisode(Number(e.target.value))}
                className="w-20 rounded-md border border-border-subtle bg-surface-1 px-3 py-1.5 text-sm text-text-primary"
              />
            </div>
          )}
        </div>

        {searchError && (
          <div className="mb-4 rounded-md border border-status-error/50 bg-status-error/10 p-3">
            <div className="flex items-center gap-2 text-status-error">
              <AlertCircle size={16} />
              <span className="text-sm">{searchError}</span>
            </div>
          </div>
        )}

        {/* Filter and sort controls */}
        {!isLoading && releases.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-4 rounded-md border border-border-subtle bg-surface-2 p-3">
            <div className="flex items-center gap-2">
              <Search size={16} className="text-text-secondary" />
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search releases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 rounded-md border border-border-subtle bg-surface-1 px-3 py-1.5 pr-8 text-sm text-text-primary placeholder:text-text-tertiary"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
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
                    <tr key={release.id} className={!isApproved ? 'bg-status-error/5' : ''}>
                      <td className="px-3 py-2 text-text-primary">
                        <span className="text-xs">{release.indexer}</span>
                      </td>
                      <td className="px-3 py-2 text-text-primary max-w-xs">
                        <ReleaseTitle title={release.title} />
                        {!isApproved && release.rejections && release.rejections.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {release.rejections.map((rejection, idx) => (
                              <p key={idx} className="text-xs text-status-error">{rejection}</p>
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
                        {formatScore(release.customFormatScore) ? (
                          <span className={`text-xs font-medium ${
                            (release.customFormatScore ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatScore(release.customFormatScore)}
                          </span>
                        ) : (
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
                            variant={isApproved ? 'default' : 'secondary'}
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
  );
}
