import type { PrismaClient } from '@prisma/client';
import { HttpClient } from '../indexers/HttpClient';
import { SettingsService } from './SettingsService';
import { ConflictError, NotFoundError, ValidationError, ProviderUnavailableError } from '../errors/domainErrors';

export interface TMDBCollectionMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  adult: boolean;
  genre_ids: number[];
  popularity: number;
  vote_average: number;
  vote_count: number;
  video: boolean;
}

export interface TMDBCollectionResponse {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: TMDBCollectionMovie[];
}

export interface CollectionMovieInfo {
  tmdbId: number;
  title: string;
  year: number;
  overview?: string | undefined;
  posterPath?: string | undefined;
  releaseDate?: string | undefined;
}

export interface CollectionInfo {
  name: string;
  overview: string;
  posterPath: string;
  backdropPath: string;
  movies: CollectionMovieInfo[];
}

export interface SearchMissingResult {
  searched: number;
  missing: number;
}

export class CollectionService {
  private readonly tmdbBaseUrl = 'https://api.themoviedb.org/3';

  constructor(
    private readonly prisma: PrismaClient,
    private readonly httpClient: HttpClient,
    private readonly settingsService: SettingsService,
  ) {}

  async fetchFromTMDB(tmdbCollectionId: number): Promise<CollectionInfo> {
    const settings = await this.settingsService.get();
    const apiKey = settings.apiKeys.tmdbApiKey;

    if (!apiKey) {
      throw new ValidationError('TMDB API Key is missing. Please configure it in settings.');
    }

    const url = `${this.tmdbBaseUrl}/collection/${tmdbCollectionId}?api_key=${encodeURIComponent(apiKey)}`;
    const response = await this.httpClient.get(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundError(`TMDB collection ${tmdbCollectionId} not found`);
      }
      throw new ProviderUnavailableError(`Failed to fetch collection from TMDB: ${response.status} ${response.body}`);
    }

    const data: TMDBCollectionResponse = JSON.parse(response.body);

    const movies: CollectionMovieInfo[] = data.parts
      .filter(movie => movie.release_date) // Only include movies with release dates
      .sort((a, b) => a.release_date.localeCompare(b.release_date))
      .map(movie => ({
        tmdbId: movie.id,
        title: movie.title,
        year: this.parseYear(movie.release_date) ?? 0,
        overview: movie.overview || undefined,
        posterPath: movie.poster_path || undefined,
        releaseDate: movie.release_date,
      }));

    return {
      name: data.name,
      overview: data.overview || '',
      posterPath: data.poster_path || '',
      backdropPath: data.backdrop_path || '',
      movies,
    };
  }

  async createCollection(tmdbCollectionId: number, options?: {
    monitored?: boolean;
    qualityProfileId?: number;
    rootFolderPath?: string;
    addMoviesAutomatically?: boolean;
    searchOnAdd?: boolean;
  }): Promise<{ id: number; name: string; moviesAdded: number }> {
    // Check if collection already exists
    const existing = await (this.prisma as any).collection?.findUnique({
      where: { tmdbCollectionId },
    });

    if (existing) {
      throw new ConflictError(`Collection with TMDB ID ${tmdbCollectionId} already exists`);
    }

    // Fetch collection info from TMDB
    const collectionInfo = await this.fetchFromTMDB(tmdbCollectionId);

    // Create the collection
    const collection = await (this.prisma as any).collection?.create({
      data: {
        tmdbCollectionId,
        name: collectionInfo.name,
        overview: collectionInfo.overview,
        posterPath: collectionInfo.posterPath,
        backdropPath: collectionInfo.backdropPath,
        monitored: options?.monitored ?? false,
        qualityProfileId: options?.qualityProfileId ?? null,
        rootFolderPath: options?.rootFolderPath ?? null,
        addMoviesAutomatically: options?.addMoviesAutomatically ?? false,
        searchOnAdd: options?.searchOnAdd ?? false,
      },
    });

    let moviesAdded = 0;

    // Add movies to library if requested
    if (options?.addMoviesAutomatically && collectionInfo.movies.length > 0) {
      for (const movie of collectionInfo.movies) {
        const existingMovie = await (this.prisma as any).movie?.findUnique({
          where: { tmdbId: movie.tmdbId },
        });

        if (!existingMovie) {
          // Create the movie with default quality profile
          const qualityProfileId = options?.qualityProfileId ?? 1;
          await (this.prisma as any).movie?.create({
            data: {
              tmdbId: movie.tmdbId,
              title: movie.title,
              cleanTitle: this.cleanTitle(movie.title),
              sortTitle: movie.title.toLowerCase(),
              year: movie.year,
              overview: movie.overview ?? null,
              posterPath: movie.posterPath ?? null,
              status: 'released',
              monitored: options?.monitored ?? false,
              qualityProfileId,
              collectionId: collection.id,
            },
          });
          moviesAdded++;
        } else {
          // Link existing movie to collection
          await (this.prisma as any).movie?.update({
            where: { id: existingMovie.id },
            data: { collectionId: collection.id },
          });
        }
      }
    }

    return {
      id: collection.id,
      name: collection.name,
      moviesAdded,
    };
  }

  async syncCollectionMovies(collectionId: number): Promise<{ added: number; updated: number }> {
    const collection = await (this.prisma as any).collection?.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new NotFoundError(`Collection ${collectionId} not found`);
    }

    const collectionInfo = await this.fetchFromTMDB(collection.tmdbCollectionId);
    let added = 0;
    let updated = 0;

    for (const movie of collectionInfo.movies) {
      const existingMovie = await (this.prisma as any).movie?.findUnique({
        where: { tmdbId: movie.tmdbId },
      });

      if (!existingMovie) {
        // Create new movie
        const qualityProfileId = collection.qualityProfileId ?? 1;
        await (this.prisma as any).movie?.create({
          data: {
            tmdbId: movie.tmdbId,
            title: movie.title,
            cleanTitle: this.cleanTitle(movie.title),
            sortTitle: movie.title.toLowerCase(),
            year: movie.year,
            overview: movie.overview ?? null,
            posterPath: movie.posterPath ?? null,
            status: 'released',
            monitored: collection.monitored,
            qualityProfileId,
            collectionId: collection.id,
          },
        });
        added++;
      } else if (!existingMovie.collectionId) {
        // Link existing movie to collection
        await (this.prisma as any).movie?.update({
          where: { id: existingMovie.id },
          data: { collectionId: collection.id },
        });
        updated++;
      }
    }

    return { added, updated };
  }

  async searchMissingMovies(collectionId: number): Promise<SearchMissingResult> {
    const collection = await (this.prisma as any).collection?.findUnique({
      where: { id: collectionId },
      include: {
        movies: {
          include: {
            fileVariants: true,
          },
        },
      },
    });

    if (!collection) {
      throw new NotFoundError(`Collection ${collectionId} not found`);
    }

    // Find movies without files
    const missingMovies = collection.movies.filter(
      (movie: any) => movie.monitored && movie.fileVariants.length === 0
    );

    // In a full implementation, this would trigger searches via MediaSearchService
    // For now, we just return the count of movies that need searching
    return {
      searched: missingMovies.length,
      missing: missingMovies.length,
    };
  }

  private parseYear(releaseDate?: string): number | undefined {
    if (!releaseDate) {
      return undefined;
    }

    const year = parseInt(String(releaseDate).slice(0, 4), 10);
    return Number.isFinite(year) ? year : undefined;
  }

  private cleanTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
}
