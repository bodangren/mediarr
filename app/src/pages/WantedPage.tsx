import { useCallback, useEffect, useMemo, useState } from 'react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { SubtitleCoverageCard } from '@/components/wanted/SubtitleCoverageCard';
import { Alert } from '@/components/ui/alert-compat';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiClients } from '@/lib/api/client';
import type { SubtitleProvider } from '@/lib/api/subtitleProvidersApi';
import type { SubtitleCoverageReport, WantedMovieEntry, WantedSeriesEntry } from '@/lib/api/subtitleWantedApi';
import {
  createWantedManageApi,
  WANTED_FETCH_LIMIT,
  type MediaWantedItem,
  type PriorityCoverageReport,
  type PriorityCoverageStatus,
  type WantedPriority,
  type WantedPriorityBucket,
} from '@/lib/api/wantedManageApi';

/**
 * Wanted management console (track feature_spa_management_surfaces_20261111, Phase 4).
 *
 * One screen for the two things the household still has to acquire: missing media and missing
 * subtitles. Every button below calls a route the server really exposes; there is deliberately no
 * "remove"/"mark satisfied" control because the server has no per-wanted-row route for either —
 * wanted rows are derived from `path = null` / `variant_missing_subtitle`, so they disappear when
 * the file (or subtitle) lands.
 *
 * Providers are disabled by owner decision in this install. The subtitle tab says so instead of
 * pretending a re-search can queue anything, and it does not offer a provider-config CTA.
 */

type TopTab = 'media' | 'subtitles';
type MediaTypeFilter = 'all' | 'movie' | 'episode';
type MediaStatusFilter = 'all' | 'missing' | 'announced' | 'incinemas' | 'released';
type MediaSort = 'priority' | 'added';
type SubtitleTypeFilter = 'all' | 'movie' | 'episode';
type SubtitleBucketFilter = 'all' | WantedPriorityBucket;
type MissingLanguageFilter = 'all' | 'chinese' | 'english';
type CoverageFilter = 'all' | PriorityCoverageStatus;

interface Feedback {
  kind: 'success' | 'error';
  text: string;
}

const PAGE_SIZE = 25;

const PRIORITY_BUCKETS: WantedPriorityBucket[] = [
  'continue-watching',
  'recently-watched',
  'recently-added',
  'backfill',
];

const BUCKET_LABELS: Record<WantedPriorityBucket, string> = {
  'continue-watching': 'Continue watching',
  'recently-watched': 'Watched recently',
  'recently-added': 'New',
  backfill: 'Backfill',
};

const BUCKET_ORDER: Record<WantedPriorityBucket, number> = {
  'continue-watching': 0,
  'recently-watched': 1,
  'recently-added': 2,
  backfill: 3,
};

const MEDIA_STATUS_OPTIONS: Array<{ value: Exclude<MediaStatusFilter, 'all'>; label: string }> = [
  { value: 'missing', label: 'Missing' },
  { value: 'announced', label: 'Announced' },
  { value: 'incinemas', label: 'In cinemas' },
  { value: 'released', label: 'Released' },
];

const CHINESE_CODES = new Set(['zho', 'chi', 'zh', 'cmn', 'zh-hans', 'zh-hant']);
const ENGLISH_CODES = new Set(['eng', 'en']);

const SELECT_CLASS =
  'rounded-sm border border-border-subtle bg-surface-0 px-2 py-1.5 text-sm text-text-primary';

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
}

