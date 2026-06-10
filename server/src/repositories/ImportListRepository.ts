import { and, asc, desc, eq, or, type SQL } from 'drizzle-orm';
import type { DatabaseClient } from '../db/drizzleClient';
import * as schema from '../db/schema';
import type { ImportList, ImportListExclusion } from '../types/modelTypes';

export interface ImportListWithProfile extends Omit<ImportList, 'config'> {
  config: Record<string, unknown>;
  qualityProfile: {
    id: number;
    name: string;
  };
}

export interface CreateImportListData {
  name: string;
  providerType: string;
  config: Record<string, unknown>;
  rootFolderPath: string;
  qualityProfileId: number;
  languageProfileId?: number | null | undefined;
  monitorType: string;
  enabled?: boolean | undefined;
  syncInterval?: number | undefined;
}

export interface UpdateImportListData {
  name?: string | undefined;
  providerType?: string | undefined;
  config?: Record<string, unknown> | undefined;
  rootFolderPath?: string | undefined;
  qualityProfileId?: number | undefined;
  languageProfileId?: number | null | undefined;
  monitorType?: string | undefined;
  enabled?: boolean;
  syncInterval?: number;
}

export interface CreateExclusionData {
  importListId?: number | undefined;
  tmdbId?: number | undefined;
  imdbId?: string | undefined;
  tvdbId?: number | undefined;
  title: string;
}

function parseConfig(config: unknown): Record<string, unknown> {
  if (typeof config === 'object' && config !== null && !Array.isArray(config)) {
    return config as Record<string, unknown>;
  }
  return {};
}

export class ImportListRepository {
  constructor(private readonly prisma: DatabaseClient) {}

