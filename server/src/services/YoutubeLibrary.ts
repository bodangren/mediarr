/**
 * YouTube library domain helpers (track feature_youtube_library_20261107, Phase 1).
 *
 * Pure logic only: parsing feed entries and deciding what is genuinely new. Downloading and DB writes
 * live in the services that consume these functions, so the idempotency rule ("a video id is
 * downloaded once, ever") is testable without a network or a database.
 */

export type YoutubeSubscriptionKind = 'CHANNEL' | 'PLAYLIST';

export interface YoutubeSubscriptionInput {
  url: string;
  kind?: YoutubeSubscriptionKind;
  title?: string;
  enabled?: boolean;
  options?: Record<string, unknown>;
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Accepts a bare video id, youtu.be/<id>, /watch?v=<id>, /shorts/<id>, /embed/<id>. */
export function normalizeYoutubeVideoId(input: string | null | undefined): string | null {
  const raw = (input ?? '').trim();
  if (raw.length === 0) return null;
  if (VIDEO_ID.test(raw)) return raw;
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /\/shorts\/([A-Za-z0-9_-]{11})/,
    /\/embed\/([A-Za-z0-9_-]{11})/,
    /\/live\/([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match) return match[1] ?? null;
  }
  return null;
}

/** True for a channel handle/id or playlist URL; the poller needs one or the other, not a video. */
export function parseSubscriptionUrl(url: string): { kind: YoutubeSubscriptionKind; externalId: string } | null {
  const raw = url.trim();
  if (raw.length === 0) return null;
  const playlist = raw.match(/[?&]list=([A-Za-z0-9_-]+)/) ?? raw.match(/\/playlist\/([A-Za-z0-9_-]+)/);
  if (playlist) return { kind: 'PLAYLIST', externalId: playlist[1]! };
  const channel = raw.match(/\/channel\/(UC[A-Za-z0-9_-]{22})/);
  if (channel) return { kind: 'CHANNEL', externalId: channel[1]! };
  const handle = raw.match(/youtube\.com\/@([A-Za-z0-9._-]{3,})/);
  if (handle) return { kind: 'CHANNEL', externalId: `@${handle[1]!}` };
  return null;
}

export interface FeedEntry {
  videoId: string;
  title: string;
  channel?: string | null;
  durationSeconds?: number | null;
  publishedAt?: Date | null;
  /** True for shorts; skipped in v1 (decision Y5). */
  isShort?: boolean;
  isLive?: boolean;
}

export interface FeedDecision {
  accepted: FeedEntry[];
  skipped: Array<{ videoId: string; reason: 'duplicate' | 'short' | 'live' | 'invalid-id' | 'cap' }>;
}

/** Decide which feed entries warrant a download. Idempotent by video id; shorts/live skipped (Y5). */
export function selectNewEntries(
  entries: readonly FeedEntry[],
  existingVideoIds: ReadonlySet<string>,
  options: { perPollCap?: number; includeShorts?: boolean; includeLive?: boolean } = {},
): FeedDecision {
  const cap = options.perPollCap ?? 25;
  const accepted: FeedEntry[] = [];
  const skipped: FeedDecision['skipped'] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const videoId = normalizeYoutubeVideoId(entry.videoId);
    if (videoId === null) {
      skipped.push({ videoId: entry.videoId, reason: 'invalid-id' });
      continue;
    }
    if (existingVideoIds.has(videoId) || seen.has(videoId)) {
      skipped.push({ videoId, reason: 'duplicate' });
      continue;
    }
    if (entry.isShort && options.includeShorts !== true) {
      skipped.push({ videoId, reason: 'short' });
      continue;
    }
    if (entry.isLive && options.includeLive !== true) {
      skipped.push({ videoId, reason: 'live' });
      continue;
    }
    if (accepted.length >= cap) {
      // Not an error and not a duplicate: the remainder is picked up on the next poll.
      skipped.push({ videoId, reason: 'cap' });
      continue;
    }
    seen.add(videoId);
    accepted.push({ ...entry, videoId });
  }

  return { accepted, skipped };
}

export interface YoutubeProgressInput {
  positionSeconds: number;
  durationSeconds?: number | null;
  /** Fraction of the video that counts as watched; 0.95 because credits are never played. */
  watchedThreshold?: number;
}

export interface YoutubeProgressUpdate {
  position: number;
  isWatched: boolean;
}

/**
 * Watched-state rule for YouTube (track feature_youtube_library_20261107, Phase 3).
 *
 * Watched is monotonic: replaying from the start never un-watches a video. Position is clamped to a
 * sensible range so a bad client report cannot store garbage that breaks retention later.
 */
export function applyYoutubeProgress(
  current: { position: number; isWatched: boolean },
  input: YoutubeProgressInput,
): YoutubeProgressUpdate {
  const threshold = input.watchedThreshold ?? 0.95;
  const duration = typeof input.durationSeconds === 'number' && input.durationSeconds > 0
    ? input.durationSeconds
    : null;
  const position = Math.max(0, Math.min(Math.trunc(input.positionSeconds), duration ?? Number.MAX_SAFE_INTEGER));
  const reachedEnd = duration !== null && position >= Math.floor(duration * threshold);
  return { position, isWatched: current.isWatched || reachedEnd };
}

export interface RetentionCandidate {
  isWatched: boolean;
  watchedAt: Date | null;
  source: 'SUBSCRIPTION' | 'IMPORT' | string;
}

/**
 * Retention eligibility for YouTube (track feature_youtube_library_20261107, Phase 3).
 *
 * Retire only a watched subscription video whose watchedAt is older than the retention window
 * (default 7 days, decision Y2). Imported archive files are never eligible (gate G9): they are
 * unmanaged history, not downloaded episodes.
 */
export function retentionEligible(
  video: RetentionCandidate,
  now: Date,
  retentionDays = 7,
): boolean {
  if (video.source !== 'SUBSCRIPTION') return false;
  if (!video.isWatched || video.watchedAt === null) return false;
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  return video.watchedAt.getTime() <= cutoff.getTime();
}

export interface VideoPersistence {
  findByVideoId(videoId: string): Promise<{ id: number } | null>;
  insert(entry: FeedEntry & { subscriptionId: number }): Promise<{ id: number }>;
}

export interface DownloadOutcome {
  queued: number;
  duplicates: number;
  failures: Array<{ videoId: string; error: string }>;
}

/**
 * Queue feed entries for download. A row is inserted only when the video id is unknown, so two
 * overlapping polls (or a retry) cannot download the same video twice.
 */
export async function queueNewVideos(
  entries: readonly FeedEntry[],
  subscriptionId: number,
  store: VideoPersistence,
): Promise<DownloadOutcome> {
  let queued = 0;
  let duplicates = 0;
  const failures: DownloadOutcome['failures'] = [];

  for (const entry of entries) {
    try {
      const existing = await store.findByVideoId(entry.videoId);
      if (existing) {
        duplicates += 1;
        continue;
      }
      await store.insert({ ...entry, subscriptionId });
      queued += 1;
    } catch (error) {
      failures.push({ videoId: entry.videoId, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { queued, duplicates, failures };
}
