import type { PrismaClient, QualityProfile, Prisma } from '@prisma/client';

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
  languageProfileId?: number | null;
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
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<QualityProfileWithItems[]> {
    const profiles = await this.prisma.qualityProfile.findMany({
      orderBy: { name: 'asc' },
    });

    return profiles.map(profile => ({
      ...profile,
      items: parseItems(profile.items),
    }));
  }

  async findById(id: number): Promise<QualityProfileWithItems | null> {
    const profile = await this.prisma.qualityProfile.findUnique({
      where: { id },
    });

    if (!profile) return null;

    return {
      ...profile,
      items: parseItems(profile.items),
    };
  }

  async findByName(name: string): Promise<QualityProfileWithItems | null> {
    const profile = await this.prisma.qualityProfile.findUnique({
      where: { name },
    });

    if (!profile) return null;

    return {
      ...profile,
      items: parseItems(profile.items),
    };
  }

  async create(data: CreateQualityProfileData): Promise<QualityProfileWithItems> {
    const profile = await this.prisma.qualityProfile.create({
      data: {
        name: data.name,
        cutoff: data.cutoff,
        items: data.items as unknown as Prisma.InputJsonValue,
        languageProfileId: data.languageProfileId ?? null,
      },
    });

    return {
      ...profile,
      items: parseItems(profile.items),
    };
  }

  async update(id: number, data: UpdateQualityProfileData): Promise<QualityProfileWithItems> {
    const updateData: Prisma.QualityProfileUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.cutoff !== undefined) updateData.cutoff = data.cutoff;
    if (data.items !== undefined) updateData.items = data.items as unknown as Prisma.InputJsonValue;
    if (data.languageProfileId !== undefined) updateData.languageProfileId = data.languageProfileId;

    const profile = await this.prisma.qualityProfile.update({
      where: { id },
      data: updateData,
    });

    return {
      ...profile,
      items: parseItems(profile.items),
    };
  }

  async delete(id: number): Promise<QualityProfileWithItems> {
    const profile = await this.prisma.qualityProfile.delete({
      where: { id },
    });

    return {
      ...profile,
      items: parseItems(profile.items),
    };
  }

  async isInUse(id: number): Promise<boolean> {
    const [mediaCount, seriesCount, movieCount] = await Promise.all([
      this.prisma.media.count({ where: { qualityProfileId: id } }),
      this.prisma.series.count({ where: { qualityProfileId: id } }),
      this.prisma.movie.count({ where: { qualityProfileId: id } }),
    ]);

    return mediaCount > 0 || seriesCount > 0 || movieCount > 0;
  }
}
