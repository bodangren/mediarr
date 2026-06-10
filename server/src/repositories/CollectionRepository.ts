import { and, asc, eq } from 'drizzle-orm';
import type { DatabaseClient } from '../db/drizzleClient';
import * as schema from '../db/schema';
import type { Collection, Movie } from '../types/modelTypes';

export interface CollectionWithCounts extends Collection {
  movieCount: number;
  moviesInLibrary: number;
}

export interface CollectionWithMovies extends Collection {
  movies: Array<{
    id: number;
    tmdbId: number;
    title: string;
    year: number;
    overview: string | null;
    posterPath: string | null;
    status: string;
    monitored: boolean;
    hasFiles: boolean;
    quality?: string | null;
  }>;
  qualityProfile?: {
    id: number;
    name: string;
  } | null;
}

export interface CreateCollectionData {
  tmdbCollectionId: number;
  name: string;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  monitored?: boolean;
  qualityProfileId?: number | null;
  rootFolderPath?: string | null;
  addMoviesAutomatically?: boolean;
  searchOnAdd?: boolean;
  minimumAvailability?: string;
}

export interface UpdateCollectionData {
  name?: string;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  monitored?: boolean;
  qualityProfileId?: number | null;
  rootFolderPath?: string | null;
  addMoviesAutomatically?: boolean;
  searchOnAdd?: boolean;
  minimumAvailability?: string;
}

export class CollectionRepository {
  constructor(private prisma: DatabaseClient) {}

  async findAll(): Promise<CollectionWithCounts[]> {
    const collectionRows = await this.prisma.drizzle
      .select()
      .from(schema.collections)
      .orderBy(asc(schema.collections.name));

    const counts: Array<{ id: number; total: number; withFiles: number }> = [];
    for (const c of collectionRows) {
      const movieIds = await this.prisma.drizzle
        .select({ id: schema.movies.id })
        .from(schema.movies)
        .where(eq(schema.movies.collectionId, c.id));
      let withFiles = 0;
      for (const m of movieIds) {
        const fileRows = await this.prisma.drizzle
          .select({ id: schema.mediaFileVariants.id })
          .from(schema.mediaFileVariants)
          .where(eq(schema.mediaFileVariants.movieId, m.id))
          .limit(1);
        if (fileRows.length > 0) withFiles += 1;
      }
      counts.push({ id: c.id, total: movieIds.length, withFiles });
    }
    const countMap = new Map(counts.map((c) => [c.id, c]));

    return collectionRows.map((collection) => {
      const c = countMap.get(collection.id) ?? { total: 0, withFiles: 0 };
      return {
        ...collection,
        movieCount: c.total,
        moviesInLibrary: c.withFiles,
      };
    });
  }

  async findById(id: number): Promise<CollectionWithMovies | null> {
    const collectionRows = await this.prisma.drizzle
      .select()
      .from(schema.collections)
      .where(eq(schema.collections.id, id))
      .limit(1);
    const collection = collectionRows[0];
    if (!collection) return null;

    const movieRows = await this.prisma.drizzle
      .select({
        id: schema.movies.id,
        tmdbId: schema.movies.tmdbId,
        title: schema.movies.title,
        year: schema.movies.year,
        overview: schema.movies.overview,
        posterUrl: schema.movies.posterUrl,
        status: schema.movies.status,
        monitored: schema.movies.monitored,
      })
      .from(schema.movies)
      .where(eq(schema.movies.collectionId, id));

    let qualityProfile: { id: number; name: string } | null = null;
    if (collection.qualityProfileId != null) {
      const qpRows = await this.prisma.drizzle
        .select({ id: schema.qualityProfiles.id, name: schema.qualityProfiles.name })
        .from(schema.qualityProfiles)
        .where(eq(schema.qualityProfiles.id, collection.qualityProfileId))
        .limit(1);
      qualityProfile = qpRows[0] ?? null;
    }

    const movies = await Promise.all(movieRows.map(async (movie) => {
      const fileVariants = await this.prisma.drizzle
        .select({ quality: schema.mediaFileVariants.quality })
        .from(schema.mediaFileVariants)
        .where(eq(schema.mediaFileVariants.movieId, movie.id))
        .limit(1);
      return {
        id: movie.id,
        tmdbId: movie.tmdbId,
        title: movie.title,
        year: movie.year,
        overview: movie.overview,
        posterPath: movie.posterUrl ?? null,
        status: movie.status,
        monitored: movie.monitored,
        hasFiles: fileVariants.length > 0,
        quality: fileVariants[0]?.quality ?? null,
      };
    }));

    return {
      ...collection,
      movies,
      qualityProfile,
    };
  }

