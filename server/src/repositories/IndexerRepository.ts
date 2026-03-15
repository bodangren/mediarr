import { PrismaClient, type Indexer } from '@prisma/client';
import { encrypt, decrypt } from '../utils/encryption';

export class IndexerRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: Omit<Indexer, 'id' | 'added'>): Promise<Indexer> {
    const encryptedSettings = encrypt(data.settings);
    return this.prisma.indexer.create({
      data: {
        name: data.name,
        implementation: data.implementation,
        configContract: data.configContract,
        settings: encryptedSettings,
        protocol: data.protocol,
        supportedMediaTypes: data.supportedMediaTypes ?? '["TV", "MOVIE"]',
        enabled: data.enabled ?? true,
        supportsRss: data.supportsRss ?? false,
        supportsSearch: data.supportsSearch ?? false,
        priority: data.priority ?? 25,
      },
    });
  }

  async findById(id: number): Promise<Indexer | null> {
    const indexer = await this.prisma.indexer.findUnique({
      where: { id },
    });

    if (!indexer) return null;

    return {
      ...indexer,
      settings: decrypt(indexer.settings),
    };
  }

  async findAll(): Promise<Indexer[]> {
    const indexers = await this.prisma.indexer.findMany();
    return indexers.map((indexer) => ({
      ...indexer,
      settings: decrypt(indexer.settings),
    }));
  }

  async findAllEnabled(): Promise<Indexer[]> {
    const indexers = await this.prisma.indexer.findMany({
      where: { enabled: true },
    });
    return indexers.map((indexer) => ({
      ...indexer,
      settings: decrypt(indexer.settings),
    }));
  }

  async update(id: number, data: Partial<Omit<Indexer, 'id' | 'added'>>): Promise<Indexer> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.implementation !== undefined) updateData.implementation = data.implementation;
    if (data.configContract !== undefined) updateData.configContract = data.configContract;
    if (data.protocol !== undefined) updateData.protocol = data.protocol;
    if (data.supportedMediaTypes !== undefined) updateData.supportedMediaTypes = data.supportedMediaTypes;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.supportsRss !== undefined) updateData.supportsRss = data.supportsRss;
    if (data.supportsSearch !== undefined) updateData.supportsSearch = data.supportsSearch;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.settings !== undefined) {
      updateData.settings = encrypt(data.settings);
    }

    const updated = await this.prisma.indexer.update({
      where: { id },
      data: updateData,
    });

    return {
      ...updated,
      settings: decrypt(updated.settings),
    };
  }

  async delete(id: number): Promise<Indexer> {
    return this.prisma.indexer.delete({
      where: { id },
    });
  }
}
