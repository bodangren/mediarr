import type { PrismaClient, Collection, Movie, Prisma } from '@prisma/client';

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
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<CollectionWithCounts[]> {
    const collections = await this.prisma.collection.findMany({
      include: {
        _count: {
          select: { movies: true },
        },
        movies: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return collections.map(collection => ({
      ...collection,
      movieCount: collection._count.movies,
      moviesInLibrary: collection.movies.length,
    }));
  }

  async findById(id: number): Promise<CollectionWithMovies | null> {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      include: {
        qualityProfile: {
          select: {
            id: true,
            name: true,
          },
        },
        movies: {
          select: {
            id: true,
            tmdbId: true,
            title: true,
            year: true,
            overview: true,
            posterUrl: true,
            status: true,
            monitored: true,
            fileVariants: {
              select: {
                quality: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!collection) return null;

    return {
      ...collection,
      movies: (collection as any).movies.map((movie: any) => ({
        id: movie.id,
        tmdbId: movie.tmdbId,
        title: movie.title,
        year: movie.year,
        overview: movie.overview,
        posterPath: (movie as any).posterUrl ?? null,
        status: movie.status,
        monitored: movie.monitored,
        hasFiles: movie.fileVariants.length > 0,
        quality: movie.fileVariants[0]?.quality ?? null,
      })),
    };
  }

  async findByTmdbCollectionId(tmdbCollectionId: number): Promise<Collection | null> {
    return this.prisma.collection.findUnique({
      where: { tmdbCollectionId },
    });
  }

  async create(data: CreateCollectionData): Promise<Collection> {
    const createData: Prisma.CollectionCreateInput = {
      tmdbCollectionId: data.tmdbCollectionId,
      name: data.name,
      overview: data.overview ?? null,
      posterPath: data.posterPath ?? null,
      backdropPath: data.backdropPath ?? null,
      monitored: data.monitored ?? false,
      rootFolderPath: data.rootFolderPath ?? null,
      addMoviesAutomatically: data.addMoviesAutomatically ?? false,
      searchOnAdd: data.searchOnAdd ?? false,
      minimumAvailability: data.minimumAvailability ?? 'released',
    };

    if (data.qualityProfileId !== undefined && data.qualityProfileId !== null) {
      createData.qualityProfile = {
        connect: { id: data.qualityProfileId },
      };
    }

    return this.prisma.collection.create({
      data: createData,
    });
  }

  async update(id: number, data: UpdateCollectionData): Promise<Collection> {
    const updateData: Prisma.CollectionUpdateInput = {};

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
      if (data.qualityProfileId === null) {
        updateData.qualityProfile = { disconnect: true };
      } else {
        updateData.qualityProfile = { connect: { id: data.qualityProfileId } };
      }
    }

    return this.prisma.collection.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: number): Promise<Collection> {
    // First, remove collectionId from all movies in this collection
    await this.prisma.movie.updateMany({
      where: { collectionId: id },
      data: { collectionId: null },
    });

    return this.prisma.collection.delete({
      where: { id },
    });
  }

  async getMovieCount(collectionId: number): Promise<number> {
    return this.prisma.movie.count({
      where: { collectionId },
    });
  }

  async getInLibraryCount(collectionId: number): Promise<number> {
    const movies = await this.prisma.movie.findMany({
      where: { collectionId },
      include: {
        _count: {
          select: { fileVariants: true },
        },
      },
    });

    return movies.filter(movie => movie._count.fileVariants > 0).length;
  }

  async exists(id: number): Promise<boolean> {
    const count = await this.prisma.collection.count({
      where: { id },
    });
    return count > 0;
  }

  async existsByTmdbId(tmdbCollectionId: number): Promise<boolean> {
    const count = await this.prisma.collection.count({
      where: { tmdbCollectionId },
    });
    return count > 0;
  }
}
