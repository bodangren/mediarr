import type { PrismaClient, Movie } from '@prisma/client';

/**
 * Input type for bulk movie updates
 */
export interface BulkMovieChanges {
  qualityProfileId?: number;
  monitored?: boolean;
  minimumAvailability?: string;
  path?: string;
  addTags?: string[];
  removeTags?: string[];
}

/**
 * Result type for bulk update operations
 */
export interface BulkUpdateResult {
  updated: number;
  failed: number;
  errors?: Array<{ movieId: number; error: string }>;
}

/**
 * Repository for movie-specific database operations
 */
export class MovieRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Bulk update multiple movies with the same changes
   * Uses a transaction to ensure atomicity
   */
  async bulkUpdate(
    movieIds: number[],
    changes: BulkMovieChanges,
  ): Promise<BulkUpdateResult> {
    const result: BulkUpdateResult = {
      updated: 0,
      failed: 0,
      errors: [],
    };

    if (movieIds.length === 0) {
      return result;
    }

    // Build the update data object (only include defined fields)
    const updateData: Record<string, unknown> = {};
    
    if (changes.qualityProfileId !== undefined) {
      updateData.qualityProfileId = changes.qualityProfileId;
    }
    if (changes.monitored !== undefined) {
      updateData.monitored = changes.monitored;
    }
    if (changes.minimumAvailability !== undefined) {
      updateData.minimumAvailability = changes.minimumAvailability;
    }
    if (changes.path !== undefined) {
      updateData.path = changes.path;
    }
    // Note: Tags handling would go here when the Tag model is implemented
    // For now, we store tags in a JSON field if it exists
    if (changes.addTags !== undefined || changes.removeTags !== undefined) {
      // Tags not yet implemented in the schema
      // This is a placeholder for when tags are added
    }

    // If no changes to apply, return early
    if (Object.keys(updateData).length === 0) {
      return result;
    }

    // Execute updates within a transaction
    await this.prisma.$transaction(async (tx) => {
      for (const movieId of movieIds) {
        try {
          await (tx as any).movie.update({
            where: { id: movieId },
            data: updateData,
          });
          result.updated++;
        } catch (error) {
          result.failed++;
          result.errors?.push({
            movieId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    });

    return result;
  }

  /**
   * Find movies by their IDs
   */
  async findByIds(ids: number[]): Promise<Movie[]> {
    return this.prisma.movie.findMany({
      where: {
        id: { in: ids },
      },
    });
  }

  /**
   * Get distinct root folders from all movies
   */
  async getDistinctRootFolders(): Promise<string[]> {
    const movies = await this.prisma.movie.findMany({
      where: {
        path: { not: null },
      },
      select: {
        path: true,
      },
    });

    const rootFolders = new Set<string>();
    for (const movie of movies) {
      if (movie.path) {
        // Extract root folder from path (e.g., "/movies/Movie (2024)" -> "/movies")
        const parts = movie.path.split('/').filter(Boolean);
        if (parts.length > 0) {
          rootFolders.add('/' + parts[0]);
        }
      }
    }

    return Array.from(rootFolders);
  }
}
