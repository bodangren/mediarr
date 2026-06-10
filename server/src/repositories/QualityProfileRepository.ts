import { asc, eq } from 'drizzle-orm';
import type { DatabaseClient } from '../db/drizzleClient';
import * as schema from '../db/schema';
import type { QualityProfile } from '../types/modelTypes';

export interface QualityProfileItem {
  quality: {
    id: number;
    name: string;
    source: string;
    resolution: number;
  };
  allowed: boolean;
}

export interface QualityProfileWithItems extends Omit<QualityProfile, 'items'> {
  items: QualityProfileItem[];
}

export interface CreateQualityProfileData {
  name: string;
  cutoff: number;
  items: QualityProfileItem[];
  languageProfileId?: number | null | undefined;
}

export interface UpdateQualityProfileData {
  name?: string | undefined;
  cutoff?: number | undefined;
  items?: QualityProfileItem[] | undefined;
  languageProfileId?: number | null | undefined;
}

function parseItems(items: unknown): QualityProfileItem[] {
  if (!Array.isArray(items)) {
    return [];
  }
  return items as QualityProfileItem[];
}

export class QualityProfileRepository {
  constructor(private prisma: DatabaseClient) {}

  async findAll(): Promise<QualityProfileWithItems[]> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.qualityProfiles)
      .orderBy(asc(schema.qualityProfiles.name));

    return rows.map((row) => ({
      ...row,
      items: parseItems(row.items),
    }));
  }

  async findById(id: number): Promise<QualityProfileWithItems | null> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.qualityProfiles)
      .where(eq(schema.qualityProfiles.id, id))
      .limit(1);
    const profile = rows[0];
    if (!profile) return null;

    return {
      ...profile,
      items: parseItems(profile.items),
    };
  }

  async findByName(name: string): Promise<QualityProfileWithItems | null> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.qualityProfiles)
      .where(eq(schema.qualityProfiles.name, name))
      .limit(1);
    const profile = rows[0];
    if (!profile) return null;

    return {
      ...profile,
      items: parseItems(profile.items),
    };
  }

  async create(data: CreateQualityProfileData): Promise<QualityProfileWithItems> {
    const [row] = await this.prisma.drizzle
      .insert(schema.qualityProfiles)
      .values({
        name: data.name,
        cutoff: data.cutoff,
        items: data.items,
        languageProfileId: data.languageProfileId ?? null,
      })
      .returning();
    if (!row) {
      throw new Error('QualityProfileRepository.create: returned no row');
    }
    return {
      ...row,
      items: parseItems(row.items),
    };
  }

  async update(id: number, data: UpdateQualityProfileData): Promise<QualityProfileWithItems> {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.cutoff !== undefined) updateData.cutoff = data.cutoff;
    if (data.items !== undefined) updateData.items = data.items;
    if (data.languageProfileId !== undefined) updateData.languageProfileId = data.languageProfileId;

    const rows = await this.prisma.drizzle
      .update(schema.qualityProfiles)
      .set(updateData)
      .where(eq(schema.qualityProfiles.id, id))
      .returning();
    const updated = rows[0];
    if (!updated) {
      throw new Error(`QualityProfileRepository.update: profile ${id} not found`);
    }
    return {
      ...updated,
      items: parseItems(updated.items),
    };
  }

  async delete(id: number): Promise<QualityProfileWithItems> {
    const rows = await this.prisma.drizzle
      .delete(schema.qualityProfiles)
      .where(eq(schema.qualityProfiles.id, id))
      .returning();
    const deleted = rows[0];
    if (!deleted) {
      throw new Error(`QualityProfileRepository.delete: profile ${id} not found`);
    }
    return {
      ...deleted,
      items: parseItems(deleted.items),
    };
  }

  async isInUse(id: number): Promise<boolean> {
    const [mediaRows, seriesRows, movieRows] = await Promise.all([
      this.prisma.drizzle
        .select({ id: schema.media.id })
        .from(schema.media)
        .where(eq(schema.media.qualityProfileId, id))
        .limit(1),
      this.prisma.drizzle
        .select({ id: schema.series.id })
        .from(schema.series)
        .where(eq(schema.series.qualityProfileId, id))
        .limit(1),
      this.prisma.drizzle
        .select({ id: schema.movies.id })
        .from(schema.movies)
        .where(eq(schema.movies.qualityProfileId, id))
        .limit(1),
    ]);

    return mediaRows.length > 0 || seriesRows.length > 0 || movieRows.length > 0;
  }
}