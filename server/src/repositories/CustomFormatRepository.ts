import type { PrismaClient, CustomFormat, CustomFormatScore, Prisma } from '@prisma/client';

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
  if (!Array.isArray(conditions)) {
    return [];
  }
  return conditions as CustomFormatCondition[];
}

export class CustomFormatRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<CustomFormatWithScores[]> {
    const formats = await this.prisma.customFormat.findMany({
      include: {
        scores: true,
      },
      orderBy: { name: 'asc' },
    });

    return formats.map(format => this.toCustomFormatWithScores(format));
  }

  async findById(id: number): Promise<CustomFormatWithScores | null> {
    const format = await this.prisma.customFormat.findUnique({
      where: { id },
      include: {
        scores: true,
      },
    });

    if (!format) return null;

    return this.toCustomFormatWithScores(format);
  }

  async findByName(name: string): Promise<CustomFormatWithScores | null> {
    const format = await this.prisma.customFormat.findUnique({
      where: { name },
      include: {
        scores: true,
      },
    });

    if (!format) return null;

    return this.toCustomFormatWithScores(format);
  }

  async create(data: CreateCustomFormatData): Promise<CustomFormatWithScores> {
    const format = await this.prisma.customFormat.create({
      data: {
        name: data.name,
        includeCustomFormatWhenRenaming: data.includeCustomFormatWhenRenaming ?? false,
        conditions: data.conditions as unknown as Prisma.InputJsonValue,
      },
    });

    // Create scores if provided
    if (data.scores && data.scores.length > 0) {
      await this.prisma.customFormatScore.createMany({
        data: data.scores.map(score => ({
          customFormatId: format.id,
          qualityProfileId: score.qualityProfileId,
          score: score.score,
        })),
        skipDuplicates: true,
      } as any);
    }

    // Fetch with scores
    const created = await this.prisma.customFormat.findUnique({
      where: { id: format.id },
      include: { scores: true },
    });

    return this.toCustomFormatWithScores(created!);
  }

  async update(id: number, data: UpdateCustomFormatData): Promise<CustomFormatWithScores> {
    const updateData: Prisma.CustomFormatUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.includeCustomFormatWhenRenaming !== undefined) {
      updateData.includeCustomFormatWhenRenaming = data.includeCustomFormatWhenRenaming;
    }
    if (data.conditions !== undefined) {
      updateData.conditions = data.conditions as unknown as Prisma.InputJsonValue;
    }

    // Update format first
    await this.prisma.customFormat.update({
      where: { id },
      data: updateData,
    });

    // Update scores if provided
    if (data.scores !== undefined) {
      // Delete existing scores
      await this.prisma.customFormatScore.deleteMany({
        where: { customFormatId: id },
      });

      // Create new scores
      if (data.scores.length > 0) {
        await this.prisma.customFormatScore.createMany({
          data: data.scores.map(score => ({
            customFormatId: id,
            qualityProfileId: score.qualityProfileId,
            score: score.score,
          })),
          skipDuplicates: true,
        } as any);
      }
    }

    // Fetch updated with scores
    const updated = await this.prisma.customFormat.findUnique({
      where: { id },
      include: { scores: true },
    });

    return this.toCustomFormatWithScores(updated!);
  }

  async delete(id: number): Promise<CustomFormatWithScores> {
    // Fetch before delete
    const format = await this.prisma.customFormat.findUnique({
      where: { id },
      include: { scores: true },
    });

    if (!format) {
      throw new Error(`CustomFormat with id ${id} not found`);
    }

    // Delete (cascade handles scores)
    await this.prisma.customFormat.delete({
      where: { id },
    });

    return this.toCustomFormatWithScores(format);
  }

  async exists(id: number): Promise<boolean> {
    const count = await this.prisma.customFormat.count({
      where: { id },
    });
    return count > 0;
  }

  async nameExists(name: string, excludeId?: number): Promise<boolean> {
    const count = await this.prisma.customFormat.count({
      where: {
        name,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    return count > 0;
  }

  async findByQualityProfileId(qualityProfileId: number): Promise<Array<{
    customFormat: CustomFormatWithScores;
    score: number;
  }>> {
    const scores = await this.prisma.customFormatScore.findMany({
      where: { qualityProfileId },
      include: {
        customFormat: {
          include: { scores: true },
        },
      },
    });

    return scores.map(score => ({
      customFormat: this.toCustomFormatWithScores(score.customFormat),
      score: score.score,
    }));
  }

  private toCustomFormatWithScores(
    format: CustomFormat & { scores: CustomFormatScore[] },
  ): CustomFormatWithScores {
    return {
      id: format.id,
      name: format.name,
      includeCustomFormatWhenRenaming: format.includeCustomFormatWhenRenaming,
      conditions: parseConditions(format.conditions),
      createdAt: format.createdAt,
      updatedAt: format.updatedAt,
      scores: format.scores.map(score => ({
        id: score.id,
        qualityProfileId: score.qualityProfileId,
        score: score.score,
      })),
    };
  }
}
