import fs from 'node:fs/promises';
import path from 'node:path';
import type { PrismaClient, PlaybackMediaType } from '@prisma/client';
import { NotFoundError, ValidationError } from '../errors/domainErrors';
import type { PlaybackRepository } from '../repositories/PlaybackRepository';
import type { SettingsService } from './SettingsService';

const DEFAULT_USER_ID = 'lan-default';
const DEFAULT_ALLOWED_ROOTS = ['/data/media'];
const ALLOWED_SUBTITLE_EXTENSIONS = new Set(['.srt', '.vtt']);

export interface PlaybackTarget {
  mediaType: PlaybackMediaType;
  mediaId: number;
}

export interface PlaybackManifestRequest extends PlaybackTarget {
  userId?: string;
}

export interface PlaybackProgressInput extends PlaybackManifestRequest {
  position: number;
  duration: number;
}

export interface PlaybackStreamSource {
  mediaType: PlaybackMediaType;
  mediaId: number;
  title: string;
  filePath: string;
}

export interface PlaybackSubtitleTrack {
  id: number;
  languageCode: string | null;
  isForced: boolean;
  isHi: boolean;
  format: 'srt' | 'vtt';
  url: string;
}

export interface PlaybackManifest {
  streamUrl: string;
  metadata: {
    mediaType: PlaybackMediaType;
    mediaId: number;
    title: string;
    overview: string | null;
    posterUrl: string | null;
    backdropUrl: string | null;
  };
  subtitles: PlaybackSubtitleTrack[];
  resume: null | {
    userId: string;
    position: number;
    duration: number;
    progress: number;
    isWatched: boolean;
    lastWatched: string;
  };
}

export interface SubtitleSource {
  id: number;
  filePath: string;
  format: 'srt' | 'vtt';
  languageCode: string | null;
  isForced: boolean;
  isHi: boolean;
}

interface MoviePlaybackRecord {
  type: 'MOVIE';
  title: string;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  variantPath: string;
  subtitles: SubtitleSource[];
}

interface EpisodePlaybackRecord {
  type: 'EPISODE';
  title: string;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  variantPath: string;
  subtitles: SubtitleSource[];
}

type PlaybackRecord = MoviePlaybackRecord | EpisodePlaybackRecord;

function normalizeUserId(userId: string | undefined): string {
  const normalized = userId?.trim();
  return normalized && normalized.length > 0 ? normalized : DEFAULT_USER_ID;
}

function parseSubtitleFormat(filePath: string): 'srt' | 'vtt' | null {
  const extension = path.extname(filePath).toLowerCase();
  if (!ALLOWED_SUBTITLE_EXTENSIONS.has(extension)) {
    return null;
  }

  return extension === '.vtt' ? 'vtt' : 'srt';
}

function normalizeRoot(input: string): string {
  return path.resolve(input);
}

/**
 * Resolves stream sources, subtitle manifests, and persisted playback progress.
 */
