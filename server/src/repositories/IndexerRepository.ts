import { PrismaClient, Indexer } from '@prisma/client';
import { encrypt, decrypt } from '../utils/encryption';

export class IndexerRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: Omit<Indexer, 'id' | 'added'>): Promise<Indexer> {
    const encryptedSettings = encrypt(data.settings);
    return this.prisma.indexer.create({
      data: {
        ...data,
        settings: encryptedSettings,
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

  async update(id: number, data: Partial<Omit<Indexer, 'id' | 'added'>>): Promise<Indexer> {
    const updateData = { ...data };
    if (updateData.settings) {
      updateData.settings = encrypt(updateData.settings);
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
