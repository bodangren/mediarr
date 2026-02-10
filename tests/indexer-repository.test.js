import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { IndexerRepository } from '../server/src/repositories/IndexerRepository';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import 'dotenv/config';

const adapter = new PrismaBetterSqlite3({ url: 'file:prisma/dev.db' });
const prisma = new PrismaClient({ adapter });
const repository = new IndexerRepository(prisma);

describe('IndexerRepository', () => {
  const secretKey = 'my-super-secret-key';
  
  beforeEach(async () => {
    process.env.ENCRYPTION_KEY = secretKey;
    await prisma.indexer.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create an indexer with encrypted settings', async () => {
    const indexerData = {
      name: 'Test Indexer',
      implementation: 'Torznab',
      configContract: 'TorznabSettings',
      settings: JSON.stringify({ apiKey: 'secret-api-key', url: 'http://test.com' }),
      protocol: 'torrent',
      enabled: true,
      supportsRss: true,
      supportsSearch: true,
      priority: 25
    };

    const created = await repository.create(indexerData);
    expect(created.name).toBe('Test Indexer');
    
    const stored = await prisma.indexer.findUnique({ where: { id: created.id } });
    expect(stored.settings).not.toBe(indexerData.settings);
    expect(stored.settings).toContain(':'); 
  });

  it('should retrieve an indexer with decrypted settings', async () => {
    const indexerData = {
      name: 'Test Indexer 2',
      implementation: 'Torznab',
      configContract: 'TorznabSettings',
      settings: JSON.stringify({ apiKey: 'secret-api-key-2' }),
      protocol: 'torrent',
      enabled: true,
      supportsRss: true,
      supportsSearch: true,
      priority: 25
    };

    const created = await repository.create(indexerData);
    const retrieved = await repository.findById(created.id);
    
    expect(retrieved.settings).toBe(indexerData.settings);
    const settingsObj = JSON.parse(retrieved.settings);
    expect(settingsObj.apiKey).toBe('secret-api-key-2');
  });
});