  async findByTmdbCollectionId(tmdbCollectionId: number): Promise<Collection | null> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.collections)
      .where(eq(schema.collections.tmdbCollectionId, tmdbCollectionId))
      .limit(1);
    return (rows[0] as Collection | undefined) ?? null;
  }

  async create(data: CreateCollectionData): Promise<Collection> {
    const [row] = await this.prisma.drizzle
      .insert(schema.collections)
      .values({
        tmdbCollectionId: data.tmdbCollectionId,
        name: data.name,
        overview: data.overview ?? null,
        posterPath: data.posterPath ?? null,
        backdropPath: data.backdropPath ?? null,
        monitored: data.monitored ?? false,
        qualityProfileId: data.qualityProfileId ?? null,
        rootFolderPath: data.rootFolderPath ?? null,
        addMoviesAutomatically: data.addMoviesAutomatically ?? false,
        searchOnAdd: data.searchOnAdd ?? false,
        minimumAvailability: data.minimumAvailability ?? 'released',
      })
      .returning();
    if (!row) {
      throw new Error('CollectionRepository.create: returned no row');
    }
    return row as Collection;
  }

  async update(id: number, data: UpdateCollectionData): Promise<Collection> {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.overview !== undefined) updateData.overview = data.overview;
    if (data.posterPath !== undefined) updateData.posterPath = data.posterPath;
    if (data.backdropPath !== undefined) updateData.backdropPath = data.backdropPath;
    if (data.monitored !== undefined) updateData.monitored = data.monitored;
    if (data.rootFolderPath !== undefined) updateData.rootFolderPath = data.rootFolderPath;
    if (data.addMoviesAutomatically !== undefined) updateData.addMoviesAutomatically = data.addMoviesAutomatically;
    if (data.searchOnAdd !== undefined) updateData.searchOnAdd = data.searchOnAdd;
    if (data.minimumAvailability !== undefined) updateData.minimumAvailability = data.minimumAvailability;
    if (data.qualityProfileId !== undefined) {
      updateData.qualityProfileId = data.qualityProfileId;
    }

    const rows = await this.prisma.drizzle
      .update(schema.collections)
      .set(updateData)
      .where(eq(schema.collections.id, id))
      .returning();
    const updated = rows[0];
    if (!updated) {
      throw new Error(`CollectionRepository.update: collection ${id} not found`);
    }
    return updated as Collection;
  }

  async delete(id: number): Promise<Collection> {
    // First, remove collectionId from all movies in this collection
    await this.prisma.drizzle
      .update(schema.movies)
      .set({ collectionId: null })
      .where(eq(schema.movies.collectionId, id));

    const rows = await this.prisma.drizzle
      .delete(schema.collections)
      .where(eq(schema.collections.id, id))
      .returning();
    const deleted = rows[0];
    if (!deleted) {
      throw new Error(`CollectionRepository.delete: collection ${id} not found`);
    }
    return deleted as Collection;
  }

  async getMovieCount(collectionId: number): Promise<number> {
    const rows = await this.prisma.drizzle
      .select({ id: schema.movies.id })
      .from(schema.movies)
      .where(eq(schema.movies.collectionId, collectionId));
    return rows.length;
  }

  async getInLibraryCount(collectionId: number): Promise<number> {
    const movieRows = await this.prisma.drizzle
      .select({ id: schema.movies.id })
      .from(schema.movies)
      .where(eq(schema.movies.collectionId, collectionId));

    let count = 0;
    for (const m of movieRows) {
      const fileRows = await this.prisma.drizzle
        .select({ id: schema.mediaFileVariants.id })
        .from(schema.mediaFileVariants)
        .where(eq(schema.mediaFileVariants.movieId, m.id))
        .limit(1);
      if (fileRows.length > 0) count += 1;
    }
    return count;
  }

  async exists(id: number): Promise<boolean> {
    const rows = await this.prisma.drizzle
      .select({ id: schema.collections.id })
      .from(schema.collections)
      .where(eq(schema.collections.id, id))
      .limit(1);
    return rows.length > 0;
  }

  async existsByTmdbId(tmdbCollectionId: number): Promise<boolean> {
    const rows = await this.prisma.drizzle
      .select({ id: schema.collections.id })
      .from(schema.collections)
      .where(eq(schema.collections.tmdbCollectionId, tmdbCollectionId))
      .limit(1);
    return rows.length > 0;
  }
}

void and;