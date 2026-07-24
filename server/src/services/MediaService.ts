import { MetadataProvider } from './MetadataProvider';
import type { MediaType } from '../types/BaseMedia';
import { ActivityEventEmitter } from './ActivityEventEmitter';
import fs from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import type { DatabaseClient } from '../db/drizzleClient';

interface MediaDeletionFilesystem {
  rm(path: string, options: { recursive: true; force: true }): Promise<void>;
}

/**
 * Service for managing movie and TV metadata and monitoring settings.
 */
export class MediaService {
  constructor(
    private readonly prisma: any,
    private readonly metadataProvider: Pick<MetadataProvider, 'getMovieAvailability'> | null = null,
    private readonly activityEventEmitter?: ActivityEventEmitter,
    private readonly filesystem: MediaDeletionFilesystem = fs,
  ) {}

  async addMovie(input: Record<string, unknown>): Promise<any> {
    try {
      const created = await this.prisma.movie.create({
        data: input,
      });

      await this.activityEventEmitter?.emit({
        eventType: 'MEDIA_ADDED',
        sourceModule: 'media-service',
        entityRef: `movie:${created.id}`,
        summary: `Media added: ${String(created.title ?? 'movie')}`,
        success: true,
        occurredAt: new Date(),
      });

      return created;
    } catch (error: any) {
      await this.activityEventEmitter?.emit({
        eventType: 'MEDIA_ADDED',
        sourceModule: 'media-service',
        summary: `Media add failed: ${error?.message ?? 'unknown error'}`,
        success: false,
        occurredAt: new Date(),
      });
      throw error;
    }
  }

  async getAllMedia(): Promise<any[]> {
    if (this.prisma.media?.findMany) {
      return this.prisma.media.findMany({
        include: {
          qualityProfile: true,
          series: true,
          movie: true,
        },
      });
    }

    const [series, movies] = await Promise.all([
      this.getAllSeries(),
      this.getAllMovies(),
    ]);
    return [...series, ...movies];
  }

  async getAllSeries(): Promise<any[]> {
    return this.prisma.series.findMany({
      include: {
        qualityProfile: true,
        _count: {
          select: { episodes: true },
        },
      },
    });
  }

  async getAllMovies(): Promise<any[]> {
    return this.prisma.movie.findMany({
      include: {
        qualityProfile: true,
      },
    });
  }

  async getSeriesById(id: number): Promise<any> {
    return this.prisma.series.findUnique({
      where: { id },
      include: {
        seasons: {
          include: { episodes: true },
        },
        qualityProfile: true,
      },
    });
  }

  async setMonitored(id: number, monitored: boolean, mediaType: MediaType = 'TV'): Promise<any> {
    if (mediaType === 'MOVIE') {
      return this.prisma.movie.update({
        where: { id },
        data: { monitored },
      });
    }

        return this.prisma.series.update({
            where: { id },
            data: { monitored },
          });
      }
    
      async setEpisodeMonitored(id: number, monitored: boolean): Promise<any> {
        return this.prisma.episode.update({
          where: { id },
          data: { monitored },
        });
      }
    
  async deleteMedia(id: number, mediaType: MediaType = 'TV', deleteFiles = false): Promise<void> {
    const target = mediaType === 'MOVIE'
      ? await this.prisma.movie.findUnique({ where: { id }, select: { mediaId: true, path: true } })
      : await this.prisma.series.findUnique({ where: { id }, select: { mediaId: true, path: true } });

    // Treat an already-deleted row as a successful idempotent retry.
    if (!target) {
      return;
    }

    // External cleanup must happen first. If it fails—even after removing only
    // part of the tree—the database row remains a durable retry target. `force`
    // makes a later attempt safe when part or all of the path is already gone.
    if (deleteFiles && target.path) {
      await this.filesystem.rm(target.path, { recursive: true, force: true });
    }

    // DatabaseClient enables foreign keys on connection. Deleting Series or
    // Movie therefore cascades to seasons/episodes/file variants and their
    // dependants. The shared Media row is deleted in the same synchronous
    // better-sqlite3 transaction, so any failure restores the complete graph.
    const database = this.prisma as DatabaseClient;
    database.drizzle.transaction((tx) => {
      const entityTable = mediaType === 'MOVIE' ? schema.movies : schema.series;
      tx.delete(entityTable)
        .where(eq(entityTable.id, id))
        .run();

      if (target.mediaId != null) {
        tx.delete(schema.media)
          .where(eq(schema.media.id, target.mediaId))
          .run();
      }
    });
  }

  async getMovieCandidatesForSearch(): Promise<any[]> {
    const movies = await this.prisma.movie.findMany({
      where: {
        monitored: true,
        path: null,
      },
    });

    return movies.filter((movie: any) => {
      const availability = this.getMovieAvailability(movie);
      return availability === 'released' || availability === 'streaming';
    });
  }

  private getMovieAvailability(movie: any): string {
    if (this.metadataProvider) {
      return this.metadataProvider.getMovieAvailability({
        status: movie.status,
        inCinemas: movie.inCinemas,
        digitalRelease: movie.digitalRelease,
        physicalRelease: movie.physicalRelease,
        releaseDate: movie.releaseDate,
      });
    }

    if (String(movie.status ?? '').toLowerCase() === 'released') {
      return 'released';
    }

    return 'announced';
  }
}
