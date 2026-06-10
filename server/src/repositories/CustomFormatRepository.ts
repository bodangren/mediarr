import { and, asc, eq, ne } from 'drizzle-orm';
import type { DatabaseClient } from '../db/drizzleClient';
import * as schema from '../db/schema';
import type { CustomFormat, CustomFormatScore } from '../types/modelTypes';

// Condition types for custom format evaluation
export type ConditionType = 'regex' | 'size' | 'language' | 'indexerFlag' | 'releaseGroup' | 'source' | 'resolution' | 'qualityModifier';
export type ConditionOperator = 'equals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'regex' | 'notRegex';
export type ConditionField = 'title' | 'size' | 'language' | 'releaseGroup' | 'source' | 'resolution';

export interface CustomFormatCondition {
  type: ConditionType;
  field?: ConditionField;
  operator?: ConditionOperator;
  value: string | number;
  negate?: boolean;
  required?: boolean;
}

export interface CustomFormatWithScores extends Omit<CustomFormat, 'conditions' | 'scores'> {
  conditions: CustomFormatCondition[];
  scores: Array<{
    id: number;
    qualityProfileId: number;
    score: number;
  }>;
}

export interface CreateCustomFormatData {
  name: string;
  includeCustomFormatWhenRenaming?: boolean;
  conditions: CustomFormatCondition[];
  scores?: Array<{
    qualityProfileId: number;
    score: number;
  }>;
}

export interface UpdateCustomFormatData {
  name?: string;
  includeCustomFormatWhenRenaming?: boolean;
  conditions?: CustomFormatCondition[];
  scores?: Array<{
    qualityProfileId: number;
    score: number;
  }>;
}

function parseConditions(conditions: unknown): CustomFormatCondition[] {
  if (!Array.isArray(conditions)) return [];
  return conditions as CustomFormatCondition[];
}

export class CustomFormatRepository {
  constructor(private prisma: DatabaseClient) {}

  async findAll(): Promise<CustomFormatWithScores[]> {
    const formats = await this.prisma.drizzle
      .select()
      .from(schema.customFormats)
      .orderBy(asc(schema.customFormats.name));

    const result: CustomFormatWithScores[] = [];
    for (const format of formats) {
      const scores = await this.loadScores(format.id);
      result.push(this.toCustomFormatWithScores(format as CustomFormat, scores));
    }
    return result;
  }

