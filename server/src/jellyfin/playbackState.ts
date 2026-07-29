import type { PlaybackProgressInput } from '../services/PlaybackService';
import type { ContinueWatchingItem } from '../repositories/PlaybackRepository';
import { decodeJellyfinId, encodeJellyfinId, type JellyfinItemId } from './ids';

export const JELLYFIN_TICKS_PER_SECOND = 10_000_000;
export const JELLYFIN_SHARED_USER_ID = 'lan-default';

export interface JellyfinProgressPayload {
  ItemId?: unknown;
  PositionTicks?: unknown;
  RunTimeTicks?: unknown;
}

export interface JellyfinMarkWatchedIntent {
  mediaType: 'MOVIE' | 'EPISODE';
  mediaId: number;
  userId: string;
}

export interface JellyfinResumeItem {
  Id: string;
  Type: 'Movie' | 'Episode';
  Name: string;
  SeriesName?: string;
  SeriesId?: string;
  RunTimeTicks: number;
  UserData: {
    Played: boolean;
    PlaybackPositionTicks: number;
    ItemId: string;
  };
}

export interface JellyfinResumeResponse {
  Items: JellyfinResumeItem[];
  TotalRecordCount: number;
  StartIndex: number;
}

export interface OrderedJellyfinEpisode {
  id: number;
  seriesId: number;
}

export interface NextUpDependencies {
  /** Must return episodes in season/episode order. */
  getOrderedEpisodes: (seriesId?: number) => Promise<readonly OrderedJellyfinEpisode[]>;
  getProgress: (episodeId: number, userId: string) => Promise<{ isWatched: boolean } | null>;
}

export interface NextUpOptions {
  seriesId?: number;
  limit?: number;
  userId?: string;
}

type ItemDecoder = (value: string) => JellyfinItemId | null;
type ItemEncoder = (kind: 'movie' | 'episode' | 'series', id: number) => string;

function normalizeUserId(userId: string | undefined): string {
  const normalized = userId?.trim();
  return normalized && normalized.length > 0 ? normalized : JELLYFIN_SHARED_USER_ID;
}

function playableTarget(item: JellyfinItemId | null): { mediaType: 'MOVIE' | 'EPISODE'; mediaId: number } | null {
  if (!item) return null;
  if (item.kind === 'movie') return { mediaType: 'MOVIE', mediaId: item.id };
  if (item.kind === 'episode') return { mediaType: 'EPISODE', mediaId: item.id };
  return null;
}

function tickValue(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.min(Math.trunc(value), Number.MAX_SAFE_INTEGER);
}

/** Converts Jellyfin's 100 ns ticks to the second-based shared playback store. */
export function jellyfinTicksToSeconds(value: unknown): number {
  return Math.floor(tickValue(value) / JELLYFIN_TICKS_PER_SECOND);
}

/** Converts the shared integer-second playback store to Jellyfin 100 ns ticks. */
export function playbackSecondsToJellyfinTicks(value: unknown): number {
  const seconds = tickValue(value);
  return Math.min(
    seconds,
    Math.floor(Number.MAX_SAFE_INTEGER / JELLYFIN_TICKS_PER_SECOND),
  ) * JELLYFIN_TICKS_PER_SECOND;
}

/**
 * Adapts a Jellyfin session progress payload to the existing PlaybackService
 * heartbeat contract. Invalid/non-playable IDs deliberately become null so the
 * HTTP adapter can return an appropriate compatibility response without
 * creating a stray progress row.
 */
export function jellyfinProgressToHeartbeat(
  payload: JellyfinProgressPayload,
  options: { decodeId?: ItemDecoder; userId?: string } = {},
): PlaybackProgressInput | null {
  if (typeof payload.ItemId !== 'string') return null;
  const target = playableTarget((options.decodeId ?? decodeJellyfinId)(payload.ItemId));
  if (!target) return null;

  return {
    ...target,
    userId: normalizeUserId(options.userId),
    position: jellyfinTicksToSeconds(payload.PositionTicks),
    duration: jellyfinTicksToSeconds(payload.RunTimeTicks),
  };
}

/**
 * Marks intent only. The integration layer must call a real shared-store
 * mark-watched operation; writing a fabricated `position=duration=1` heartbeat
 * would corrupt an otherwise correct resume duration.
 */
export function jellyfinMarkWatchedIntent(
  itemId: string,
  options: { decodeId?: ItemDecoder; userId?: string } = {},
): JellyfinMarkWatchedIntent | null {
  const target = playableTarget((options.decodeId ?? decodeJellyfinId)(itemId));
  return target ? { ...target, userId: normalizeUserId(options.userId) } : null;
}

/** Maps the existing continue-watching query record to Jellyfin's resume DTO. */
export function continueWatchingToJellyfinResumeItem(
  item: ContinueWatchingItem,
  encodeId: ItemEncoder = encodeJellyfinId,
): JellyfinResumeItem {
  const kind = item.mediaType === 'MOVIE' ? 'movie' : 'episode';
  const id = encodeId(kind, item.mediaId);
  const episode = item.mediaType === 'EPISODE';

  return {
    Id: id,
    Type: episode ? 'Episode' : 'Movie',
    Name: episode ? (item.episodeTitle ?? item.title) : item.title,
    ...(episode ? { SeriesName: item.title } : {}),
    ...(episode && item.seriesId !== null ? { SeriesId: encodeId('series', item.seriesId) } : {}),
    RunTimeTicks: playbackSecondsToJellyfinTicks(item.duration),
    UserData: {
      Played: item.isWatched,
      PlaybackPositionTicks: playbackSecondsToJellyfinTicks(item.position),
      ItemId: id,
    },
  };
}

/** Builds Jellyfin's standard paged response from shared continue-watching rows. */
export function continueWatchingToJellyfinResume(
  items: readonly ContinueWatchingItem[],
  encodeId: ItemEncoder = encodeJellyfinId,
): JellyfinResumeResponse {
  return {
    Items: items.map(item => continueWatchingToJellyfinResumeItem(item, encodeId)),
    TotalRecordCount: items.length,
    StartIndex: 0,
  };
}

/**
 * Finds the first unplayed episode in every represented series without
 * pagination. Route adapters use this to compute Jellyfin totals before they
 * apply StartIndex and Limit.
 */
export async function deriveAllNextUp(
  dependencies: NextUpDependencies,
  options: Omit<NextUpOptions, 'limit'> = {},
): Promise<OrderedJellyfinEpisode[]> {
  const userId = normalizeUserId(options.userId);
  const episodes = await dependencies.getOrderedEpisodes(options.seriesId);
  const representedSeries = new Set<number>();
  const nextUp: OrderedJellyfinEpisode[] = [];

  for (const episode of episodes) {
    if (options.seriesId !== undefined && episode.seriesId !== options.seriesId) continue;
    if (representedSeries.has(episode.seriesId)) continue;
    const progress = await dependencies.getProgress(episode.id, userId);
    if (progress?.isWatched) continue;
    representedSeries.add(episode.seriesId);
    nextUp.push(episode);
  }

  return nextUp;
}

/**
 * Selects the next unplayed episode for each series with the existing bounded
 * helper behavior for non-paged callers.
 */
export async function deriveNextUp(
  dependencies: NextUpDependencies,
  options: NextUpOptions = {},
): Promise<OrderedJellyfinEpisode[]> {
  const limit = Math.min(50, Math.max(1, Math.trunc(options.limit ?? 20)));
  const nextUp = await deriveAllNextUp(dependencies, options);
  return nextUp.slice(0, limit);
}
