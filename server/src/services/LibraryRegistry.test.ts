import { describe, expect, it, vi } from 'vitest';
import { ensureLibraryRegistry, type LibraryRegistryDatabase, type LibraryRow } from './LibraryRegistry';

function fakeDb(rows: LibraryRow[] = []): { db: LibraryRegistryDatabase; creates: unknown[]; updates: unknown[] } {
  const creates: unknown[] = [];
  const updates: unknown[] = [];
  let nextId = 100;
  const db: LibraryRegistryDatabase = {
    library: {
      findMany: vi.fn(async () => rows),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        creates.push(args);
        return { id: nextId++, kind: String(args.data.kind), name: '', rootFolder: '', enabled: false } as LibraryRow;
      }),
      update: vi.fn(async (args: unknown) => { updates.push(args); }),
    },
  };
  return { db, creates, updates };
}

const settings = { movieRootFolder: '/data/Movies', tvRootFolder: '/data/TV', adultRootFolder: '/data/Porn' };

describe('ensureLibraryRegistry', () => {
  it('creates the three libraries with their roots on a fresh install', async () => {
    const { db, creates } = fakeDb();
    await ensureLibraryRegistry(db, settings);
    expect(creates).toHaveLength(3);
    const kinds = (creates as Array<{ data: { kind: string; rootFolder: string; enabled: boolean } }>)
      .map((call) => call.data);
    expect(kinds).toEqual([
      { kind: 'MOVIES', name: 'Movies', rootFolder: '/data/Movies', enabled: true },
      { kind: 'TV', name: 'TV Shows', rootFolder: '/data/TV', enabled: true },
      { kind: 'ADULT', name: 'Adult', rootFolder: '/data/Porn', enabled: true },
    ]);
  });

  it('leaves the Adult library disabled when no root is configured', async () => {
    const { db, creates } = fakeDb();
    await ensureLibraryRegistry(db, { ...settings, adultRootFolder: ' ' });
    const adult = (creates as Array<{ data: { kind: string; enabled: boolean } }>).find((call) => call.data.kind === 'ADULT');
    expect(adult?.data.enabled).toBe(false);
  });

  it('updates a changed root instead of recreating the library', async () => {
    const { db, creates, updates } = fakeDb([
      { id: 1, kind: 'MOVIES', name: 'Movies', rootFolder: '/old', enabled: true },
      { id: 2, kind: 'TV', name: 'TV Shows', rootFolder: '/data/TV', enabled: true },
      { id: 3, kind: 'ADULT', name: 'Adult', rootFolder: '/data/Porn', enabled: true },
    ]);
    await ensureLibraryRegistry(db, settings);
    expect(creates).toHaveLength(0);
    expect(updates).toHaveLength(1);
    expect(updates[0]).toEqual({ where: { id: 1 }, data: { rootFolder: '/data/Movies', enabled: true } });
  });
});
