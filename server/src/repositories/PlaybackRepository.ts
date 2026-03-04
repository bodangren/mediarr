import type {
  PlaybackMediaType,
  PlaybackProgress,
  PrismaClient,
} from '@prisma/client';

const DEFAULT_WATCHED_THRESHOLD = 0.9;

export interface PlaybackProgressKey {
  mediaType: PlaybackMediaType;
  mediaId: number;
  userId: string;
}

export interface UpsertPlaybackProgressInput extends PlaybackProgressKey {
  position: number;
  duration: number;
  watchedThreshold?: number;
  playedAt?: Date;
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
  constructor(private readonly prisma: PrismaClient) {}

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
}
