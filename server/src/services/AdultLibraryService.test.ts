import { describe, expect, it, vi } from 'vitest';
import { importAdultLibrary, type AdultLibraryDatabase } from './AdultLibraryService';
import type { AdultScanSummary } from './AdultLibraryScanner';

function scanOf(entries: Array<{ path: string; title: string | null; needsReview: boolean }>): AdultScanSummary {
  return {
    root: '/porn',
    videos: entries.length,
    needsReview: entries.filter((entry) => entry.needsReview).length,
    unreadableDirectories: [],
    entries: entries.map((entry) => ({
      className: 'plain-title' as const,
      studio: null,
      quality: null,
      releaseDate: null,
      sizeBytes: 10,
      relativePath: entry.path.replace('/porn/', ''),
      ...entry,
    })),
  } as AdultScanSummary;
}

function fakeDb(existing: Array<{ id: number; path: string }> = []): { db: AdultLibraryDatabase; upserts: unknown[] } {
  const upserts: unknown[] = [];
  const db: AdultLibraryDatabase = {
    library: {
      findFirst: vi.fn().mockResolvedValue({ id: 7 }),
      update: vi.fn().mockResolvedValue({}),
    },
    adultItem: {
      findMany: vi.fn().mockResolvedValue(existing),
      upsert: vi.fn(async (args: unknown) => { upserts.push(args); }),
    },
  };
  return { db, upserts };
}

describe('importAdultLibrary', () => {
  it('creates new rows, updates known ones and reports review cases', async () => {
    const { db, upserts } = fakeDb([{ id: 1, path: '/porn/a.mp4' }]);
    const summary = await importAdultLibrary(db, {
      root: '/porn',
      scan: async () => scanOf([
        { path: '/porn/a.mp4', title: 'Known', needsReview: false },
        { path: '/porn/001 [h].mp4', title: null, needsReview: true },
      ]),
    });

    expect(summary).toMatchObject({ scanned: 2, created: 1, updated: 1, needsReview: 1, libraryId: 7 });
    expect(upserts).toHaveLength(2);
    expect(db.library.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { rootFolder: '/porn' } });
  });

  it('reports rows not seen without deleting them', async () => {
    const { db } = fakeDb([{ id: 1, path: '/porn/a.mp4' }, { id: 2, path: '/porn/gone.mp4' }]);
    const summary = await importAdultLibrary(db, { root: '/porn', scan: async () => scanOf([{ path: '/porn/a.mp4', title: 'A', needsReview: false }]) });
    expect(summary.notSeen).toBe(1);
    expect((db.adultItem as { findMany: unknown }).findMany).toBeDefined();
  });

  it('fails loudly when the ADULT library is not registered', async () => {
    const db: AdultLibraryDatabase = {
      library: { findFirst: vi.fn().mockResolvedValue(null), update: vi.fn() },
      adultItem: { findMany: vi.fn().mockResolvedValue([]), upsert: vi.fn() },
    };
    await expect(importAdultLibrary(db, { root: '/porn', scan: async () => scanOf([]) }))
      .rejects.toThrow('ADULT library is not registered');
  });
});
