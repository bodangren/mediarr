import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { importAdultLibrary, type AdultImportSummary } from './AdultLibraryService';
import { adultSeriesKey, adultTags, topFolderOf } from './AdultSeriesTags';

/**
 * Engine-side adult library import (track chore_migrate_hermes_automation_20261107, Phase 9).
 *
 * The same gap as music: `/api/libraries/adult/import` was the only way to register files under
 * `/data/Porn`, so a release the operator filed stayed invisible to the adult library until someone
 * pressed the button in the SPA. Automation must not call the REST API, so the import belongs on the
 * scheduler like every other library refresh (daily at 05:05).
 *
 * Additive by contract: the importer never renames, moves or deletes files; `notSeen` is reported,
 * not acted on.
 */

export interface RunAdultLibraryImportOptions {
  /** Injectable for tests; defaults to the real importer. */
  importFn?: typeof importAdultLibrary;
}

/** Build the drizzle-backed adapter `importAdultLibrary` needs (kept in one place). */
export function createAdultLibraryDatabase(drizzle: any, options: { rootFolder?: string } = {}) {
  return {
    library: {
      findFirst: async () => ({ id: 0 } as { id: number }),
      update: async ({ where, data }: { where: { id: number }; data: Record<string, unknown> }) => {
        await drizzle.update(schema.libraries).set(data).where(eq(schema.libraries.id, where.id));
      },
    },
    adultItem: {
      findMany: () => drizzle
        .select({ id: schema.adultItems.id, path: schema.adultItems.path })
        .from(schema.adultItems),
      upsert: async ({ create, update }: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
        // Series key and tags are derived here, at scan time, so the TV/SPA can group and
        // filter without parsing filenames on the client.
        const folder = topFolderOf(String(create.path ?? ''), options.rootFolder ?? '');
        const derivationInput = { ...create, folder } as {
          title?: string | null;
          fileName?: string | null;
          studio?: string | null;
          quality?: string | null;
          releaseDate?: string | null;
          needsReview?: boolean;
          keep?: boolean;
          isWatched?: boolean;
          folder?: string | null;
        };
        const derived = {
          seriesKey: adultSeriesKey(derivationInput),
          tags: JSON.stringify(adultTags(derivationInput)),
        };
        await drizzle
          .insert(schema.adultItems)
          .values({ ...create, ...derived })
          .onConflictDoUpdate({ target: schema.adultItems.path, set: { ...update, ...derived } });
      },
    },
  };
}

/** Resolve the ADULT library root and import everything under it; shared by the route and 05:05. */
export async function runAdultLibraryImport(
  drizzle: any,
  options: RunAdultLibraryImportOptions = {},
): Promise<AdultImportSummary> {
  const rows = await drizzle
    .select({ id: schema.libraries.id, rootFolder: schema.libraries.rootFolder })
    .from(schema.libraries)
    .where(eq(schema.libraries.kind, 'ADULT'))
    .limit(1);
  const adult = rows[0];
  if (!adult) throw new Error('Adult library is not registered');
  if (typeof adult.rootFolder !== 'string' || adult.rootFolder.trim().length === 0) {
    throw new Error('adultRootFolder is empty');
  }
  const run = options.importFn ?? importAdultLibrary;
  return run(createAdultLibraryDatabase(drizzle, { rootFolder: adult.rootFolder }), {
    root: adult.rootFolder,
    libraryId: adult.id,
  });
}
