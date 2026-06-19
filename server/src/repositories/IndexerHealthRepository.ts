import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { DatabaseClient } from '../db/drizzleClient';
import * as schema from '../db/schema';
import type { IndexerHealthSnapshot } from '../types/modelTypes';

export interface ThresholdContext {
  threshold: number;
  failureCount: number;
  isCritical: boolean;
  shouldAutoDisable: boolean;
}

export interface SnapshotWithThreshold {
  snapshot: IndexerHealthSnapshot | null;
  thresholdContext: ThresholdContext;
}

/**
 * Stores per-indexer sync health snapshots.
 */
export class IndexerHealthRepository {
  constructor(private readonly prisma: DatabaseClient) {}

  async getByIndexerId(indexerId: number): Promise<IndexerHealthSnapshot | null> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.indexerHealthSnapshots)
      .where(eq(schema.indexerHealthSnapshots.indexerId, indexerId))
      .limit(1);
    return (rows[0] as IndexerHealthSnapshot | undefined) ?? null;
  }

  async getByIndexerIdWithThresholdContext(
    indexerId: number,
    options: { autoDisableThreshold: number },
  ): Promise<SnapshotWithThreshold> {
    const snapshot = await this.getByIndexerId(indexerId);
    const failureCount = snapshot?.failureCount ?? 0;
    const isCritical = failureCount >= options.autoDisableThreshold;

    return {
      snapshot,
      thresholdContext: {
        threshold: options.autoDisableThreshold,
        failureCount,
        isCritical,
        shouldAutoDisable: isCritical,
      },
    };
  }

  async list(): Promise<IndexerHealthSnapshot[]> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.indexerHealthSnapshots);
    return rows as IndexerHealthSnapshot[];
  }

  async disable(indexerId: number): Promise<void> {
    await this.prisma.drizzle
      .update(schema.indexers)
      .set({ enabled: false })
      .where(eq(schema.indexers.id, indexerId));
  }

  async recordSuccess(
    indexerId: number,
    at: Date = new Date(),
  ): Promise<IndexerHealthSnapshot> {
    const [row] = await this.prisma.drizzle
      .insert(schema.indexerHealthSnapshots)
      .values({
        indexerId,
        lastSuccessAt: at,
        failureCount: 0,
        lastErrorMessage: null,
      })
      .onConflictDoUpdate({
        target: schema.indexerHealthSnapshots.indexerId,
        set: {
          lastSuccessAt: at,
          failureCount: 0,
          lastErrorMessage: null,
        },
      })
      .returning();
    if (!row) {
      throw new Error('IndexerHealthRepository.recordSuccess: returned no row');
    }
    return row as IndexerHealthSnapshot;
  }

  async recordFailure(
    indexerId: number,
    errorMessage: string,
    at: Date = new Date(),
  ): Promise<IndexerHealthSnapshot> {
    const existing = await this.getByIndexerId(indexerId);

    if (!existing) {
      const [row] = await this.prisma.drizzle
        .insert(schema.indexerHealthSnapshots)
        .values({
          indexerId,
          lastFailureAt: at,
          failureCount: 1,
          lastErrorMessage: errorMessage,
        })
        .returning();
      if (!row) {
        throw new Error('IndexerHealthRepository.recordFailure: insert returned no row');
      }
      return row as IndexerHealthSnapshot;
    }

    const rows = await this.prisma.drizzle
      .update(schema.indexerHealthSnapshots)
      .set({
        lastFailureAt: at,
        failureCount: sql`${schema.indexerHealthSnapshots.failureCount} + 1`,
        lastErrorMessage: errorMessage,
      })
      .where(eq(schema.indexerHealthSnapshots.indexerId, indexerId))
      .returning();
    const updated = rows[0];
    if (!updated) {
      throw new Error('IndexerHealthRepository.recordFailure: update returned no row');
    }
    return updated as IndexerHealthSnapshot;
  }
}