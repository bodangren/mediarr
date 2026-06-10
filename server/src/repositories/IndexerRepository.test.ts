import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { IndexerRepository } from './IndexerRepository';
import * as schema from '../db/schema';
import { encrypt, decrypt } from '../utils/encryption';

beforeAll(() => {
  if (!process.env.ENCRYPTION_KEY) {
    process.env.ENCRYPTION_KEY = 'test-local-encryption-key-32-bytes';
  }
});

type InsertBuilder = {
  values: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
};

type SelectBuilder = {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
};

type UpdateBuilder = {
  set: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
};

type DeleteBuilder = {
  where: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
};

function makeInsertBuilder(rows: any[] = []): InsertBuilder {
  const builder: any = {};
  builder.values = vi.fn().mockReturnValue(builder);
  builder.returning = vi.fn().mockResolvedValue(rows);
  return builder as InsertBuilder;
}

function makeSelectBuilder(rows: any[] = []): SelectBuilder {
  const builder: any = {
    then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject),
  };
  builder.from = vi.fn().mockReturnValue(builder);
  builder.where = vi.fn().mockReturnValue(builder);
  builder.limit = vi.fn().mockReturnValue(builder);
  return builder as SelectBuilder;
}

function makeUpdateBuilder(rows: any[] = []): UpdateBuilder {
  const builder: any = {};
  builder.set = vi.fn().mockReturnValue(builder);
  builder.where = vi.fn().mockReturnValue(builder);
  builder.returning = vi.fn().mockResolvedValue(rows);
  return builder as UpdateBuilder;
}

function makeDeleteBuilder(rows: any[] = []): DeleteBuilder {
  const builder: any = {};
  builder.where = vi.fn().mockReturnValue(builder);
  builder.returning = vi.fn().mockResolvedValue(rows);
  return builder as DeleteBuilder;
}

interface MockConfig {
  insertRows?: any[];
  selectRowsByCall?: any[][];
  updateRows?: any[];
  deleteRows?: any[];
}

function makeDb(config: MockConfig = {}) {
  const selectCallIndex = { i: 0 };
  return {
    drizzle: {
      insert: vi.fn().mockImplementation((table: any) => {
        if (table !== schema.indexers) throw new Error(`unexpected insert table: ${table}`);
        return makeInsertBuilder(config.insertRows ?? [{ id: 1, name: 'Created' }]);
      }),
      select: vi.fn().mockImplementation(() => {
        const rows = config.selectRowsByCall?.[selectCallIndex.i] ?? [];
        selectCallIndex.i += 1;
        return makeSelectBuilder(rows);
      }),
      update: vi.fn().mockImplementation((table: any) => {
        if (table !== schema.indexers) throw new Error(`unexpected update table: ${table}`);
        return makeUpdateBuilder(config.updateRows ?? [{ id: 1, name: 'Updated' }]);
      }),
      delete: vi.fn().mockImplementation((table: any) => {
        if (table !== schema.indexers) throw new Error(`unexpected delete table: ${table}`);
        return makeDeleteBuilder(config.deleteRows ?? [{ id: 1, name: 'Deleted' }]);
      }),
    },
  };
}

const sampleSettings = '{"url":"https://example.com","apikey":"secret"}';

const baseData = {
  name: 'Sample Indexer',
  implementation: 'torznab',
  configContract: 'TorznabSettings',
  protocol: 'torrent',
  settings: sampleSettings,
};

