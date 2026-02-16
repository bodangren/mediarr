import type { Blocklist, Prisma, PrismaClient } from '@prisma/client';

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

type BlocklistFilterInput = Omit<QueryBlocklistInput, 'page' | 'pageSize' | 'sortBy' | 'sortDir'>;

/**
 * Persists and queries blocklist records for blocked releases.
 */
export class BlocklistRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private buildWhere(input: BlocklistFilterInput): Prisma.BlocklistWhereInput {
    const where: Prisma.BlocklistWhereInput = {};
    if (input.seriesId !== undefined) {
      where.seriesId = input.seriesId;
    }
    return where;
  }

  async create(input: CreateBlocklistInput): Promise<Blocklist> {
    const data: Prisma.BlocklistCreateInput = {
      seriesTitle: input.seriesTitle,
      releaseTitle: input.releaseTitle,
      reason: input.reason,
    };

    if (input.seriesId !== undefined && input.seriesId !== null) {
      data.seriesId = input.seriesId;
    }
    if (input.episodeId !== undefined && input.episodeId !== null) {
      data.episodeId = input.episodeId;
    }
    if (input.seasonNumber !== undefined && input.seasonNumber !== null) {
      data.seasonNumber = input.seasonNumber;
    }
    if (input.episodeNumber !== undefined && input.episodeNumber !== null) {
      data.episodeNumber = input.episodeNumber;
    }
    if (input.quality !== undefined && input.quality !== null) {
      data.quality = input.quality;
    }
    if (input.indexer !== undefined && input.indexer !== null) {
      data.indexer = input.indexer;
    }
    if (input.size !== undefined && input.size !== null) {
      data.size = input.size;
    }
    if (input.dateBlocked !== undefined) {
      data.dateBlocked = input.dateBlocked;
    }

    return this.prisma.blocklist.create({ data });
  }

  async query(input: QueryBlocklistInput): Promise<QueryBlocklistResult> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const pageSize = input.pageSize && input.pageSize > 0 ? input.pageSize : 25;
    const where = this.buildWhere(input);

    const sortBy = input.sortBy ?? 'dateBlocked';
    const sortDir = input.sortDir ?? 'desc';

    const orderBy: Prisma.BlocklistOrderByWithRelationInput = {
      [sortBy]: sortDir,
    };

    const [items, total] = await Promise.all([
      this.prisma.blocklist.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.blocklist.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async findById(id: number): Promise<Blocklist | null> {
    return this.prisma.blocklist.findUnique({
      where: { id },
    });
  }

  async deleteById(id: number): Promise<Blocklist | null> {
    try {
      return await this.prisma.blocklist.delete({
        where: { id },
      });
    } catch {
      return null;
    }
  }

  async deleteByIds(ids: number[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const result = await this.prisma.blocklist.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return result.count;
  }

  async clear(): Promise<number> {
    const result = await this.prisma.blocklist.deleteMany();
    return result.count;
  }
}
