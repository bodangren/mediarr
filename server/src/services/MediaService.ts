import { MetadataProvider } from './MetadataProvider';
import type { MediaType } from '../types/BaseMedia';
import { ActivityEventEmitter } from './ActivityEventEmitter';

/**
 * Service for managing movie and TV metadata and monitoring settings.
 */
export class MediaService {
  constructor(
    private readonly prisma: any,
    private readonly metadataProvider: Pick<MetadataProvider, 'getMovieAvailability'> | null = null,
    private readonly activityEventEmitter?: ActivityEventEmitter,
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

  async deleteMedia(id: number, mediaType: MediaType = 'TV', deleteFiles = false): Promise<void> {
    // File deletion can be wired in here when disk lifecycle management is enabled.
    void deleteFiles;

    if (mediaType === 'MOVIE') {
      await this.prisma.movie.delete({ where: { id } });
      return;
    }

    await this.prisma.series.delete({ where: { id } });
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
