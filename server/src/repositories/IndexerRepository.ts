import { eq } from 'drizzle-orm';
import type { DatabaseClient } from '../db/drizzleClient';
import * as schema from '../db/schema';
import type { Indexer } from '../types/modelTypes';
import { encrypt, decrypt } from '../utils/encryption';

export class IndexerRepository {
  constructor(private prisma: DatabaseClient) {}

  async create(data: Omit<Indexer, 'id' | 'added'>): Promise<Indexer> {
    const encryptedSettings = encrypt(data.settings);
    const [row] = await this.prisma.drizzle
      .insert(schema.indexers)
      .values({
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
      })
      .returning();
    if (!row) {
      throw new Error('IndexerRepository.create: insert returned no row');
    }
    return row as Indexer;
  }

  async findById(id: number): Promise<Indexer | null> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.indexers)
      .where(eq(schema.indexers.id, id))
      .limit(1);
    const indexer = rows[0];
    if (!indexer) return null;

    return {
      ...indexer,
      settings: decrypt(indexer.settings),
    };
  }

  async findAll(): Promise<Indexer[]> {
    const rows = await this.prisma.drizzle.select().from(schema.indexers);
    return rows.map((row) => ({
      ...row,
      settings: decrypt(row.settings),
    }));
  }

  async findAllEnabled(): Promise<Indexer[]> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.indexers)
      .where(eq(schema.indexers.enabled, true));
    return rows.map((row) => ({
      ...row,
      settings: decrypt(row.settings),
    }));
  }

  async update(id: number, data: Partial<Omit<Indexer, 'id' | 'added'>>): Promise<Indexer> {
    const updateData: Record<string, unknown> = {};
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

    const rows = await this.prisma.drizzle
      .update(schema.indexers)
      .set(updateData)
      .where(eq(schema.indexers.id, id))
      .returning();
    const updated = rows[0];
    if (!updated) {
      throw new Error(`IndexerRepository.update: indexer ${id} not found`);
    }

    return {
      ...updated,
      settings: decrypt(updated.settings),
    };
  }

  async delete(id: number): Promise<Indexer> {
    const rows = await this.prisma.drizzle
      .delete(schema.indexers)
      .where(eq(schema.indexers.id, id))
      .returning();
    const deleted = rows[0];
    if (!deleted) {
      throw new Error(`IndexerRepository.delete: indexer ${id} not found`);
    }
    return deleted as Indexer;
  }
}
