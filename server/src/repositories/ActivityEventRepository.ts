import type {
  ActivityEvent,
  Prisma,
  PrismaClient,
} from '@prisma/client';

export interface CreateActivityEventInput {
  eventType: string;
  sourceModule: string;
  entityRef?: string;
  summary: string;
  success: boolean;
  details?: unknown;
  occurredAt?: Date;
}

export interface QueryActivityEventsInput {
  eventType?: string;
  sourceModule?: string;
  entityRef?: string;
  success?: boolean;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export interface QueryActivityEventsResult {
  items: ActivityEvent[];
  total: number;
  page: number;
  pageSize: number;
}

type ActivityEventFilterInput = Omit<QueryActivityEventsInput, 'page' | 'pageSize'>;

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

/**
 * Persists and queries cross-module activity event records.
 */
export class ActivityEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private buildWhere(input: ActivityEventFilterInput): Prisma.ActivityEventWhereInput {
    const occurredAt: Prisma.DateTimeFilter = {};
    if (input.from) {
      occurredAt.gte = input.from;
    }
    if (input.to) {
      occurredAt.lte = input.to;
    }

    return {
      eventType: input.eventType,
      sourceModule: input.sourceModule,
      entityRef: input.entityRef,
      success: input.success,
      occurredAt: Object.keys(occurredAt).length > 0 ? occurredAt : undefined,
    };
  }

  async create(input: CreateActivityEventInput): Promise<ActivityEvent> {
    return this.prisma.activityEvent.create({
      data: {
        eventType: input.eventType,
        sourceModule: input.sourceModule,
        entityRef: input.entityRef,
        summary: input.summary,
        success: input.success,
        details: input.details === undefined ? undefined : toJson(input.details),
        occurredAt: input.occurredAt,
      },
    });
  }

  async query(input: QueryActivityEventsInput): Promise<QueryActivityEventsResult> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const pageSize = input.pageSize && input.pageSize > 0 ? input.pageSize : 25;
    const where = this.buildWhere(input);

    const [items, total] = await Promise.all([
      this.prisma.activityEvent.findMany({
        where,
        orderBy: {
          occurredAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.activityEvent.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async cleanupOldEvents(
    retentionDays: number,
    now: Date = new Date(),
  ): Promise<number> {
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    const threshold = new Date(now.getTime() - retentionMs);

    const result = await this.prisma.activityEvent.deleteMany({
      where: {
        occurredAt: {
          lt: threshold,
        },
      },
    });

    return result.count;
  }

  async clear(input: ActivityEventFilterInput = {}): Promise<number> {
    const where = this.buildWhere(input);
    const result = await this.prisma.activityEvent.deleteMany({ where });
    return result.count;
  }

  async markAsFailed(id: number): Promise<ActivityEvent | null> {
    const result = await this.prisma.activityEvent.updateMany({
      where: { id },
      data: {
        success: false,
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.prisma.activityEvent.findUnique({
      where: { id },
    });
  }

  async export(input: ActivityEventFilterInput = {}): Promise<ActivityEvent[]> {
    const where = this.buildWhere(input);

    return this.prisma.activityEvent.findMany({
      where,
      orderBy: {
        occurredAt: 'desc',
      },
    });
  }
}
