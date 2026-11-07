import path from 'node:path';
import type { DatabaseClient } from '../db/drizzleClient';
import { SubtitleVariantRepository } from '../repositories/SubtitleVariantRepository';

/**
 * Extensions a `MediaFileVariant.path` may legitimately carry.
 *
 * `Movie.path` and `Episode.path` are not always a file: for a movie it is the
 * movie FOLDER (`/data/Movies/12 Angry Men (1957)`). Backfilling such a path
 * created a variant that playback resolved to a directory, so every movie
 * stream failed with HTTP 500 (`FST_ERR_REP_INVALID_PAYLOAD_TYPE`) on
 * 2026-11-07. Only real video files may become variants.
 */
const VIDEO_EXTENSIONS = new Set([
  '.mkv', '.mp4', '.avi', '.m4v', '.mov', '.webm', '.ts', '.wmv', '.mpg', '.mpeg',
]);

function isVideoFilePath(filePath: string): boolean {
  return VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

export interface BackfillResult {
  movieVariantsCreated: number;
  episodeVariantsCreated: number;
}

/**
 * Backfills variant records from legacy single-path movie/episode fields.
 */
export class VariantBackfillService {
  constructor(
    private readonly prisma: DatabaseClient,
    private readonly repository: SubtitleVariantRepository,
  ) {}

  async run(): Promise<BackfillResult> {
    const movieVariantsCreated = await this.backfillMovies();
    const episodeVariantsCreated = await this.backfillEpisodes();

    return {
      movieVariantsCreated,
      episodeVariantsCreated,
    };
  }

  private async backfillMovies(): Promise<number> {
    const movies = await this.prisma.movie.findMany({
      where: {
        path: { not: null },
      },
      select: {
        id: true,
        path: true,
      },
    });

    let created = 0;
    for (const movie of movies) {
      if (!movie.path || !isVideoFilePath(movie.path)) {
        continue;
      }

      const existing = await this.prisma.mediaFileVariant.findFirst({
        where: {
          mediaType: 'MOVIE',
          movieId: movie.id,
          path: movie.path,
        },
      });

      if (existing) {
        continue;
      }

      await this.repository.upsertVariant({
        mediaType: 'MOVIE',
        movieId: movie.id,
        path: movie.path,
        fileSize: Number(0),
      });
      created += 1;
    }

    return created;
  }

  private async backfillEpisodes(): Promise<number> {
    const episodes = await this.prisma.episode.findMany({
      where: {
        path: { not: null },
      },
      select: {
        id: true,
        path: true,
      },
    });

    let created = 0;
    for (const episode of episodes) {
      if (!episode.path || !isVideoFilePath(episode.path)) {
        continue;
      }

      const existing = await this.prisma.mediaFileVariant.findFirst({
        where: {
          mediaType: 'EPISODE',
          episodeId: episode.id,
          path: episode.path,
        },
      });

      if (existing) {
        continue;
      }

      await this.repository.upsertVariant({
        mediaType: 'EPISODE',
        episodeId: episode.id,
        path: episode.path,
        fileSize: Number(0),
      });
      created += 1;
    }

    return created;
  }
}