  private async loadWithProfile(id: number): Promise<ImportListWithProfile | null> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.importLists)
      .where(eq(schema.importLists.id, id))
      .limit(1);
    const list = rows[0];
    if (!list) return null;
    return this.decorateWithProfile(list as ImportList);
  }

  private async decorateWithProfile(list: ImportList): Promise<ImportListWithProfile> {
    let qualityProfile: { id: number; name: string } | null = null;
    if (list.qualityProfileId != null) {
      const qpRows = await this.prisma.drizzle
        .select({ id: schema.qualityProfiles.id, name: schema.qualityProfiles.name })
        .from(schema.qualityProfiles)
        .where(eq(schema.qualityProfiles.id, list.qualityProfileId))
        .limit(1);
      qualityProfile = qpRows[0] ?? null;
    }
    return {
      ...list,
      config: parseConfig((list as { config: unknown }).config),
      qualityProfile: qualityProfile ?? { id: list.qualityProfileId ?? 0, name: '' },
    };
  }

  async findAll(): Promise<ImportListWithProfile[]> {
    const lists = await this.prisma.drizzle
      .select()
      .from(schema.importLists)
      .orderBy(asc(schema.importLists.name));
    return Promise.all(lists.map((list) => this.decorateWithProfile(list as ImportList)));
  }

  async findById(id: number): Promise<ImportListWithProfile | null> {
    return this.loadWithProfile(id);
  }

  async findAllEnabled(): Promise<ImportListWithProfile[]> {
    const lists = await this.prisma.drizzle
      .select()
      .from(schema.importLists)
      .where(eq(schema.importLists.enabled, true))
      .orderBy(asc(schema.importLists.name));
    return Promise.all(lists.map((list) => this.decorateWithProfile(list as ImportList)));
  }

  async create(data: CreateImportListData): Promise<ImportListWithProfile> {
    const [row] = await this.prisma.drizzle
      .insert(schema.importLists)
      .values({
        name: data.name,
        providerType: data.providerType,
        config: data.config,
        rootFolderPath: data.rootFolderPath,
        qualityProfileId: data.qualityProfileId,
        languageProfileId: data.languageProfileId ?? null,
        monitorType: data.monitorType,
        enabled: data.enabled ?? true,
        syncInterval: data.syncInterval ?? 24,
      })
      .returning();
    if (!row) {
      throw new Error('ImportListRepository.create: returned no row');
    }
    return this.decorateWithProfile(row as ImportList);
  }

  async update(id: number, data: UpdateImportListData): Promise<ImportListWithProfile> {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.providerType !== undefined) updateData.providerType = data.providerType;
    if (data.config !== undefined) updateData.config = data.config;
    if (data.rootFolderPath !== undefined) updateData.rootFolderPath = data.rootFolderPath;
    if (data.qualityProfileId !== undefined) updateData.qualityProfileId = data.qualityProfileId;
    if (data.languageProfileId !== undefined) updateData.languageProfileId = data.languageProfileId;
    if (data.monitorType !== undefined) updateData.monitorType = data.monitorType;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.syncInterval !== undefined) updateData.syncInterval = data.syncInterval;

    const rows = await this.prisma.drizzle
      .update(schema.importLists)
      .set(updateData)
      .where(eq(schema.importLists.id, id))
      .returning();
    const updated = rows[0];
    if (!updated) {
      throw new Error(`ImportListRepository.update: list ${id} not found`);
    }
    return this.decorateWithProfile(updated as ImportList);
  }

  async delete(id: number): Promise<ImportList> {
    const rows = await this.prisma.drizzle
      .delete(schema.importLists)
      .where(eq(schema.importLists.id, id))
      .returning();
    const deleted = rows[0];
    if (!deleted) {
      throw new Error(`ImportListRepository.delete: list ${id} not found`);
    }
    return deleted as ImportList;
  }

  async updateLastSync(id: number): Promise<ImportList> {
    const rows = await this.prisma.drizzle
      .update(schema.importLists)
      .set({ lastSyncAt: new Date() })
      .where(eq(schema.importLists.id, id))
      .returning();
    const updated = rows[0];
    if (!updated) {
      throw new Error(`ImportListRepository.updateLastSync: list ${id} not found`);
    }
    return updated as ImportList;
  }

  // Exclusion methods
  async findAllExclusions(): Promise<ImportListExclusion[]> {
    return this.prisma.drizzle
      .select()
      .from(schema.importListExclusions)
      .orderBy(desc(schema.importListExclusions.createdAt)) as unknown as Promise<ImportListExclusion[]>;
  }

  async findExclusionById(id: number): Promise<ImportListExclusion | null> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.importListExclusions)
      .where(eq(schema.importListExclusions.id, id))
      .limit(1);
    return (rows[0] as ImportListExclusion | undefined) ?? null;
  }

  async findExclusionByTmdbId(tmdbId: number): Promise<ImportListExclusion | null> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.importListExclusions)
      .where(eq(schema.importListExclusions.tmdbId, tmdbId))
      .limit(1);
    return (rows[0] as ImportListExclusion | undefined) ?? null;
  }

  async findExclusionByImdbId(imdbId: string): Promise<ImportListExclusion | null> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.importListExclusions)
      .where(eq(schema.importListExclusions.imdbId, imdbId))
      .limit(1);
    return (rows[0] as ImportListExclusion | undefined) ?? null;
  }

  async findExclusionByTvdbId(tvdbId: number): Promise<ImportListExclusion | null> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.importListExclusions)
      .where(eq(schema.importListExclusions.tvdbId, tvdbId))
      .limit(1);
    return (rows[0] as ImportListExclusion | undefined) ?? null;
  }

  async createExclusion(data: CreateExclusionData): Promise<ImportListExclusion> {
    const [row] = await this.prisma.drizzle
      .insert(schema.importListExclusions)
      .values({
        importListId: data.importListId ?? null,
        tmdbId: data.tmdbId ?? null,
        imdbId: data.imdbId ?? null,
        tvdbId: data.tvdbId ?? null,
        title: data.title,
      })
      .returning();
    if (!row) {
      throw new Error('ImportListRepository.createExclusion: returned no row');
    }
    return row as ImportListExclusion;
  }

  async deleteExclusion(id: number): Promise<ImportListExclusion> {
    const rows = await this.prisma.drizzle
      .delete(schema.importListExclusions)
      .where(eq(schema.importListExclusions.id, id))
      .returning();
    const deleted = rows[0];
    if (!deleted) {
      throw new Error(`ImportListRepository.deleteExclusion: exclusion ${id} not found`);
    }
    return deleted as ImportListExclusion;
  }

  async isExcluded(item: { tmdbId?: number; imdbId?: string; tvdbId?: number }): Promise<boolean> {
    const conditions: SQL[] = [];
    if (item.tmdbId !== undefined) conditions.push(eq(schema.importListExclusions.tmdbId, item.tmdbId));
    if (item.imdbId !== undefined) conditions.push(eq(schema.importListExclusions.imdbId, item.imdbId));
    if (item.tvdbId !== undefined) conditions.push(eq(schema.importListExclusions.tvdbId, item.tvdbId));

    if (conditions.length === 0) return false;

    const where = conditions.length === 1 ? conditions[0]! : or(...conditions);
    const rows = await this.prisma.drizzle
      .select({ id: schema.importListExclusions.id })
      .from(schema.importListExclusions)
      .where(where)
      .limit(1);
    return rows.length > 0;
  }
}

void and;