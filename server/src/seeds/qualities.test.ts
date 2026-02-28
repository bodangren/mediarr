import { beforeEach, describe, expect, it, vi } from 'vitest';
import { seedQualityProfiles, QUALITY_DEFINITIONS } from './qualities';

function makeUpsertMock() {
  const db: Record<string, { id: number; name: string; cutoff: number; items: unknown[] }> = {};
  let nextId = 1;

  return vi.fn(({ where, update, create }: {
    where: { name: string };
    update: { cutoff?: number; items?: unknown[] };
    create: { name: string; cutoff: number; items: unknown[] };
  }) => {
    const existing = Object.values(db).find(r => r.name === where.name);
    if (existing) {
      if (update.cutoff !== undefined) existing.cutoff = update.cutoff;
      if (update.items !== undefined) existing.items = update.items as unknown[];
      return Promise.resolve(existing);
    }
    const record = { id: nextId++, ...create };
    db[record.name] = record;
    return Promise.resolve(record);
  });
}

function makePrisma() {
  const upsertMock = makeUpsertMock();
  return {
    qualityProfile: {
      upsert: upsertMock,
    },
    _upsertMock: upsertMock,
  };
}

const EXPECTED_PRESET_NAMES = ['Any', 'SD', 'HD-720p', 'HD-1080p', 'Ultra-HD', 'HD - 720p/1080p'];

const CUTOFFS: Record<string, number> = {
  'Any': 1,         // SDTV
  'SD': 1,          // SDTV
  'HD-720p': 5,     // HDTV-720p
  'HD-1080p': 9,    // HDTV-1080p
  'Ultra-HD': 14,   // HDTV-2160p
  'HD - 720p/1080p': 5, // HDTV-720p
};

const EXPECTED_ALLOWED_IDS: Record<string, number[]> = {
  'Any': QUALITY_DEFINITIONS.map(q => q.id),
  'SD': [1, 2, 3, 4],
  'HD-720p': [5, 6, 7, 8],
  'HD-1080p': [9, 10, 11, 12],
  'Ultra-HD': [14, 15, 16, 17],
  'HD - 720p/1080p': [5, 6, 7, 8, 9, 10, 11, 12],
};

describe('seedQualityProfiles', () => {
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
  });

  it('upserts exactly six presets', async () => {
    await seedQualityProfiles(prisma as never);
    expect(prisma._upsertMock).toHaveBeenCalledTimes(6);
  });

  it('creates presets with correct names', async () => {
    await seedQualityProfiles(prisma as never);
    const names = prisma._upsertMock.mock.calls.map(
      (c: [{ create: { name: string } }]) => c[0].create.name
    );
    expect(names.sort()).toEqual(EXPECTED_PRESET_NAMES.sort());
  });

  it.each(EXPECTED_PRESET_NAMES)('"%s" preset has correct cutoff', async (name) => {
    await seedQualityProfiles(prisma as never);
    const call = prisma._upsertMock.mock.calls.find(
      (c: [{ create: { name: string } }]) => c[0].create.name === name
    );
    expect(call).toBeDefined();
    expect(call[0].create.cutoff).toBe(CUTOFFS[name]);
  });

  it.each(EXPECTED_PRESET_NAMES)('"%s" preset allowed quality IDs are correct', async (name) => {
    await seedQualityProfiles(prisma as never);
    const call = prisma._upsertMock.mock.calls.find(
      (c: [{ create: { name: string; items: Array<{ quality: { id: number }; allowed: boolean }> } }]) =>
        c[0].create.name === name
    );
    expect(call).toBeDefined();
    const items = call[0].create.items as Array<{ quality: { id: number }; allowed: boolean }>;
    const allowedIds = items.filter(i => i.allowed).map(i => i.quality.id).sort((a, b) => a - b);
    const expectedIds = [...EXPECTED_ALLOWED_IDS[name]].sort((a, b) => a - b);
    expect(allowedIds).toEqual(expectedIds);
  });

  it('is idempotent — calling twice does not create duplicates', async () => {
    await seedQualityProfiles(prisma as never);
    await seedQualityProfiles(prisma as never);
    // 6 presets x 2 calls = 12 upsert calls total (upsert handles dedup)
    expect(prisma._upsertMock).toHaveBeenCalledTimes(12);
    // All calls use the same 6 preset names
    const names = prisma._upsertMock.mock.calls.map(
      (c: [{ create: { name: string } }]) => c[0].create.name
    );
    const uniqueNames = [...new Set(names)];
    expect(uniqueNames.sort()).toEqual(EXPECTED_PRESET_NAMES.sort());
  });

  it('upserts by name (where clause uses name)', async () => {
    await seedQualityProfiles(prisma as never);
    for (const call of prisma._upsertMock.mock.calls) {
      expect(call[0].where).toHaveProperty('name');
      expect(typeof call[0].where.name).toBe('string');
    }
  });
});
