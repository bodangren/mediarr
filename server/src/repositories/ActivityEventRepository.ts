import { and, asc, desc, eq, gte, isNotNull, lt, lte, type SQL } from 'drizzle-orm';
import type { DatabaseClient } from '../db/drizzleClient';
import * as schema from '../db/schema';
import type { ActivityEvent } from '../types/modelTypes';

export interface CreateActivityEventInput {
  eventType: string;
  sourceModule: string;
  entityRef?: string | undefined;
  summary: string;
  success: boolean;
  details?: unknown;
  occurredAt?: Date | undefined;
}

export interface QueryActivityEventsInput {
  eventType?: string | undefined;
  sourceModule?: string | undefined;
  entityRef?: string | undefined;
  success?: boolean | undefined;
  from?: Date | undefined;
  to?: Date | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}

export interface QueryActivityEventsResult {
  items: ActivityEvent[];
  total: number;
  page: number;
  pageSize: number;
}

type ActivityEventFilterInput = Omit<QueryActivityEventsInput, 'page' | 'pageSize'>;

function buildWhere(input: ActivityEventFilterInput): SQL | undefined {
  const conditions: SQL[] = [];
  if (input.eventType !== undefined) {
    conditions.push(eq(schema.activityEvents.eventType, input.eventType));
  }
  if (input.sourceModule !== undefined) {
    conditions.push(eq(schema.activityEvents.sourceModule, input.sourceModule));
  }
  if (input.entityRef !== undefined) {
    conditions.push(eq(schema.activityEvents.entityRef, input.entityRef));
  }
  if (input.success !== undefined) {
    conditions.push(eq(schema.activityEvents.success, input.success));
  }
  if (input.from !== undefined) {
    conditions.push(gte(schema.activityEvents.occurredAt, input.from));
  }
  if (input.to !== undefined) {
    conditions.push(lte(schema.activityEvents.occurredAt, input.to));
  }
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

/**
 * Persists and queries cross-module activity event records.
 */
export class ActivityEventRepository {
  constructor(private readonly prisma: DatabaseClient) {}

  async create(input: CreateActivityEventInput): Promise<ActivityEvent> {
    const [row] = await this.prisma.drizzle
      .insert(schema.activityEvents)
      .values({
        eventType: input.eventType,
        sourceModule: input.sourceModule,
        entityRef: input.entityRef ?? null,
        summary: input.summary,
        success: input.success,
        details: input.details as any,
        occurredAt: input.occurredAt ?? new Date(),
      })
      .returning();
    if (!row) {
      throw new Error('ActivityEventRepository.create: returned no row');
    }
    return row as ActivityEvent;
  }

  async query(input: QueryActivityEventsInput): Promise<QueryActivityEventsResult> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const pageSize = input.pageSize && input.pageSize > 0 ? input.pageSize : 25;
    const where = buildWhere(input);

    const [items, totalRows] = await Promise.all([
      this.prisma.drizzle
        .select()
        .from(schema.activityEvents)
        .where(where)
        .orderBy(desc(schema.activityEvents.occurredAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.prisma.drizzle
        .select({ id: schema.activityEvents.id })
        .from(schema.activityEvents)
        .where(where),
    ]);

    return {
      items: items as unknown as ActivityEvent[],
      total: totalRows.length,
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

    const rows = await this.prisma.drizzle
      .delete(schema.activityEvents)
      .where(lt(schema.activityEvents.occurredAt, threshold))
      .returning();
    return rows.length;
  }

  async clear(input: ActivityEventFilterInput = {}): Promise<number> {
    const where = buildWhere(input);
    const rows = await this.prisma.drizzle
      .delete(schema.activityEvents)
      .where(where ?? eq(schema.activityEvents.id, schema.activityEvents.id))
      .returning();
    return rows.length;
  }

  async markAsFailed(id: number): Promise<ActivityEvent | null> {
    const updated = await this.prisma.drizzle
      .update(schema.activityEvents)
      .set({ success: false })
      .where(eq(schema.activityEvents.id, id))
      .returning();
    if (updated.length === 0) return null;

    const rows = await this.prisma.drizzle
      .select()
      .from(schema.activityEvents)
      .where(eq(schema.activityEvents.id, id))
      .limit(1);
    return (rows[0] as ActivityEvent | undefined) ?? null;
  }

  async export(input: ActivityEventFilterInput = {}): Promise<ActivityEvent[]> {
    const where = buildWhere(input);
    return this.prisma.drizzle
      .select()
      .from(schema.activityEvents)
      .where(where)
      .orderBy(desc(schema.activityEvents.occurredAt)) as unknown as Promise<ActivityEvent[]>;
  }
}

// `isNotNull` and `asc` are exported from drizzle-orm; we keep the imports here so
// future query helpers that need them can be added without re-importing.
void isNotNull;
void asc;