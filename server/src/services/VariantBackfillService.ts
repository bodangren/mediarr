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

  /**
   * Variant keys already present, as one query per media type.
   *
   * The previous implementation ran a `findFirst` per movie/episode — about
   * 3,500 synchronous better-sqlite3 queries on startup, which took ~30 s on a
   * cold USB drive and left the API unresponsive after every restart (measured
   * 2026-11-07: `container.initialize()` = 30.9 s).
   */
  private async existingVariantKeys(
    mediaType: 'MOVIE' | 'EPISODE',
  ): Promise<Set<string>> {
    const rows = await (this.prisma as any).mediaFileVariant.findMany({
      where: { mediaType },
      select: { movieId: true, episodeId: true, path: true },
    });
    const keys = new Set<string>();
    for (const row of rows as Array<{ movieId?: number | null; episodeId?: number | null; path?: string | null }>) {
      const ownerId = mediaType === 'MOVIE' ? row.movieId : row.episodeId;
      if (ownerId === undefined || ownerId === null || !row.path) continue;
      keys.add(`${ownerId}|${row.path}`);
    }
    return keys;
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

    if (movies.length === 0) return 0;
    const existing = await this.existingVariantKeys('MOVIE');
    let created = 0;
    for (const movie of movies) {
      if (!movie.path || !isVideoFilePath(movie.path)) {
        continue;
      }
      if (existing.has(`${movie.id}|${movie.path}`)) {
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

    if (episodes.length === 0) return 0;
    const existing = await this.existingVariantKeys('EPISODE');
    let created = 0;
    for (const episode of episodes) {
      if (!episode.path || !isVideoFilePath(episode.path)) {
        continue;
      }
      if (existing.has(`${episode.id}|${episode.path}`)) {
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