function timeOf(value: string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function normalizeStatus(value: string | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function languageLabel(code: string): string {
  const normalized = code.trim().toLowerCase();
  if (CHINESE_CODES.has(normalized)) return 'Chinese';
  if (ENGLISH_CODES.has(normalized)) return 'English';
  return normalized.toUpperCase();
}

function languageSummary(languages: string[]): string {
  if (languages.length === 0) return 'none';
  const labels = languages.slice(0, 4).map(languageLabel).join(', ');
  return languages.length > 4 ? `${labels} +${languages.length - 4}` : labels;
}

function matchesMissingLanguage(missingLanguages: string[], filter: MissingLanguageFilter): boolean {
  if (filter === 'all') return true;
  const codes = missingLanguages.map(code => code.trim().toLowerCase());
  return filter === 'chinese'
    ? codes.some(code => CHINESE_CODES.has(code))
    : codes.some(code => ENGLISH_CODES.has(code));
}

function mediaLabel(item: MediaWantedItem): string {
  if (item.type === 'movie') {
    return `${item.title}${item.year ? ` (${item.year})` : ''}`;
  }
  return `${item.seriesTitle ?? 'Unknown series'} S${item.seasonNumber}E${item.episodeNumber} — ${item.title}`;
}

function mediaBucket(item: MediaWantedItem): WantedPriorityBucket | null {
  return item.priority?.bucket ?? null;
}

interface SubtitleWantedMovieRow {
  kind: 'movie';
  id: number;
  title: string;
  missingLanguages: string[];
  addedAt?: string | null;
  priority?: WantedPriority;
}

interface SubtitleWantedEpisodeRow {
  kind: 'episode';
  id: number;
  seriesId: number;
  title: string;
  seriesTitle: string;
  missingLanguages: string[];
  addedAt?: string | null;
  priority?: WantedPriority;
}

type SubtitleWantedRow = SubtitleWantedMovieRow | SubtitleWantedEpisodeRow;

function buildSubtitleWantedRows(
  movies: WantedMovieEntry[],
  series: WantedSeriesEntry[],
): SubtitleWantedRow[] {
  const rows: SubtitleWantedRow[] = movies.map(movie => ({
    kind: 'movie',
    id: movie.movieId,
    title: `${movie.movieTitle}${movie.year ? ` (${movie.year})` : ''}`,
    missingLanguages: movie.missingLanguages,
    addedAt: movie.addedAt,
    priority: movie.priority,
  }));

  for (const entry of series) {
    rows.push({
      kind: 'episode',
      id: entry.episodeId,
      seriesId: entry.seriesId,
      title: `S${entry.seasonNumber}E${entry.episodeNumber} — ${entry.episodeTitle}`,
      seriesTitle: entry.seriesTitle,
      missingLanguages: entry.missingLanguages,
      addedAt: entry.addedAt,
      priority: entry.priority,
    });
  }

  return rows.sort((left, right) => {
    const leftBucket = left.priority ? BUCKET_ORDER[left.priority.bucket] : 99;
    const rightBucket = right.priority ? BUCKET_ORDER[right.priority.bucket] : 99;
    if (leftBucket !== rightBucket) return leftBucket - rightBucket;
    const leftRank = left.priority?.rank ?? 999;
    const rightRank = right.priority?.rank ?? 999;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return timeOf(right.addedAt) - timeOf(left.addedAt);
  });
}

function subtitleRowKey(row: SubtitleWantedRow): string {
  return `subtitle-${row.kind}-${row.id}`;
}

function subtitleRowLabel(row: SubtitleWantedRow): string {
  return row.kind === 'movie' ? row.title : `${row.seriesTitle} (series)`;
}

function FeedbackLine({ feedback }: { feedback?: Feedback | null }) {
  if (!feedback) return null;
  return (
    <p
      role={feedback.kind === 'error' ? 'alert' : 'status'}
      className={`mt-1 max-w-[18rem] whitespace-normal text-xs ${
        feedback.kind === 'error' ? 'text-accent-danger' : 'text-accent-success'
      }`}
    >
      {feedback.text}
    </p>
  );
}

function CoverageStatusBadge({ status }: { status: PriorityCoverageStatus }) {
  const tone =
    status === 'dual'
      ? 'border-accent-success text-accent-success'
      : status === 'zho-only'
        ? 'border-accent-warning text-accent-warning'
        : status === 'en-only'
          ? 'border-accent-info text-accent-info'
          : 'border-accent-danger text-accent-danger';
  return (
    <Badge variant="outline" className={tone}>
      {status}
    </Badge>
  );
}

function TypeBadge({ type }: { type: 'movie' | 'episode' }) {
  return <Badge variant="secondary">{type === 'movie' ? 'Movie' : 'Episode'}</Badge>;
}

export function WantedPage() {
  const api = useMemo(() => getApiClients(), []);
  const manage = useMemo(() => createWantedManageApi(api.httpClient), [api]);

  const [tab, setTab] = useState<TopTab>('media');

  // ── Media wanted ────────────────────────────────────────────────────────
  const [mediaItems, setMediaItems] = useState<MediaWantedItem[]>([]);
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaTypeFilter>('all');
  const [mediaStatus, setMediaStatus] = useState<MediaStatusFilter>('all');
  const [mediaSort, setMediaSort] = useState<MediaSort>('priority');
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaFeedback, setMediaFeedback] = useState<Feedback | null>(null);
  const [rowFeedback, setRowFeedback] = useState<Record<string, Feedback | undefined>>({});
  const [pendingRows, setPendingRows] = useState<Record<string, boolean>>({});
  const [isSearchingAll, setIsSearchingAll] = useState(false);
  const [indexerCount, setIndexerCount] = useState<number | null>(null);

  // ── Subtitles wanted ────────────────────────────────────────────────────
  const [subtitlesLoaded, setSubtitlesLoaded] = useState(false);
  const [isSubtitlesLoading, setIsSubtitlesLoading] = useState(false);
  const [subtitlesError, setSubtitlesError] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<SubtitleCoverageReport | null>(null);
  const [priorityCoverage, setPriorityCoverage] = useState<PriorityCoverageReport | null>(null);
  const [wantedMovies, setWantedMovies] = useState<WantedMovieEntry[]>([]);
  const [wantedSeries, setWantedSeries] = useState<WantedSeriesEntry[]>([]);
  const [providers, setProviders] = useState<SubtitleProvider[] | null>(null);
  const [subtitleType, setSubtitleType] = useState<SubtitleTypeFilter>('all');
  const [subtitleBucket, setSubtitleBucket] = useState<SubtitleBucketFilter>('all');
  const [missingLanguage, setMissingLanguage] = useState<MissingLanguageFilter>('all');
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>('all');
  const [subtitlePage, setSubtitlePage] = useState(1);
  const [subtitleBulkFeedback, setSubtitleBulkFeedback] = useState<Feedback | null>(null);
  const [subtitleBulkPending, setSubtitleBulkPending] = useState<'movie' | 'episode' | null>(null);
  const [subtitleRowFeedback, setSubtitleRowFeedback] = useState<Record<string, Feedback | undefined>>({});
  const [subtitlePendingRows, setSubtitlePendingRows] = useState<Record<string, boolean>>({});

  const loadMedia = useCallback(async () => {
    setIsMediaLoading(true);
    try {
      const result = await manage.listMediaWanted();
      setMediaItems(result.items);
      setMediaError(null);
    } catch (error) {
      setMediaError(errorText(error, 'Failed to load wanted media'));
    } finally {
      setIsMediaLoading(false);
    }
  }, [manage]);

  useEffect(() => {
    void loadMedia();
  }, [loadMedia]);

  useEffect(() => {
    let cancelled = false;
    const loadIndexers = async () => {
      try {
        const result = await api.indexerApi.list();
        if (!cancelled) setIndexerCount(result.length);
      } catch {
        if (!cancelled) setIndexerCount(null);
      }
    };
    void loadIndexers();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const loadSubtitles = useCallback(async () => {
    setIsSubtitlesLoading(true);
    setSubtitlesError(null);
    const failures: string[] = [];

    await Promise.all([
      (async () => {
        try {
          setCoverage(await manage.getSubtitleCoverage());
        } catch (error) {
          failures.push(errorText(error, 'Failed to load subtitle coverage'));
        }
      })(),
      (async () => {
        try {
          setPriorityCoverage(await manage.getPriorityCoverage(14));
        } catch (error) {
          failures.push(errorText(error, 'Failed to load viewing coverage'));
        }
      })(),
      (async () => {
        try {
          const result = await manage.listSubtitleWantedMovies({ page: 1, pageSize: WANTED_FETCH_LIMIT });
          setWantedMovies(result.items);
        } catch (error) {
          failures.push(errorText(error, 'Failed to load wanted movie subtitles'));
        }
      })(),
      (async () => {
        try {
          const result = await manage.listSubtitleWantedSeries({ page: 1, pageSize: WANTED_FETCH_LIMIT });
          setWantedSeries(result.items);
        } catch (error) {
          failures.push(errorText(error, 'Failed to load wanted series subtitles'));
        }
      })(),
      (async () => {
        try {
          setProviders(await api.subtitleProvidersApi.listProviders());
        } catch (error) {
          failures.push(errorText(error, 'Failed to load subtitle provider status'));
        }
      })(),
    ]);

    setSubtitlesError(failures.length > 0 ? failures.join(' · ') : null);
    setIsSubtitlesLoading(false);
    setSubtitlesLoaded(true);
  }, [manage, api]);

  useEffect(() => {
    if (tab === 'subtitles' && !subtitlesLoaded) {
      void loadSubtitles();
    }
  }, [tab, subtitlesLoaded, loadSubtitles]);

  const filteredMedia = useMemo(() => {
    let rows = mediaItems;
    if (mediaType !== 'all') {
      rows = rows.filter(item => item.type === mediaType);
    }
    if (mediaStatus !== 'all') {
      rows = rows.filter(
        item => item.type === 'movie' && normalizeStatus(item.status) === mediaStatus,
      );
    }
    if (mediaSort === 'added') {
      rows = [...rows].sort((left, right) => timeOf(right.addedAt) - timeOf(left.addedAt));
    }
    return rows;
  }, [mediaItems, mediaType, mediaStatus, mediaSort]);

  const mediaTotalPages = Math.max(1, Math.ceil(filteredMedia.length / PAGE_SIZE));
  const safeMediaPage = Math.min(mediaPage, mediaTotalPages);
  const pagedMedia = filteredMedia.slice(
    (safeMediaPage - 1) * PAGE_SIZE,
    safeMediaPage * PAGE_SIZE,
  );

  const handleMediaSearch = async (item: MediaWantedItem) => {
    const key = `${item.type}-${item.id}`;
    const label = mediaLabel(item);
    setPendingRows(previous => ({ ...previous, [key]: true }));
    setRowFeedback(previous => ({ ...previous, [key]: undefined }));
    try {
      const result = await manage.searchMediaItem(item.id, item.type);
      const releaseTitle = result.release?.title;
      setRowFeedback(previous => ({
        ...previous,
        [key]: {
          kind: 'success',
          text: releaseTitle
            ? `Grabbed “${releaseTitle}” for “${label}”.`
            : `Search completed for “${label}”.`,
        },
      }));
    } catch (error) {
      setRowFeedback(previous => ({
        ...previous,
        [key]: {
          kind: 'error',
          text: errorText(error, `Search failed for “${label}”`),
        },
      }));
    } finally {
      setPendingRows(previous => ({ ...previous, [key]: false }));
    }
  };

  const handleSearchAllMedia = async () => {
    setIsSearchingAll(true);
    setMediaFeedback(null);
    try {
      const result = await manage.searchAllMedia();
      const idleSuffix =
        indexerCount === 0 ? ' No indexers are configured, so nothing will be grabbed.' : '';
      setMediaFeedback({ kind: 'success', text: `${result.message}${idleSuffix}` });
    } catch (error) {
      setMediaFeedback({
        kind: 'error',
        text: errorText(error, 'Failed to start a search for wanted media'),
      });
    } finally {
      setIsSearchingAll(false);
    }
  };

  const enabledProviders = useMemo(
    () => (providers ?? []).filter(provider => provider.enabled && provider.status === 'active'),
    [providers],
  );
  const providersDisabled = providers !== null && enabledProviders.length === 0;

  const filteredCoverage = useMemo(() => {
    const items = priorityCoverage?.items ?? [];
    return items.filter(item => {
      if (subtitleType !== 'all') {
        const wantedType = subtitleType === 'movie' ? 'MOVIE' : 'EPISODE';
        if (item.mediaType !== wantedType) return false;
      }
      if (coverageFilter !== 'all' && item.status !== coverageFilter) return false;
      return true;
    });
  }, [priorityCoverage, subtitleType, coverageFilter]);

  const subtitleRows = useMemo(() => {
    return buildSubtitleWantedRows(wantedMovies, wantedSeries).filter(row => {
      if (subtitleType !== 'all' && row.kind !== subtitleType) return false;
      if (subtitleBucket !== 'all' && row.priority?.bucket !== subtitleBucket) return false;
      if (!matchesMissingLanguage(row.missingLanguages, missingLanguage)) return false;
      return true;
    });
  }, [wantedMovies, wantedSeries, subtitleType, subtitleBucket, missingLanguage]);

  const subtitleTotalPages = Math.max(1, Math.ceil(subtitleRows.length / PAGE_SIZE));
  const safeSubtitlePage = Math.min(subtitlePage, subtitleTotalPages);
  const pagedSubtitleRows = subtitleRows.slice(
    (safeSubtitlePage - 1) * PAGE_SIZE,
    safeSubtitlePage * PAGE_SIZE,
  );

  const handleSubtitleSearch = async (row: SubtitleWantedRow) => {
    const key = subtitleRowKey(row);
    const label = subtitleRowLabel(row);
    const language = row.missingLanguages[0] ?? 'en';
    const providerNote = providersDisabled
      ? ' No subtitle provider is enabled, so 0 subtitles will be queued.'
      : '';

    setSubtitlePendingRows(previous => ({ ...previous, [key]: true }));
    setSubtitleRowFeedback(previous => ({ ...previous, [key]: undefined }));
    try {
      const result =
        row.kind === 'movie'
          ? await manage.searchSubtitleMovieItem(row.id, language)
          : await manage.searchSubtitleSeriesItem(row.seriesId, language);

      if (!result.triggered) {
        setSubtitleRowFeedback(previous => ({
          ...previous,
          [key]: {
            kind: 'error',
            text: `The server did not trigger a search for “${label}”.`,
          },
        }));
        return;
      }

      setSubtitleRowFeedback(previous => ({
        ...previous,
        [key]: {
          kind: 'success',
          text: `Search requested for “${label}” (${languageLabel(language)}).${providerNote}`,
        },
      }));
    } catch (error) {
      setSubtitleRowFeedback(previous => ({
        ...previous,
        [key]: {
          kind: 'error',
          text: errorText(error, `Subtitle search failed for “${label}”`),
        },
      }));
    } finally {
      setSubtitlePendingRows(previous => ({ ...previous, [key]: false }));
    }
  };

  const handleSubtitleBulkSearch = async (kind: 'movie' | 'episode') => {
    setSubtitleBulkPending(kind);
    setSubtitleBulkFeedback(null);
    const noun = kind === 'movie' ? 'movie' : 'episode';
    try {
      const result =
        kind === 'movie'
          ? await manage.searchAllSubtitleMovies()
          : await manage.searchAllSubtitleSeries();
      const text = providersDisabled
        ? `Server accepted the ${noun} subtitle search, but 0 were queued — no subtitle provider is enabled.`
        : `Queued ${result.count ?? 0} ${noun} subtitle searches.`;
      setSubtitleBulkFeedback({ kind: 'success', text });
    } catch (error) {
      setSubtitleBulkFeedback({
        kind: 'error',
        text: errorText(error, `Failed to start the ${noun} subtitle search`),
      });
    } finally {
      setSubtitleBulkPending(null);
    }
  };

  return (
    <RouteScaffold
      title="Wanted"
      description="Manage missing media and the subtitles still missing, in viewing-priority order"
    >
      <div
        role="tablist"
        aria-label="Wanted sections"
        className="flex flex-wrap gap-1 border-b border-border-subtle pb-1"
      >
        {([
          { key: 'media' as const, label: 'Media wanted' },
          { key: 'subtitles' as const, label: 'Subtitles wanted' },
        ]).map(item => {
          const selected = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              id={`wanted-tab-${item.key}`}
              aria-selected={selected}
              aria-controls={`wanted-panel-${item.key}`}
              onClick={() => setTab(item.key)}
              className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                selected
                  ? 'bg-white text-black'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'media' ? (
        <section
          role="tabpanel"
          id="wanted-panel-media"
          aria-labelledby="wanted-tab-media"
          className="space-y-4"
        >
          {mediaError ? <Alert variant="danger">{mediaError}</Alert> : null}

          {indexerCount === 0 ? (
            <Alert variant="warning">
              <div>
                <p className="font-semibold">Automatic searching is idle</p>
                <p className="text-sm text-text-secondary">
                  No indexers are configured, so the wanted-search cycle skips every run. Add an
                  indexer under Settings &rarr; Indexers and the cycle will start looking for this
                  list automatically.
                </p>
              </div>
            </Alert>
          ) : null}

          <FeedbackLine feedback={mediaFeedback} />

          <section
            aria-label="Wanted media filters"
            className="flex flex-wrap items-end gap-4 rounded-md border border-border-subtle bg-surface-1 p-3"
          >
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-text-muted">
              Type
              <select
                aria-label="Media type"
                value={mediaType}
                onChange={event => {
                  const next = event.target.value as MediaTypeFilter;
                  setMediaType(next);
                  setMediaPage(1);
                  if (next === 'episode') setMediaStatus('all');
                }}
                className={SELECT_CLASS}
              >
                <option value="all">All</option>
                <option value="movie">Movies</option>
                <option value="episode">Episodes</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-text-muted">
              Status
              <select
                aria-label="Media status"
                value={mediaStatus}
                disabled={mediaType === 'episode'}
                onChange={event => {
                  setMediaStatus(event.target.value as MediaStatusFilter);
                  setMediaPage(1);
                }}
                className={`${SELECT_CLASS} disabled:opacity-40`}
              >
                <option value="all">All</option>
                {MEDIA_STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-text-muted">
              Sort
              <select
                aria-label="Media sort"
                value={mediaSort}
                onChange={event => {
                  setMediaSort(event.target.value as MediaSort);
                  setMediaPage(1);
                }}
                className={SELECT_CLASS}
              >
                <option value="priority">Priority</option>
                <option value="added">Recently added</option>
              </select>
            </label>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadMedia()}
                disabled={isMediaLoading}
              >
                {isMediaLoading ? 'Refreshing…' : 'Refresh'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handleSearchAllMedia()}
                disabled={isSearchingAll || mediaItems.length === 0}
              >
                {isSearchingAll ? 'Starting…' : 'Search all'}
              </Button>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-text-secondary">
            <span>
              {filteredMedia.length.toLocaleString()} wanted
              {filteredMedia.length !== mediaItems.length
                ? ` (of ${mediaItems.length.toLocaleString()})`
                : ''}
            </span>
            <span>
              Page {safeMediaPage} of {mediaTotalPages}
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedMedia.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-text-muted">
                    {isMediaLoading ? 'Loading wanted media…' : 'No wanted media matches these filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                pagedMedia.map(item => {
                  const key = `${item.type}-${item.id}`;
                  const bucket = mediaBucket(item);
                  return (
                    <TableRow key={key}>
                      <TableCell>
                        <div className="font-medium text-text-primary">
                          {item.type === 'movie'
                            ? item.title
                            : `S${item.seasonNumber}E${item.episodeNumber} · ${item.title}`}
                        </div>
                        <div className="text-xs text-text-muted">
                          {item.type === 'movie'
                            ? item.year ?? 'year unknown'
                            : item.seriesTitle ?? 'Unknown series'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={item.type} />
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {bucket ? BUCKET_LABELS[bucket] : '—'}
                      </TableCell>
                      <TableCell className="text-text-secondary">{formatDate(item.addedAt)}</TableCell>
                      <TableCell className="text-text-secondary">
                        {item.type === 'movie' ? item.status ?? '—' : '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => void handleMediaSearch(item)}
                          disabled={pendingRows[key]}
                          aria-label={`Search ${mediaLabel(item)}`}
                        >
                          {pendingRows[key] ? 'Searching…' : 'Search'}
                        </Button>
                        <FeedbackLine feedback={rowFeedback[key]} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {mediaTotalPages > 1 ? (
            <div className="flex items-center justify-end gap-3 text-sm">
              <Button
                variant="outline"
                size="xs"
                onClick={() => setMediaPage(page => Math.max(1, page - 1))}
                disabled={safeMediaPage <= 1}
              >
                Previous
              </Button>
              <span className="text-text-secondary">
                Page {safeMediaPage} of {mediaTotalPages}
              </span>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setMediaPage(page => Math.min(mediaTotalPages, page + 1))}
                disabled={safeMediaPage >= mediaTotalPages}
              >
                Next
              </Button>
            </div>
          ) : null}

          <p className="text-xs text-text-muted">
            Items drop off this list automatically when a file is imported; the server has no
            separate remove or mark-satisfied action.
          </p>
        </section>
      ) : null}

      {tab === 'subtitles' ? (
        <section
          role="tabpanel"
          id="wanted-panel-subtitles"
          aria-labelledby="wanted-tab-subtitles"
          className="space-y-6"
        >
          {subtitlesError ? <Alert variant="danger">{subtitlesError}</Alert> : null}

          {providersDisabled ? (
            <Alert variant="warning">
              <div>
                <p className="font-semibold">No subtitle provider is enabled</p>
                <p className="text-sm text-text-secondary">
                  Re-search requests reach the server, but nothing is queued while every subtitle
                  provider is disabled. This is expected in the current setup.
                </p>
              </div>
            </Alert>
          ) : null}

          <section
            aria-label="Subtitle filters"
            className="flex flex-wrap items-end gap-4 rounded-md border border-border-subtle bg-surface-1 p-3"
          >
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-text-muted">
              Type
              <select
                aria-label="Subtitle type"
                value={subtitleType}
                onChange={event => {
                  setSubtitleType(event.target.value as SubtitleTypeFilter);
                  setSubtitlePage(1);
                }}
                className={SELECT_CLASS}
              >
                <option value="all">All</option>
                <option value="movie">Movies</option>
                <option value="episode">Series</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-text-muted">
              Priority
              <select
                aria-label="Subtitle priority bucket"
                value={subtitleBucket}
                onChange={event => {
                  setSubtitleBucket(event.target.value as SubtitleBucketFilter);
                  setSubtitlePage(1);
                }}
                className={SELECT_CLASS}
              >
                <option value="all">All buckets</option>
                {PRIORITY_BUCKETS.map(bucket => (
                  <option key={bucket} value={bucket}>
                    {BUCKET_LABELS[bucket]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-text-muted">
              Missing language
              <select
                aria-label="Missing language"
                value={missingLanguage}
                onChange={event => {
                  setMissingLanguage(event.target.value as MissingLanguageFilter);
                  setSubtitlePage(1);
                }}
                className={SELECT_CLASS}
              >
                <option value="all">Any</option>
                <option value="chinese">Chinese</option>
                <option value="english">English</option>
              </select>
            </label>

            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadSubtitles()}
                disabled={isSubtitlesLoading}
              >
                {isSubtitlesLoading ? 'Refreshing…' : 'Refresh'}
              </Button>
            </div>
          </section>

          <SubtitleCoverageCard report={coverage} isLoading={isSubtitlesLoading && coverage === null} />

          <section aria-label="Watching coverage" className="space-y-2">
            <header className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                  What you&rsquo;ve been watching
                </h2>
                <p className="text-xs text-text-muted">
                  Last {priorityCoverage?.days ?? 14} days, ordered by viewing priority.
                </p>
              </div>
              <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-text-muted">
                Coverage
                <select
                  aria-label="Coverage status"
                  value={coverageFilter}
                  onChange={event => setCoverageFilter(event.target.value as CoverageFilter)}
                  className={SELECT_CLASS}
                >
                  <option value="all">All statuses</option>
                  <option value="dual">dual</option>
                  <option value="zho-only">zho-only</option>
                  <option value="en-only">en-only</option>
                  <option value="none">none</option>
                </select>
              </label>
            </header>

            {priorityCoverage ? (
              <div className="flex flex-wrap gap-2" aria-label="Coverage counts">
                <Badge variant="outline" className="border-accent-success text-accent-success">
                  dual {priorityCoverage.counts.dual}
                </Badge>
                <Badge variant="outline" className="border-accent-warning text-accent-warning">
                  zho-only {priorityCoverage.counts['zho-only']}
                </Badge>
                <Badge variant="outline" className="border-accent-info text-accent-info">
                  en-only {priorityCoverage.counts['en-only']}
                </Badge>
                <Badge variant="outline" className="border-accent-danger text-accent-danger">
                  none {priorityCoverage.counts.none}
                </Badge>
              </div>
            ) : null}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Languages</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCoverage.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-sm text-text-muted">
                      {isSubtitlesLoading
                        ? 'Loading watching coverage…'
                        : 'No recent viewing matches these filters.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCoverage.map(item => (
                    <TableRow key={`${item.mediaType}-${item.mediaId}`}>
                      <TableCell className="text-text-primary">
                        {item.title ?? `${item.mediaType === 'MOVIE' ? 'Movie' : 'Episode'} #${item.mediaId}`}
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={item.mediaType === 'MOVIE' ? 'movie' : 'episode'} />
                      </TableCell>
                      <TableCell>
                        <CoverageStatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {languageSummary(item.languages)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </section>

          <section aria-label="Missing subtitles" className="space-y-2">
            <header className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                  Missing subtitles ({subtitleRows.length.toLocaleString()})
                </h2>
                <p className="text-xs text-text-muted">
                  Re-search a single row, or run the same automation cycle for every movie or
                  episode.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleSubtitleBulkSearch('movie')}
                  disabled={subtitleBulkPending !== null || wantedMovies.length === 0}
                >
                  {subtitleBulkPending === 'movie' ? 'Starting…' : 'Re-search movies'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleSubtitleBulkSearch('episode')}
                  disabled={subtitleBulkPending !== null || wantedSeries.length === 0}
                >
                  {subtitleBulkPending === 'episode' ? 'Starting…' : 'Re-search episodes'}
                </Button>
              </div>
            </header>

            <FeedbackLine feedback={subtitleBulkFeedback} />

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Missing languages</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedSubtitleRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-text-muted">
                      {isSubtitlesLoading
                        ? 'Loading wanted subtitles…'
                        : 'No missing subtitles match these filters.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedSubtitleRows.map(row => {
                    const key = subtitleRowKey(row);
                    return (
                      <TableRow key={key}>
                        <TableCell>
                          <div className="font-medium text-text-primary">
                            {row.kind === 'movie' ? row.title : row.seriesTitle}
                          </div>
                          {row.kind === 'episode' ? (
                            <div className="text-xs text-text-muted">{row.title}</div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <TypeBadge type={row.kind} />
                        </TableCell>
                        <TableCell className="text-text-secondary">
                          {row.missingLanguages.map(languageLabel).join(', ') || '—'}
                        </TableCell>
                        <TableCell className="text-text-secondary">
                          {row.priority ? BUCKET_LABELS[row.priority.bucket] : '—'}
                        </TableCell>
                        <TableCell className="text-text-secondary">{formatDate(row.addedAt)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => void handleSubtitleSearch(row)}
                            disabled={subtitlePendingRows[key]}
                            aria-label={
                              row.kind === 'movie'
                                ? `Re-search ${row.title}`
                                : `Re-search series ${row.seriesTitle}`
                            }
                          >
                            {subtitlePendingRows[key]
                              ? 'Searching…'
                              : row.kind === 'movie'
                                ? 'Re-search'
                                : 'Re-search series'}
                          </Button>
                          <FeedbackLine feedback={subtitleRowFeedback[key]} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {subtitleTotalPages > 1 ? (
              <div className="flex items-center justify-end gap-3 text-sm">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setSubtitlePage(page => Math.max(1, page - 1))}
                  disabled={safeSubtitlePage <= 1}
                >
                  Previous
                </Button>
                <span className="text-text-secondary">
                  Page {safeSubtitlePage} of {subtitleTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setSubtitlePage(page => Math.min(subtitleTotalPages, page + 1))}
                  disabled={safeSubtitlePage >= subtitleTotalPages}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </section>
        </section>
      ) : null}
    </RouteScaffold>
  );
}
