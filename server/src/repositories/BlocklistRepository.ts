import { and, asc, desc, eq, inArray, SQL } from 'drizzle-orm';
import type { DatabaseClient } from '../db/drizzleClient';
import * as schema from '../db/schema';
import type { Blocklist } from '../types/modelTypes';

export interface CreateBlocklistInput {
  seriesId?: number | null;
  seriesTitle: string;
  episodeId?: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  releaseTitle: string;
  quality?: string | null;
  indexer?: string | null;
  size?: bigint | null;
  reason: string;
  dateBlocked?: Date;
}

export interface QueryBlocklistInput {
  seriesId?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface QueryBlocklistResult {
  items: Blocklist[];
  total: number;
  page: number;
  pageSize: number;
}

const SORTABLE: Record<string, Parameters<typeof asc>[0] | Parameters<typeof desc>[0]> = {
  id: schema.blocklists.id,
  seriesId: schema.blocklists.seriesId,
  seriesTitle: schema.blocklists.seriesTitle,
  releaseTitle: schema.blocklists.releaseTitle,
  reason: schema.blocklists.reason,
  dateBlocked: schema.blocklists.dateBlocked,
};

/**
 * Persists and queries blocklist records for blocked releases.
 */
export class BlocklistRepository {
  constructor(private readonly prisma: DatabaseClient) {}

  async create(input: CreateBlocklistInput): Promise<Blocklist> {
    const [row] = await this.prisma.drizzle
      .insert(schema.blocklists)
      .values({
        seriesId: input.seriesId ?? null,
        seriesTitle: input.seriesTitle,
        episodeId: input.episodeId ?? null,
        seasonNumber: input.seasonNumber ?? null,
        episodeNumber: input.episodeNumber ?? null,
        releaseTitle: input.releaseTitle,
        quality: input.quality ?? null,
        indexer: input.indexer ?? null,
        size: input.size != null ? Number(input.size) : null,
        reason: input.reason,
        dateBlocked: input.dateBlocked ?? new Date(),
      })
      .returning();
    if (!row) {
      throw new Error('BlocklistRepository.create: returned no row');
    }
    return row as Blocklist;
  }

  async query(input: QueryBlocklistInput): Promise<QueryBlocklistResult> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const pageSize = input.pageSize && input.pageSize > 0 ? input.pageSize : 25;

    const conditions: SQL[] = [];
    if (input.seriesId !== undefined) {
      conditions.push(eq(schema.blocklists.seriesId, input.seriesId));
    }
    const where = conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

    const sortBy = input.sortBy ?? 'dateBlocked';
    const sortDir = input.sortDir ?? 'desc';
    const sortColumn = SORTABLE[sortBy] ?? schema.blocklists.dateBlocked;
    const orderBy = sortDir === 'asc' ? asc(sortColumn) : desc(sortColumn);

    const [items, totalRows] = await Promise.all([
      this.prisma.drizzle
        .select()
        .from(schema.blocklists)
        .where(where)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.prisma.drizzle
        .select({ id: schema.blocklists.id })
        .from(schema.blocklists)
        .where(where),
    ]);

    return {
      items: items as unknown as Blocklist[],
      total: totalRows.length,
      page,
      pageSize,
    };
  }

  async findById(id: number): Promise<Blocklist | null> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.blocklists)
      .where(eq(schema.blocklists.id, id))
      .limit(1);
    return (rows[0] as Blocklist | undefined) ?? null;
  }

  async deleteById(id: number): Promise<Blocklist | null> {
    const rows = await this.prisma.drizzle
      .delete(schema.blocklists)
      .where(eq(schema.blocklists.id, id))
      .returning();
    return (rows[0] as Blocklist | undefined) ?? null;
  }

  async deleteByIds(ids: number[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const rows = await this.prisma.drizzle
      .delete(schema.blocklists)
      .where(inArray(schema.blocklists.id, ids))
      .returning();
    return rows.length;
  }

  async clear(): Promise<number> {
    const rows = await this.prisma.drizzle.delete(schema.blocklists).returning();
    return rows.length;
  }
}