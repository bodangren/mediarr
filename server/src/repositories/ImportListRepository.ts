import type { PrismaClient, ImportList, ImportListExclusion, Prisma } from '@prisma/client';

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
  languageProfileId?: number | null;
  monitorType: string;
  enabled?: boolean;
  syncInterval?: number;
}

export interface UpdateImportListData {
  name?: string;
  providerType?: string;
  config?: Record<string, unknown>;
  rootFolderPath?: string;
  qualityProfileId?: number;
  languageProfileId?: number | null;
  monitorType?: string;
  enabled?: boolean;
  syncInterval?: number;
}

export interface CreateExclusionData {
  importListId?: number | null;
  tmdbId?: number | null;
  imdbId?: string | null;
  tvdbId?: number | null;
  title: string;
}

function parseConfig(config: unknown): Record<string, unknown> {
  if (typeof config === 'object' && config !== null && !Array.isArray(config)) {
    return config as Record<string, unknown>;
  }
  return {};
}

export class ImportListRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(): Promise<ImportListWithProfile[]> {
    const lists = await this.prisma.importList.findMany({
      include: {
        qualityProfile: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return lists.map(list => ({
      ...list,
      config: parseConfig(list.config),
    }));
  }

  async findById(id: number): Promise<ImportListWithProfile | null> {
    const list = await this.prisma.importList.findUnique({
      where: { id },
      include: {
        qualityProfile: {
          select: { id: true, name: true },
        },
      },
    });

    if (!list) return null;

    return {
      ...list,
      config: parseConfig(list.config),
    };
  }

  async findAllEnabled(): Promise<ImportListWithProfile[]> {
    const lists = await this.prisma.importList.findMany({
      where: { enabled: true },
      include: {
        qualityProfile: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return lists.map(list => ({
      ...list,
      config: parseConfig(list.config),
    }));
  }

  async create(data: CreateImportListData): Promise<ImportListWithProfile> {
    const list = await this.prisma.importList.create({
      data: {
        name: data.name,
        providerType: data.providerType,
        config: data.config as unknown as Prisma.InputJsonValue,
        rootFolderPath: data.rootFolderPath,
        qualityProfileId: data.qualityProfileId,
        languageProfileId: data.languageProfileId ?? null,
        monitorType: data.monitorType,
        enabled: data.enabled ?? true,
        syncInterval: data.syncInterval ?? 24,
      },
      include: {
        qualityProfile: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      ...list,
      config: parseConfig(list.config),
    };
  }

  async update(id: number, data: UpdateImportListData): Promise<ImportListWithProfile> {
    const updateData: Prisma.ImportListUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.providerType !== undefined) updateData.providerType = data.providerType;
    if (data.config !== undefined) updateData.config = data.config as unknown as Prisma.InputJsonValue;
    if (data.rootFolderPath !== undefined) updateData.rootFolderPath = data.rootFolderPath;
    if (data.qualityProfileId !== undefined) {
      updateData.qualityProfile = { connect: { id: data.qualityProfileId } };
    }
    if (data.languageProfileId !== undefined) updateData.languageProfileId = data.languageProfileId;
    if (data.monitorType !== undefined) updateData.monitorType = data.monitorType;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.syncInterval !== undefined) updateData.syncInterval = data.syncInterval;

    const list = await this.prisma.importList.update({
      where: { id },
      data: updateData,
      include: {
        qualityProfile: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      ...list,
      config: parseConfig(list.config),
    };
  }

  async delete(id: number): Promise<ImportList> {
    return this.prisma.importList.delete({
      where: { id },
    });
  }

  async updateLastSync(id: number): Promise<ImportList> {
    return this.prisma.importList.update({
      where: { id },
      data: { lastSyncAt: new Date() },
    });
  }

  // Exclusion methods
  async findAllExclusions(): Promise<ImportListExclusion[]> {
    return this.prisma.importListExclusion.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findExclusionById(id: number): Promise<ImportListExclusion | null> {
    return this.prisma.importListExclusion.findUnique({
      where: { id },
    });
  }

  async findExclusionByTmdbId(tmdbId: number): Promise<ImportListExclusion | null> {
    return this.prisma.importListExclusion.findFirst({
      where: { tmdbId },
    });
  }

  async findExclusionByImdbId(imdbId: string): Promise<ImportListExclusion | null> {
    return this.prisma.importListExclusion.findFirst({
      where: { imdbId },
    });
  }

  async findExclusionByTvdbId(tvdbId: number): Promise<ImportListExclusion | null> {
    return this.prisma.importListExclusion.findFirst({
      where: { tvdbId },
    });
  }

  async createExclusion(data: CreateExclusionData): Promise<ImportListExclusion> {
    return this.prisma.importListExclusion.create({
      data: {
        importListId: data.importListId ?? null,
        tmdbId: data.tmdbId ?? null,
        imdbId: data.imdbId ?? null,
        tvdbId: data.tvdbId ?? null,
        title: data.title,
      },
    });
  }

  async deleteExclusion(id: number): Promise<ImportListExclusion> {
    return this.prisma.importListExclusion.delete({
      where: { id },
    });
  }

  async isExcluded(item: { tmdbId?: number; imdbId?: string; tvdbId?: number }): Promise<boolean> {
    const conditions: Prisma.ImportListExclusionWhereInput[] = [];

    if (item.tmdbId) {
      conditions.push({ tmdbId: item.tmdbId });
    }
    if (item.imdbId) {
      conditions.push({ imdbId: item.imdbId });
    }
    if (item.tvdbId) {
      conditions.push({ tvdbId: item.tvdbId });
    }

    if (conditions.length === 0) {
      return false;
    }

    const count = await this.prisma.importListExclusion.count({
      where: { OR: conditions },
    });

    return count > 0;
  }
}
