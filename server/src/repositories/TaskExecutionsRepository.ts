import { and, desc, eq, ne, sql, type SQL } from 'drizzle-orm';
import type { DatabaseClient } from '../db/drizzleClient';
import * as schema from '../db/schema';

export type TaskExecutionStatus = typeof schema.TaskExecutionStatusEnum[number];
export type TaskExecutionRecord = typeof schema.taskExecutions.$inferSelect;

export interface CreateTaskExecutionInput {
  taskName: string;
  startedAt: Date;
  status: string;
  completedAt?: Date | null;
  durationMs?: number | null;
  errorMessage?: string | null;
}

export interface UpdateTaskExecutionInput {
  status: string;
  completedAt: Date;
  durationMs: number;
  errorMessage: string | null;
}

export interface QueryTaskExecutionsInput {
  page: number;
  pageSize: number;
  status?: string;
  taskName?: string;
}

export interface QueryTaskExecutionsResult {
  items: TaskExecutionRecord[];
  total: number;
  page: number;
  pageSize: number;
}

function parseStatus(status: string): TaskExecutionStatus {
  const normalized = status.toUpperCase();
  if (schema.TaskExecutionStatusEnum.includes(normalized as TaskExecutionStatus)) {
    return normalized as TaskExecutionStatus;
  }
  throw new Error(`Unsupported task execution status "${status}"`);
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, character => `\\${character}`);
}

function buildWhere(input: Pick<QueryTaskExecutionsInput, 'status' | 'taskName'>): SQL | undefined {
  const conditions: SQL[] = [];
  if (input.status) {
    conditions.push(eq(schema.taskExecutions.status, parseStatus(input.status)));
  } else {
    // This repository backs history surfaces. Running executions are exposed
    // separately through the queue endpoint and are not completed history.
    conditions.push(ne(schema.taskExecutions.status, 'RUNNING'));
  }
  if (input.taskName?.trim()) {
    const pattern = `%${escapeLike(input.taskName.trim())}%`;
    conditions.push(sql`${schema.taskExecutions.taskName} LIKE ${pattern} ESCAPE '\\'`);
  }
  return conditions.length === 1 ? conditions[0] : and(...conditions);
}

/** Persistence boundary shared by Scheduler and task API routes. */
export class TaskExecutionsRepository {
  constructor(private readonly prisma: DatabaseClient) {}

  async create(input: CreateTaskExecutionInput): Promise<TaskExecutionRecord> {
    const [row] = await this.prisma.drizzle
      .insert(schema.taskExecutions)
      .values({
        taskName: input.taskName,
        startedAt: input.startedAt,
        status: parseStatus(input.status),
        completedAt: input.completedAt ?? null,
        durationMs: input.durationMs ?? null,
        errorMessage: input.errorMessage ?? null,
      })
      .returning();
    if (!row) {
      throw new Error('TaskExecutionsRepository.create: returned no row');
    }
    return row;
  }

  async update(id: number, input: UpdateTaskExecutionInput): Promise<void> {
    await this.prisma.drizzle
      .update(schema.taskExecutions)
      .set({
        status: parseStatus(input.status),
        completedAt: input.completedAt,
        durationMs: input.durationMs,
        errorMessage: input.errorMessage,
      })
      .where(eq(schema.taskExecutions.id, id));
  }

  async query(input: QueryTaskExecutionsInput): Promise<QueryTaskExecutionsResult> {
    const page = Number.isInteger(input.page) && input.page > 0 ? input.page : 1;
    const pageSize = Number.isInteger(input.pageSize) && input.pageSize > 0 ? input.pageSize : 25;
    const where = buildWhere(input);
    const [items, countRows] = await Promise.all([
      this.prisma.drizzle
        .select()
        .from(schema.taskExecutions)
        .where(where)
        .orderBy(desc(schema.taskExecutions.startedAt), desc(schema.taskExecutions.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.prisma.drizzle
        .select({ count: sql<number>`count(*)` })
        .from(schema.taskExecutions)
        .where(where),
    ]);
    return {
      items,
      total: Number(countRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async findById(id: number): Promise<TaskExecutionRecord | null> {
    const [row] = await this.prisma.drizzle
      .select()
      .from(schema.taskExecutions)
      .where(eq(schema.taskExecutions.id, id))
      .limit(1);
    return row ?? null;
  }

  async prune(taskName: string, retainCount: number): Promise<number> {
    if (retainCount <= 0) {
      const deleted = await this.prisma.drizzle
        .delete(schema.taskExecutions)
        .where(eq(schema.taskExecutions.taskName, taskName))
        .returning({ id: schema.taskExecutions.id });
      return deleted.length;
    }
    const [cutoff] = await this.prisma.drizzle
      .select({ id: schema.taskExecutions.id })
      .from(schema.taskExecutions)
      .where(eq(schema.taskExecutions.taskName, taskName))
      .orderBy(desc(schema.taskExecutions.id))
      .limit(1)
      .offset(retainCount - 1);
    if (!cutoff) return 0;

    const deleted = await this.prisma.drizzle
      .delete(schema.taskExecutions)
      .where(sql`${schema.taskExecutions.taskName} = ${taskName} AND ${schema.taskExecutions.id} < ${cutoff.id}`)
      .returning({ id: schema.taskExecutions.id });
    return deleted.length;
  }
}