export class PlaybackService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly playbackRepository: Pick<
      PlaybackRepository,
      'getProgress' | 'getLatestProgressForMedia' | 'upsertProgress'
    >,
    private readonly settingsService?: Pick<SettingsService, 'get'>,
  ) {}

  async resolveStreamSource(target: PlaybackTarget): Promise<PlaybackStreamSource> {
    const playbackRecord = await this.resolvePlaybackRecord(target);
    await this.assertPathAllowed(playbackRecord.variantPath);

    return {
      mediaType: target.mediaType,
      mediaId: target.mediaId,
      title: playbackRecord.title,
      filePath: playbackRecord.variantPath,
    };
  }

  async buildManifest(input: PlaybackManifestRequest): Promise<PlaybackManifest> {
    const playbackRecord = await this.resolvePlaybackRecord(input);
    await this.assertPathAllowed(playbackRecord.variantPath);

    const userId = normalizeUserId(input.userId);
    const progress = await this.playbackRepository.getProgress({
      mediaType: input.mediaType,
      mediaId: input.mediaId,
      userId,
    }) ?? await this.playbackRepository.getLatestProgressForMedia(
      input.mediaType,
      input.mediaId,
    );

    const queryType = input.mediaType === 'MOVIE' ? 'movie' : 'episode';

    return {
      streamUrl: `/api/stream/${input.mediaId}?type=${queryType}`,
      metadata: {
        mediaType: input.mediaType,
        mediaId: input.mediaId,
        title: playbackRecord.title,
        overview: playbackRecord.overview,
        posterUrl: playbackRecord.posterUrl,
        backdropUrl: playbackRecord.backdropUrl,
      },
      subtitles: playbackRecord.subtitles.map(track => ({
        id: track.id,
        languageCode: track.languageCode,
        isForced: track.isForced,
        isHi: track.isHi,
        format: track.format,
        url: `/api/playback/subtitles/${track.id}`,
      })),
      resume: progress
        ? {
          userId: progress.userId,
          position: progress.position,
          duration: progress.duration,
          progress: progress.progress,
          isWatched: progress.isWatched,
          lastWatched: progress.lastWatched.toISOString(),
        }
        : null,
    };
  }

  async recordHeartbeat(input: PlaybackProgressInput): Promise<{
    mediaType: PlaybackMediaType;
    mediaId: number;
    userId: string;
    position: number;
    duration: number;
    progress: number;
    isWatched: boolean;
    lastWatched: string;
  }> {
    const userId = normalizeUserId(input.userId);

    const saved = await this.playbackRepository.upsertProgress({
      mediaType: input.mediaType,
      mediaId: input.mediaId,
      userId,
      position: input.position,
      duration: input.duration,
      watchedThreshold: 0.9,
    });

    return {
      mediaType: saved.mediaType,
      mediaId: saved.mediaId,
      userId: saved.userId,
      position: saved.position,
      duration: saved.duration,
      progress: saved.progress,
      isWatched: saved.isWatched,
      lastWatched: saved.lastWatched.toISOString(),
    };
  }

  async resolveSubtitleTrack(trackId: number): Promise<SubtitleSource> {
    const subtitle = await (this.prisma as any).variantSubtitleTrack.findUnique({
      where: { id: trackId },
      select: {
        id: true,
        filePath: true,
        languageCode: true,
        isForced: true,
        isHi: true,
        variant: {
          select: {
            path: true,
          },
        },
      },
    });

    if (!subtitle?.filePath) {
      throw new NotFoundError(`Subtitle track ${trackId} not found`);
    }

    const format = parseSubtitleFormat(subtitle.filePath);
    if (!format) {
      throw new ValidationError('Subtitle track must be a .srt or .vtt sidecar file');
    }

    const extraRoots = subtitle.variant?.path
      ? [path.dirname(subtitle.variant.path)]
      : [];
    await this.assertPathAllowed(subtitle.filePath, extraRoots);

    return {
      id: subtitle.id,
      filePath: subtitle.filePath,
      languageCode: subtitle.languageCode ?? null,
      isForced: subtitle.isForced,
      isHi: subtitle.isHi,
      format,
    };
  }

  private async resolvePlaybackRecord(target: PlaybackTarget): Promise<PlaybackRecord> {
    if (target.mediaType === 'MOVIE') {
      return this.resolveMovieRecord(target.mediaId);
    }

    return this.resolveEpisodeRecord(target.mediaId);
  }

  private async resolveMovieRecord(movieId: number): Promise<MoviePlaybackRecord> {
    const movie = await (this.prisma as any).movie.findUnique({
      where: { id: movieId },
      select: {
        id: true,
        title: true,
        overview: true,
        posterUrl: true,
        fileVariants: {
          orderBy: [{ monitored: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
          select: {
            path: true,
            subtitleTracks: {
              where: {
                filePath: {
                  not: null,
                },
              },
              orderBy: [{ source: 'asc' }, { streamIndex: 'asc' }, { id: 'asc' }],
              select: {
                id: true,
                filePath: true,
                languageCode: true,
                isForced: true,
                isHi: true,
              },
            },
          },
        },
      },
    });

    if (!movie) {
      throw new NotFoundError(`Movie ${movieId} not found`);
    }

    const variant = movie.fileVariants.find((item: { path?: string }) => Boolean(item.path));
    if (!variant?.path) {
      throw new NotFoundError(`Movie ${movieId} has no playable file variants`);
    }

    return {
      type: 'MOVIE',
      title: movie.title,
      overview: movie.overview ?? null,
      posterUrl: movie.posterUrl ?? null,
      backdropUrl: null,
      variantPath: variant.path,
      subtitles: this.mapSubtitleSources(variant.subtitleTracks),
    };
  }

  private async resolveEpisodeRecord(episodeId: number): Promise<EpisodePlaybackRecord> {
    const episode = await (this.prisma as any).episode.findUnique({
      where: { id: episodeId },
      select: {
        id: true,
        title: true,
        overview: true,
        seasonNumber: true,
        episodeNumber: true,
        series: {
          select: {
            title: true,
            overview: true,
            posterUrl: true,
          },
        },
        fileVariants: {
          orderBy: [{ monitored: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
          select: {
            path: true,
            subtitleTracks: {
              where: {
                filePath: {
                  not: null,
                },
              },
              orderBy: [{ source: 'asc' }, { streamIndex: 'asc' }, { id: 'asc' }],
              select: {
                id: true,
                filePath: true,
                languageCode: true,
                isForced: true,
                isHi: true,
              },
            },
          },
        },
      },
    });

    if (!episode) {
      throw new NotFoundError(`Episode ${episodeId} not found`);
    }

    const variant = episode.fileVariants.find((item: { path?: string }) => Boolean(item.path));
    if (!variant?.path) {
      throw new NotFoundError(`Episode ${episodeId} has no playable file variants`);
    }

    const season = String(episode.seasonNumber).padStart(2, '0');
    const episodeNumber = String(episode.episodeNumber).padStart(2, '0');
    const seriesTitle = episode.series?.title ?? 'Series';

    return {
      type: 'EPISODE',
      title: `${seriesTitle} S${season}E${episodeNumber} - ${episode.title}`,
      overview: episode.overview ?? episode.series?.overview ?? null,
      posterUrl: episode.series?.posterUrl ?? null,
      backdropUrl: null,
      variantPath: variant.path,
      subtitles: this.mapSubtitleSources(variant.subtitleTracks),
    };
  }

  private mapSubtitleSources(
    tracks: Array<{
      id: number;
      filePath: string | null;
      languageCode: string | null;
      isForced: boolean;
      isHi: boolean;
    }>,
  ): SubtitleSource[] {
    const mapped: SubtitleSource[] = [];

    for (const track of tracks) {
      if (!track.filePath) {
        continue;
      }

      const format = parseSubtitleFormat(track.filePath);
      if (!format) {
        continue;
      }

      mapped.push({
        id: track.id,
        filePath: track.filePath,
        languageCode: track.languageCode,
        isForced: track.isForced,
        isHi: track.isHi,
        format,
      });
    }

    return mapped;
  }

  private async getAllowedRoots(extraRoots: string[] = []): Promise<string[]> {
    const roots = new Set<string>(DEFAULT_ALLOWED_ROOTS.map(normalizeRoot));

    if (this.settingsService?.get) {
      const settings = await this.settingsService.get();
      const configured = [
        settings.mediaManagement.movieRootFolder,
        settings.mediaManagement.tvRootFolder,
      ]
        .map(value => value.trim())
        .filter(value => value.length > 0)
        .map(normalizeRoot);

      for (const root of configured) {
        roots.add(root);
      }
    }

    const subtitleDirectory = process.env.SUBTITLES_DIR?.trim();
    if (subtitleDirectory) {
      roots.add(normalizeRoot(subtitleDirectory));
    }

    for (const root of extraRoots) {
      const normalized = root.trim();
      if (normalized.length > 0) {
        roots.add(normalizeRoot(normalized));
      }
    }

    return Array.from(roots);
  }

  private async assertPathAllowed(targetPath: string, extraRoots: string[] = []): Promise<void> {
    const roots = await this.getAllowedRoots(extraRoots);
    const absoluteTarget = normalizeRoot(targetPath);

    const allowed = roots.some(root => absoluteTarget === root || absoluteTarget.startsWith(`${root}${path.sep}`));

    if (!allowed) {
      throw new ValidationError('Playback path is outside configured media roots', {
        path: targetPath,
      });
    }

    try {
      await fs.access(absoluteTarget);
    } catch {
      throw new NotFoundError(`Playback file not found: ${targetPath}`);
    }
  }
}
