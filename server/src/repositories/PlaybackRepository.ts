import type { DatabaseClient } from '../db/drizzleClient';
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
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}

/**
 * Persists and resolves playback position snapshots per media/user pair.
 */
export class PlaybackRepository {
  constructor(private readonly prisma: DatabaseClient) {}

  async getProgress(key: PlaybackProgressKey): Promise<PlaybackProgress | null> {
    return this.prisma.playbackProgress.findUnique({
      where: {
        mediaType_mediaId_userId: {
          mediaType: key.mediaType,
          mediaId: key.mediaId,
          userId: key.userId,
        },
      },
    });
  }

  async getLatestProgressForMedia(
    mediaType: PlaybackMediaType,
    mediaId: number,
  ): Promise<PlaybackProgress | null> {
    return this.prisma.playbackProgress.findFirst({
      where: {
        mediaType,
        mediaId,
      },
      orderBy: [
        { lastWatched: 'desc' },
        { updatedAt: 'desc' },
        { id: 'desc' },
      ],
    });
  }

  async upsertProgress(input: UpsertPlaybackProgressInput): Promise<PlaybackProgress> {
    const position = toSafeInteger(input.position);
    const duration = toSafeInteger(input.duration);
    const progress =
      duration > 0 ? clamp(position / duration, 0, 1) : 0;
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

    return this.prisma.playbackProgress.upsert({
      where: {
        mediaType_mediaId_userId: {
          mediaType: input.mediaType,
          mediaId: input.mediaId,
          userId: input.userId,
        },
      },
      update: {
        position,
        duration,
        progress,
        isWatched: (existing?.isWatched ?? false) || watchedNow,
        lastWatched: playedAt,
      },
      create: {
        mediaType: input.mediaType,
        mediaId: input.mediaId,
        userId: input.userId,
        position,
        duration,
        progress,
        isWatched: watchedNow,
        lastWatched: playedAt,
      },
    });
  }

  async findContinueWatching(limit = 20): Promise<ContinueWatchingItem[]> {
    const safeLimit = Math.min(50, Math.max(1, Math.trunc(limit || 20)));
    const rows = await this.prisma.playbackProgress.findMany({
      where: {
        isWatched: false,
        position: {
          gt: 0,
        },
      },
      orderBy: [
        { updatedAt: 'desc' },
        { lastWatched: 'desc' },
        { id: 'desc' },
      ],
      take: safeLimit * 3,
    });

    if (rows.length === 0) {
      return [];
    }

    const movieIds = rows
      .filter((row: { mediaType: string; mediaId: number }) => row.mediaType === 'MOVIE')
      .map((row: { mediaType: string; mediaId: number }) => row.mediaId);
    const episodeIds = rows
      .filter((row: { mediaType: string; mediaId: number }) => row.mediaType === 'EPISODE')
      .map((row: { mediaType: string; mediaId: number }) => row.mediaId);

    const [movies, episodes] = await Promise.all([
      movieIds.length > 0
        ? (this.prisma as any).movie.findMany({
            where: { id: { in: movieIds } },
            select: {
              id: true,
              title: true,
              posterUrl: true,
              fanartUrl: true,
            },
          })
        : Promise.resolve([]),
      episodeIds.length > 0
        ? (this.prisma as any).episode.findMany({
            where: { id: { in: episodeIds } },
            select: {
              id: true,
              seriesId: true,
              title: true,
              seasonNumber: true,
              episodeNumber: true,
              series: {
                select: {
                  title: true,
                  posterUrl: true,
                  fanartUrl: true,
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const movieById = new Map<number, any>((movies as any[]).map((movie) => [movie.id, movie]));
    const episodeById = new Map<number, any>((episodes as any[]).map((episode) => [episode.id, episode]));

    const result: ContinueWatchingItem[] = [];
    for (const row of rows) {
      if (row.mediaType === 'MOVIE') {
        const movie = movieById.get(row.mediaId);
        if (!movie) {
          continue;
        }
        result.push({
          mediaType: row.mediaType,
          mediaId: row.mediaId,
          seriesId: null,
          title: movie.title,
          episodeTitle: null,
          seasonNumber: null,
          episodeNumber: null,
          posterUrl: movie.posterUrl ?? null,
          backdropUrl: movie.fanartUrl ?? null,
          position: row.position,
          duration: row.duration,
          progress: row.progress,
          isWatched: row.isWatched,
          lastWatched: row.lastWatched,
        });
      } else {
        const episode = episodeById.get(row.mediaId);
        if (!episode?.series?.title) {
          continue;
        }
        result.push({
          mediaType: row.mediaType,
          mediaId: row.mediaId,
          seriesId: episode.seriesId ?? null,
          title: episode.series.title,
          episodeTitle: episode.title ?? null,
          seasonNumber: episode.seasonNumber ?? null,
          episodeNumber: episode.episodeNumber ?? null,
          posterUrl: episode.series.posterUrl ?? null,
          backdropUrl: episode.series.fanartUrl ?? null,
          position: row.position,
          duration: row.duration,
          progress: row.progress,
          isWatched: row.isWatched,
          lastWatched: row.lastWatched,
        });
      }

      if (result.length >= safeLimit) {
        break;
      }
    }

    return result;
  }
}
