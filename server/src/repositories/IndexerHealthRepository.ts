import type { IndexerHealthSnapshot, PrismaClient } from '@prisma/client';

/**
 * Stores per-indexer sync health snapshots.
 */
export class IndexerHealthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getByIndexerId(indexerId: number): Promise<IndexerHealthSnapshot | null> {
    return this.prisma.indexerHealthSnapshot.findUnique({
      where: { indexerId },
    });
  }

  async recordSuccess(
    indexerId: number,
    at: Date = new Date(),
  ): Promise<IndexerHealthSnapshot> {
    return this.prisma.indexerHealthSnapshot.upsert({
      where: { indexerId },
      create: {
        indexerId,
        lastSuccessAt: at,
        failureCount: 0,
        lastErrorMessage: null,
      },
      update: {
        lastSuccessAt: at,
        failureCount: 0,
        lastErrorMessage: null,
      },
    });
  }

  async recordFailure(
    indexerId: number,
    errorMessage: string,
    at: Date = new Date(),
  ): Promise<IndexerHealthSnapshot> {
    const existing = await this.getByIndexerId(indexerId);

    if (!existing) {
      return this.prisma.indexerHealthSnapshot.create({
        data: {
          indexerId,
          lastFailureAt: at,
          failureCount: 1,
          lastErrorMessage: errorMessage,
        },
      });
    }

    return this.prisma.indexerHealthSnapshot.update({
      where: { indexerId },
      data: {
        lastFailureAt: at,
        failureCount: {
          increment: 1,
        },
        lastErrorMessage: errorMessage,
      },
    });
  }
}
