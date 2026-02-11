import type { PrismaClient } from '@prisma/client';
import { SubtitleVariantRepository } from '../repositories/SubtitleVariantRepository';

export interface BackfillResult {
  movieVariantsCreated: number;
  episodeVariantsCreated: number;
}

/**
 * Backfills variant records from legacy single-path movie/episode fields.
 */
export class VariantBackfillService {
  constructor(
    private readonly prisma: PrismaClient,
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
      if (!movie.path) {
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
        fileSize: BigInt(0),
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
      if (!episode.path) {
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
        fileSize: BigInt(0),
      });
      created += 1;
    }

    return created;
  }
}
