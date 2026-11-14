import { describe, expect, it } from 'vitest';
import type { AdultImportSummary } from './AdultLibraryService';
import { runAdultLibraryImport } from './AdultLibraryScan';

/**
 * Pins the contract the 05:05 adult-library task relies on: resolve the ADULT library row, pass its
 * root and id to the importer, and hand the summary back untouched. The real importer is injected in
 * these tests so no filesystem or database is touched.
 */

const summary: AdultImportSummary = {
  root: '/data/Porn',
  libraryId: 3,
  scanned: 12,
  created: 2,
  updated: 10,
  needsReview: 1,
  unreadableDirectories: [],
  notSeen: 0,
  scan: { scanned: 12, entries: [], unreadableDirectories: [] } as unknown as AdultImportSummary['scan'],
};

function drizzleWith(row: { id: number; rootFolder: string | null } | undefined) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => (row ? [row] : []) }),
      }),
    }),
  };
}

describe('runAdultLibraryImport', () => {
  it('imports the registered ADULT library root and returns the summary', async () => {
    const calls: Array<{ root: string; libraryId: number | undefined }> = [];
    const result = await runAdultLibraryImport(drizzleWith({ id: 3, rootFolder: '/data/Porn' }), {
      importFn: async (_db, options) => {
        calls.push({ root: options.root, libraryId: options.libraryId });
        return summary;
      },
    });
    expect(calls).toEqual([{ root: '/data/Porn', libraryId: 3 }]);
    expect(result).toBe(summary);
  });

  it('refuses to run when the ADULT library is not registered', async () => {
    await expect(runAdultLibraryImport(drizzleWith(undefined))).rejects.toThrow(/not registered/);
  });

  it('refuses to run with an empty root folder', async () => {
    await expect(runAdultLibraryImport(drizzleWith({ id: 3, rootFolder: '  ' }))).rejects.toThrow(/adultRootFolder is empty/);
  });
});