  async findById(id: number): Promise<CustomFormatWithScores | null> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.customFormats)
      .where(eq(schema.customFormats.id, id))
      .limit(1);
    const format = rows[0];
    if (!format) return null;
    const scores = await this.loadScores(id);
    return this.toCustomFormatWithScores(format as CustomFormat, scores);
  }

  async findByName(name: string): Promise<CustomFormatWithScores | null> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.customFormats)
      .where(eq(schema.customFormats.name, name))
      .limit(1);
    const format = rows[0];
    if (!format) return null;
    const scores = await this.loadScores(format.id);
    return this.toCustomFormatWithScores(format as CustomFormat, scores);
  }

  async create(data: CreateCustomFormatData): Promise<CustomFormatWithScores> {
    const [row] = await this.prisma.drizzle
      .insert(schema.customFormats)
      .values({
        name: data.name,
        includeCustomFormatWhenRenaming: data.includeCustomFormatWhenRenaming ?? false,
        conditions: data.conditions,
      })
      .returning();
    if (!row) {
      throw new Error('CustomFormatRepository.create: returned no row');
    }

    if (data.scores && data.scores.length > 0) {
      await this.prisma.drizzle.insert(schema.customFormatScores).values(
        data.scores.map((score) => ({
          customFormatId: row.id,
          qualityProfileId: score.qualityProfileId,
          score: score.score,
        })),
      );
    }

    const scores = await this.loadScores(row.id);
    return this.toCustomFormatWithScores(row as CustomFormat, scores);
  }

  async update(id: number, data: UpdateCustomFormatData): Promise<CustomFormatWithScores> {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.includeCustomFormatWhenRenaming !== undefined) {
      updateData.includeCustomFormatWhenRenaming = data.includeCustomFormatWhenRenaming;
    }
    if (data.conditions !== undefined) updateData.conditions = data.conditions;

    if (Object.keys(updateData).length > 0) {
      await this.prisma.drizzle
        .update(schema.customFormats)
        .set(updateData)
        .where(eq(schema.customFormats.id, id));
    }

    if (data.scores !== undefined) {
      await this.prisma.drizzle
        .delete(schema.customFormatScores)
        .where(eq(schema.customFormatScores.customFormatId, id));

      if (data.scores.length > 0) {
        await this.prisma.drizzle.insert(schema.customFormatScores).values(
          data.scores.map((score) => ({
            customFormatId: id,
            qualityProfileId: score.qualityProfileId,
            score: score.score,
          })),
        );
      }
    }

    const updatedRows = await this.prisma.drizzle
      .select()
      .from(schema.customFormats)
      .where(eq(schema.customFormats.id, id))
      .limit(1);
    const updated = updatedRows[0];
    if (!updated) {
      throw new Error(`CustomFormatRepository.update: format ${id} not found`);
    }
    const scores = await this.loadScores(id);
    return this.toCustomFormatWithScores(updated as CustomFormat, scores);
  }

  async delete(id: number): Promise<CustomFormatWithScores> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.customFormats)
      .where(eq(schema.customFormats.id, id))
      .limit(1);
    const format = rows[0];
    if (!format) {
      throw new Error(`CustomFormat with id ${id} not found`);
    }

    // Delete scores first to avoid FK constraint issues
    await this.prisma.drizzle
      .delete(schema.customFormatScores)
      .where(eq(schema.customFormatScores.customFormatId, id));

    await this.prisma.drizzle
      .delete(schema.customFormats)
      .where(eq(schema.customFormats.id, id));

    const scores = await this.loadScores(id);
    return this.toCustomFormatWithScores(format as CustomFormat, scores);
  }

  async exists(id: number): Promise<boolean> {
    const rows = await this.prisma.drizzle
      .select({ id: schema.customFormats.id })
      .from(schema.customFormats)
      .where(eq(schema.customFormats.id, id))
      .limit(1);
    return rows.length > 0;
  }

  async nameExists(name: string, excludeId?: number): Promise<boolean> {
    const where = excludeId
      ? and(eq(schema.customFormats.name, name), ne(schema.customFormats.id, excludeId))
      : eq(schema.customFormats.name, name);
    const rows = await this.prisma.drizzle
      .select({ id: schema.customFormats.id })
      .from(schema.customFormats)
      .where(where)
      .limit(1);
    return rows.length > 0;
  }

  async findByQualityProfileId(qualityProfileId: number): Promise<Array<{
    customFormat: CustomFormatWithScores;
    score: number;
  }>> {
    const scoreRows = await this.prisma.drizzle
      .select()
      .from(schema.customFormatScores)
      .where(eq(schema.customFormatScores.qualityProfileId, qualityProfileId));

    const result: Array<{ customFormat: CustomFormatWithScores; score: number }> = [];
    for (const scoreRow of scoreRows) {
      const formatRows = await this.prisma.drizzle
        .select()
        .from(schema.customFormats)
        .where(eq(schema.customFormats.id, scoreRow.customFormatId))
        .limit(1);
      const format = formatRows[0];
      if (!format) continue;
      const scores = await this.loadScores(format.id);
      result.push({
        customFormat: this.toCustomFormatWithScores(format as CustomFormat, scores),
        score: scoreRow.score,
      });
    }
    return result;
  }

  private async loadScores(customFormatId: number): Promise<CustomFormatScore[]> {
    return this.prisma.drizzle
      .select()
      .from(schema.customFormatScores)
      .where(eq(schema.customFormatScores.customFormatId, customFormatId)) as unknown as Promise<CustomFormatScore[]>;
  }

  private toCustomFormatWithScores(
    format: CustomFormat,
    scores: CustomFormatScore[],
  ): CustomFormatWithScores {
    return {
      id: format.id,
      name: format.name,
      includeCustomFormatWhenRenaming: format.includeCustomFormatWhenRenaming,
      conditions: parseConditions((format as { conditions?: unknown }).conditions),
      createdAt: format.createdAt,
      updatedAt: format.updatedAt,
      scores: scores.map((score) => ({
        id: score.id,
        qualityProfileId: score.qualityProfileId,
        score: score.score,
      })),
    };
  }
}