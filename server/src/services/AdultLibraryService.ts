import { scanAdultLibrary, type AdultScanSummary } from './AdultLibraryScanner';

/**
 * Adult library import (track feature_adult_library_20261107, Phase 1).
 *
 * Ties the filesystem scanner to the `Library`/`AdultItem` tables. Additive on purpose: it never
 * renames or moves files, never deletes rows for files it merely could not stat, and reports what it
 * did so the caller can show a summary. Movies/TV rows cannot see these items — they live in their
 * own table keyed by path.
 */

export interface AdultLibraryDatabase {
  library: {
    findFirst(args: { where: { kind: string } }): Promise<{ id: number } | null>;
    update(args: { where: { id: number }; data: Record<string, unknown> }): Promise<unknown>;
  };
  adultItem: {
    findMany(args?: Record<string, unknown>): Promise<Array<{ id: number; path: string }>>;
    upsert(args: Record<string, unknown>): Promise<unknown>;
  };
}

export interface AdultImportSummary {
  root: string;
  libraryId: number;
  scanned: number;
  created: number;
  updated: number;
  needsReview: number;
  unreadableDirectories: string[];
  /** Rows whose file was not seen in this scan — reported, not deleted. */
  notSeen: number;
  scan: AdultScanSummary;
}

export async function importAdultLibrary(
  db: AdultLibraryDatabase,
  options: { root: string; libraryId?: number; now?: Date; scan?: typeof scanAdultLibrary },
): Promise<AdultImportSummary> {
  const scan = await (options.scan ?? scanAdultLibrary)(options.root);

  let libraryId = options.libraryId ?? null;
  if (libraryId === null) {
    const library = await db.library.findFirst({ where: { kind: 'ADULT' } });
    if (!library) throw new Error('ADULT library is not registered; set adultRootFolder first');
    libraryId = library.id;
  }

  const existing = await db.adultItem.findMany({ select: { id: true, path: true } });
  const existingByPath = new Map(existing.map((row) => [row.path, row.id]));
  const seen = new Set<string>();
  let created = 0;
  let updated = 0;

  for (const entry of scan.entries) {
    seen.add(entry.path);
    const isNew = !existingByPath.has(entry.path);
    await db.adultItem.upsert({
      where: { path: entry.path },
      create: {
        libraryId,
        path: entry.path,
        fileName: entry.path.split('/').pop() ?? entry.path,
        title: entry.title,
        studio: entry.studio,
        quality: entry.quality,
        releaseDate: entry.releaseDate,
        needsReview: entry.needsReview,
        sizeBytes: entry.sizeBytes,
      },
      update: {
        title: entry.title,
        studio: entry.studio,
        quality: entry.quality,
        releaseDate: entry.releaseDate,
        needsReview: entry.needsReview,
        sizeBytes: entry.sizeBytes,
        lastSeenAt: options.now ?? new Date(),
      },
    });
    if (isNew) created += 1;
    else updated += 1;
  }

  await db.library.update({ where: { id: libraryId }, data: { rootFolder: options.root } });

  return {
    root: options.root,
    libraryId,
    scanned: scan.videos,
    created,
    updated,
    needsReview: scan.needsReview,
    unreadableDirectories: scan.unreadableDirectories,
    notSeen: existing.filter((row) => !seen.has(row.path)).length,
    scan,
  };
}
