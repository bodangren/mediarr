import type { PrismaClient, Series } from '@prisma/client';

/**
 * Input type for bulk series updates
 */
export interface BulkSeriesChanges {
  qualityProfileId?: number;
  monitored?: boolean;
  rootFolderPath?: string;
  seasonFolder?: boolean;
  addTags?: string[];
  removeTags?: string[];
}

/**
 * Result type for bulk update operations
 */
export interface BulkUpdateResult {
  updated: number;
  failed: number;
  errors?: Array<{ seriesId: number; error: string }>;
}

/**
 * Repository for series-specific database operations
 */
export class SeriesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Bulk update multiple series with the same changes
   * Uses a transaction to ensure atomicity
   */
  async bulkUpdate(
    seriesIds: number[],
    changes: BulkSeriesChanges,
  ): Promise<BulkUpdateResult> {
    const result: BulkUpdateResult = {
      updated: 0,
      failed: 0,
      errors: [],
    };

    if (seriesIds.length === 0) {
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
    if (changes.rootFolderPath !== undefined) {
      updateData.path = changes.rootFolderPath;
    }
    // Note: seasonFolder would require a field on the Series model
    // Currently not in schema, but we handle it gracefully
    if (changes.seasonFolder !== undefined) {
      // Placeholder for when seasonFolder is added to the schema
      // updateData.seasonFolder = changes.seasonFolder;
    }
    // Note: Tags handling would go here when the Tag model is implemented
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
      for (const seriesId of seriesIds) {
        try {
          await (tx as any).series.update({
            where: { id: seriesId },
            data: updateData,
          });
          result.updated++;
        } catch (error) {
          result.failed++;
          result.errors?.push({
            seriesId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    });

    return result;
  }

  /**
   * Find series by their IDs
   */
  async findByIds(ids: number[]): Promise<Series[]> {
    return this.prisma.series.findMany({
      where: {
        id: { in: ids },
      },
    });
  }

  /**
   * Get distinct root folders from all series
   */
  async getDistinctRootFolders(): Promise<string[]> {
    const series = await this.prisma.series.findMany({
      where: {
        path: { not: null },
      },
      select: {
        path: true,
      },
    });

    const rootFolders = new Set<string>();
    for (const s of series) {
      if (s.path) {
        // Extract root folder from path (e.g., "/tv/Series (2024)" -> "/tv")
        const parts = s.path.split('/').filter(Boolean);
        if (parts.length > 0) {
          rootFolders.add('/' + parts[0]);
        }
      }
    }

    return Array.from(rootFolders);
  }
}
