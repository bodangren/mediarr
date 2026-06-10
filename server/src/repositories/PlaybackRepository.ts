import { and, desc, eq, gt, inArray } from 'drizzle-orm';
import type { DatabaseClient } from '../db/drizzleClient';
import * as schema from '../db/schema';
import type { PlaybackProgress } from '../types/modelTypes';
import type { PlaybackMediaType } from '../db/schema';
import type { PlaybackProgressKey } from '../contracts/playback';

const DEFAULT_WATCHED_THRESHOLD = 0.9;

export interface UpsertPlaybackProgressInput extends PlaybackProgressKey {
  position: number;
  duration: number;
  watchedThreshold?: number;
  playedAt?: Date;
}

export interface ContinueWatchingItem {
  mediaType: PlaybackMediaType;
  mediaId: number;
  seriesId: number | null;
  title: string;
  episodeTitle: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  position: number;
  duration: number;
  progress: number;
  isWatched: boolean;
  lastWatched: Date;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toSafeInteger(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

/**
 * Persists and resolves playback position snapshots per media/user pair.
 */
export class PlaybackRepository {
  constructor(private readonly prisma: DatabaseClient) {}

  async getProgress(key: PlaybackProgressKey): Promise<PlaybackProgress | null> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.playbackProgress)
      .where(
        and(
          eq(schema.playbackProgress.mediaType, key.mediaType),
          eq(schema.playbackProgress.mediaId, key.mediaId),
          eq(schema.playbackProgress.userId, key.userId),
        ),
      )
      .limit(1);
    return (rows[0] as PlaybackProgress | undefined) ?? null;
  }

  async getLatestProgressForMedia(
    mediaType: PlaybackMediaType,
    mediaId: number,
  ): Promise<PlaybackProgress | null> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.playbackProgress)
      .where(
        and(
          eq(schema.playbackProgress.mediaType, mediaType),
          eq(schema.playbackProgress.mediaId, mediaId),
        ),
      )
      .orderBy(
        desc(schema.playbackProgress.lastWatched),
        desc(schema.playbackProgress.updatedAt),
        desc(schema.playbackProgress.id),
      )
      .limit(1);
    return (rows[0] as PlaybackProgress | undefined) ?? null;
  }

  async upsertProgress(input: UpsertPlaybackProgressInput): Promise<PlaybackProgress> {
    const position = toSafeInteger(input.position);
    const duration = toSafeInteger(input.duration);
    const progress = duration > 0 ? clamp(position / duration, 0, 1) : 0;
    const watchedThreshold = clamp(
      input.watchedThreshold ?? DEFAULT_WATCHED_THRESHOLD,
      0,
      1,
    );
    const watchedNow = duration > 0 && progress >= watchedThreshold;
    const playedAt = input.playedAt ?? new Date();

    const existing = await this.getProgress({
      mediaType: input.mediaType,
      mediaId: input.mediaId,
      userId: input.userId,
    });

    const [row] = await this.prisma.drizzle
      .insert(schema.playbackProgress)
      .values({
        mediaType: input.mediaType,
        mediaId: input.mediaId,
        userId: input.userId,
        position,
        duration,
        progress,
        isWatched: watchedNow,
        lastWatched: playedAt,
      })
      .onConflictDoUpdate({
        target: [
          schema.playbackProgress.mediaType,
          schema.playbackProgress.mediaId,
          schema.playbackProgress.userId,
        ],
        set: {
          position,
          duration,
          progress,
          isWatched: (existing?.isWatched ?? false) || watchedNow,
          lastWatched: playedAt,
        },
      })
      .returning();
    if (!row) {
      throw new Error('PlaybackRepository.upsertProgress: returned no row');
    }
    return row as PlaybackProgress;
  }

  async findContinueWatching(limit = 20): Promise<ContinueWatchingItem[]> {
    const safeLimit = Math.min(50, Math.max(1, Math.trunc(limit || 20)));

    const rows = await this.prisma.drizzle
      .select()
      .from(schema.playbackProgress)
      .where(
        and(
          eq(schema.playbackProgress.isWatched, false),
          gt(schema.playbackProgress.position, 0),
        ),
      )
      .orderBy(
        desc(schema.playbackProgress.updatedAt),
        desc(schema.playbackProgress.lastWatched),
        desc(schema.playbackProgress.id),
      )
      .limit(safeLimit * 3);

    if (rows.length === 0) return [];

    const movieIds = rows
      .filter((r) => r.mediaType === 'MOVIE')
      .map((r) => r.mediaId);
    const episodeIds = rows
      .filter((r) => r.mediaType === 'EPISODE')
      .map((r) => r.mediaId);

    const [movies, episodes] = await Promise.all([
      movieIds.length > 0
        ? this.prisma.drizzle
            .select({
              id: schema.movies.id,
              title: schema.movies.title,
              posterUrl: schema.movies.posterUrl,
            })
            .from(schema.movies)
            .where(inArray(schema.movies.id, movieIds))
        : Promise.resolve([]),
      episodeIds.length > 0
        ? this.prisma.drizzle
            .select({
              id: schema.episodes.id,
              seriesId: schema.episodes.seriesId,
              title: schema.episodes.title,
              seasonNumber: schema.episodes.seasonNumber,
              episodeNumber: schema.episodes.episodeNumber,
              seriesTitle: schema.series.title,
              seriesPosterUrl: schema.series.posterUrl,
            })
            .from(schema.episodes)
            .leftJoin(schema.series, eq(schema.episodes.seriesId, schema.series.id))
            .where(inArray(schema.episodes.id, episodeIds))
        : Promise.resolve([]),
    ]);

    type MovieRow = { id: number; title: string; posterUrl: string | null };
    type EpisodeRow = {
      id: number;
      seriesId: number | null;
      title: string | null;
      seasonNumber: number | null;
      episodeNumber: number | null;
      seriesTitle: string | null;
      seriesPosterUrl: string | null;
    };

    const movieById = new Map<number, MovieRow>(
      (movies as MovieRow[]).map((m) => [m.id, m]),
    );
    const episodeById = new Map<number, EpisodeRow>(
      (episodes as EpisodeRow[]).map((e) => [e.id, e]),
    );

    const result: ContinueWatchingItem[] = [];
    for (const row of rows) {
      if (row.mediaType === 'MOVIE') {
        const movie = movieById.get(row.mediaId);
        if (!movie) continue;
        result.push({
          mediaType: row.mediaType as PlaybackMediaType,
          mediaId: row.mediaId,
          seriesId: null,
          title: movie.title,
          episodeTitle: null,
          seasonNumber: null,
          episodeNumber: null,
          posterUrl: movie.posterUrl ?? null,
          backdropUrl: null,
          position: row.position,
          duration: row.duration,
          progress: row.progress,
          isWatched: row.isWatched,
          lastWatched: row.lastWatched,
        });
      } else {
        const episode = episodeById.get(row.mediaId);
        if (!episode?.seriesTitle) continue;
        result.push({
          mediaType: row.mediaType as PlaybackMediaType,
          mediaId: row.mediaId,
          seriesId: episode.seriesId ?? null,
          title: episode.seriesTitle,
          episodeTitle: episode.title ?? null,
          seasonNumber: episode.seasonNumber ?? null,
          episodeNumber: episode.episodeNumber ?? null,
          posterUrl: episode.seriesPosterUrl ?? null,
          backdropUrl: null,
          position: row.position,
          duration: row.duration,
          progress: row.progress,
          isWatched: row.isWatched,
          lastWatched: row.lastWatched,
        });
      }

      if (result.length >= safeLimit) break;
    }

    return result;
  }
}