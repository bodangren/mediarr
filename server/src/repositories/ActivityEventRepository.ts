import type {
  ActivityEvent,
  ActivityEventType,
  Prisma,
  PrismaClient,
} from '@prisma/client';

export interface CreateActivityEventInput {
  eventType: ActivityEventType;
  sourceModule: string;
  entityRef?: string;
  summary: string;
  success: boolean;
  details?: unknown;
  occurredAt?: Date;
}

export interface QueryActivityEventsInput {
  eventType?: ActivityEventType;
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

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

/**
 * Persists and queries cross-module activity event records.
 */
export class ActivityEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

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

    const where: Prisma.ActivityEventWhereInput = {
      eventType: input.eventType,
      sourceModule: input.sourceModule,
      entityRef: input.entityRef,
      success: input.success,
      occurredAt: {
        gte: input.from,
        lte: input.to,
      },
    };

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
}