describe('IndexerRepository (native Drizzle) — FR-1.5', () => {
  let prisma: ReturnType<typeof makeDb>;
  let repo: IndexerRepository;

  beforeEach(() => {
    prisma = makeDb();
    repo = new IndexerRepository(prisma as any);
  });

  describe('create', () => {
    it('inserts into the indexers table with encrypted settings and defaults', async () => {
      await repo.create(baseData as any);

      expect(prisma.drizzle.insert).toHaveBeenCalledTimes(1);
      expect(prisma.drizzle.insert).toHaveBeenCalledWith(schema.indexers);

      const insertArgs = (prisma.drizzle.insert.mock.results[0]!.value as InsertBuilder).values.mock.calls[0]![0];
      expect(insertArgs.name).toBe('Sample Indexer');
      expect(insertArgs.implementation).toBe('torznab');
      expect(insertArgs.protocol).toBe('torrent');
      expect(insertArgs.supportedMediaTypes).toBe('["TV", "MOVIE"]');
      expect(insertArgs.enabled).toBe(true);
      expect(insertArgs.supportsRss).toBe(false);
      expect(insertArgs.supportsSearch).toBe(false);
      expect(insertArgs.priority).toBe(25);
      expect(insertArgs.settings).not.toBe(sampleSettings);
      // Encryption uses a random IV per call, so decrypt both sides to verify the round-trip.
      expect(decrypt(insertArgs.settings as string)).toBe(sampleSettings);
    });

    it('propagates explicit settings values', async () => {
      await repo.create({
        ...baseData,
        enabled: false,
        supportsRss: true,
        supportsSearch: true,
        priority: 1,
        supportedMediaTypes: '["TV"]',
      } as any);

      const insertArgs = (prisma.drizzle.insert.mock.results[0]!.value as InsertBuilder).values.mock.calls[0]![0];
      expect(insertArgs.enabled).toBe(false);
      expect(insertArgs.supportsRss).toBe(true);
      expect(insertArgs.supportsSearch).toBe(true);
      expect(insertArgs.priority).toBe(1);
      expect(insertArgs.supportedMediaTypes).toBe('["TV"]');
    });
  });

  describe('findById', () => {
    it('returns null when no indexer matches', async () => {
      prisma = makeDb({ selectRowsByCall: [[]] });
      repo = new IndexerRepository(prisma as any);

      const result = await repo.findById(42);
      expect(result).toBeNull();
    });

    it('returns decrypted settings when found', async () => {
      prisma = makeDb({
        selectRowsByCall: [[
          { id: 7, name: 'A', implementation: 'torznab', configContract: 'TorznabSettings', settings: encrypt(sampleSettings), protocol: 'torrent', supportedMediaTypes: '["TV"]', enabled: true, supportsRss: false, supportsSearch: true, priority: 25 },
        ]],
      });
      repo = new IndexerRepository(prisma as any);

      const result = await repo.findById(7);
      expect(result).not.toBeNull();
      expect(result!.settings).toBe(decrypt(encrypt(sampleSettings)));
      expect(result!.name).toBe('A');
    });
  });

  describe('findAll', () => {
    it('returns decrypted settings for every row', async () => {
      const enc = encrypt(sampleSettings);
      prisma = makeDb({
        selectRowsByCall: [[
          { id: 1, name: 'A', settings: enc },
          { id: 2, name: 'B', settings: enc },
        ]],
      });
      repo = new IndexerRepository(prisma as any);

      const result = await repo.findAll();
      expect(result).toHaveLength(2);
      expect(result[0]!.settings).toBe(decrypt(enc));
      expect(result[1]!.settings).toBe(decrypt(enc));
    });

    it('returns an empty array when no indexers exist', async () => {
      prisma = makeDb({ selectRowsByCall: [[]] });
      repo = new IndexerRepository(prisma as any);

      const result = await repo.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findAllEnabled', () => {
    it('filters by enabled=true and decrypts settings', async () => {
      const enc = encrypt(sampleSettings);
      prisma = makeDb({
        selectRowsByCall: [[
          { id: 1, name: 'Enabled', settings: enc, enabled: true },
        ]],
      });
      repo = new IndexerRepository(prisma as any);

      const result = await repo.findAllEnabled();
      expect(result).toHaveLength(1);
      expect(result[0]!.settings).toBe(decrypt(enc));

      const whereArg = (prisma.drizzle.select.mock.results[0]!.value as SelectBuilder).where.mock.calls[0]![0];
      expect(whereArg).toBeDefined();
    });
  });

  describe('update', () => {
    it('updates only the provided fields and encrypts settings', async () => {
      prisma = makeDb({
        updateRows: [{ id: 1, name: 'NewName', settings: encrypt('{"new":true}') }],
      });
      repo = new IndexerRepository(prisma as any);

      const result = await repo.update(1, {
        name: 'NewName',
        settings: '{"new":true}',
      });

      const setArg = (prisma.drizzle.update.mock.results[0]!.value as UpdateBuilder).set.mock.calls[0]![0];
      expect(setArg).toMatchObject({
        name: 'NewName',
      });
      expect(setArg.implementation).toBeUndefined();
      // Encryption uses a random IV per call, so decrypt both sides for the round-trip check.
      expect(decrypt(setArg.settings as string)).toBe('{"new":true}');
      expect(result.name).toBe('NewName');
      expect(result.settings).toBe('{"new":true}');
    });

    it('throws when the row does not exist', async () => {
      prisma = makeDb({ updateRows: [] });
      repo = new IndexerRepository(prisma as any);

      await expect(repo.update(999, { name: 'X' })).rejects.toThrow(/not found/);
    });
  });

  describe('delete', () => {
    it('returns the deleted row', async () => {
      prisma = makeDb({
        deleteRows: [{ id: 7, name: 'Gone' }],
      });
      repo = new IndexerRepository(prisma as any);

      const result = await repo.delete(7);
      expect(result).toMatchObject({ id: 7, name: 'Gone' });
    });

    it('throws when the row does not exist', async () => {
      prisma = makeDb({ deleteRows: [] });
      repo = new IndexerRepository(prisma as any);

      await expect(repo.delete(999)).rejects.toThrow(/not found/);
    });
  });
});