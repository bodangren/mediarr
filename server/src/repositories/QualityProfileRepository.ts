import { eq, asc } from "drizzle-orm";
import type { DB } from "../db/index.js";
import { qualityProfiles, media, series, movies } from "../db/schema.js";

export interface QualityProfileItem {
  quality: {
    id: number;
    name: string;
    source: string;
    resolution: number;
  };
  allowed: boolean;
}

type QualityProfileRow = typeof qualityProfiles.$inferSelect;
export type QualityProfileWithItems = Omit<QualityProfileRow, "items"> & {
  items: QualityProfileItem[];
};

export interface CreateQualityProfileData {
  name: string;
  cutoff: number;
  items: QualityProfileItem[];
  languageProfileId?: number | null;
}

export interface UpdateQualityProfileData {
  name?: string;
  cutoff?: number;
  items?: QualityProfileItem[];
  languageProfileId?: number | null;
}

function parseItems(items: unknown): QualityProfileItem[] {
  if (!Array.isArray(items)) {
    return [];
  }
  return items as QualityProfileItem[];
}

function mapProfile(row: QualityProfileRow): QualityProfileWithItems {
  return {
    ...row,
    items: parseItems(row.items),
  };
}

export class QualityProfileRepository {
  constructor(private db: DB) {}

  async findAll(): Promise<QualityProfileWithItems[]> {
    const profiles = await this.db
      .select()
      .from(qualityProfiles)
      .orderBy(asc(qualityProfiles.name));

    return profiles.map(mapProfile);
  }

  async findById(id: number): Promise<QualityProfileWithItems | null> {
    const rows = await this.db
      .select()
      .from(qualityProfiles)
      .where(eq(qualityProfiles.id, id))
      .limit(1);

    return rows[0] ? mapProfile(rows[0]) : null;
  }

  async findByName(name: string): Promise<QualityProfileWithItems | null> {
    const rows = await this.db
      .select()
      .from(qualityProfiles)
      .where(eq(qualityProfiles.name, name))
      .limit(1);

    return rows[0] ? mapProfile(rows[0]) : null;
  }

  async create(data: CreateQualityProfileData): Promise<QualityProfileWithItems> {
    const result = await this.db
      .insert(qualityProfiles)
      .values({
        name: data.name,
        cutoff: data.cutoff,
        items: data.items,
        languageProfileId: data.languageProfileId ?? null,
      })
      .returning();

    return mapProfile(result[0]);
  }

  async update(id: number, data: UpdateQualityProfileData): Promise<QualityProfileWithItems> {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.cutoff !== undefined) updateData.cutoff = data.cutoff;
    if (data.items !== undefined) updateData.items = data.items;
    if (data.languageProfileId !== undefined) updateData.languageProfileId = data.languageProfileId;

    const result = await this.db
      .update(qualityProfiles)
      .set(updateData)
      .where(eq(qualityProfiles.id, id))
      .returning();

    return mapProfile(result[0]);
  }

  async delete(id: number): Promise<QualityProfileWithItems> {
    const result = await this.db
      .delete(qualityProfiles)
      .where(eq(qualityProfiles.id, id))
      .returning();

    return mapProfile(result[0]);
  }

  async isInUse(id: number): Promise<boolean> {
    const [mediaResult, seriesResult, movieResult] = await Promise.all([
      this.db.select({ id: media.id }).from(media).where(eq(media.qualityProfileId, id)).limit(1),
      this.db.select({ id: series.id }).from(series).where(eq(series.qualityProfileId, id)).limit(1),
      this.db.select({ id: movies.id }).from(movies).where(eq(movies.qualityProfileId, id)).limit(1),
    ]);

    return mediaResult.length > 0 || seriesResult.length > 0 || movieResult.length > 0;
  }
}
