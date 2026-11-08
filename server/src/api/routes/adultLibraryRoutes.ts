import type { FastifyInstance } from 'fastify';
import { asc, eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { importAdultLibrary } from '../../services/AdultLibraryService';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';

/**
 * Adult library surface (track feature_adult_library_20261107, Phase 1/2).
 *
 * Kept in its own route module so the section is visibly separate from Movies/TV: the queries touch
 * `AdultItem`/`Library` only, and Movies/TV handlers cannot see these rows.
 */
export function registerAdultLibraryRoutes(app: FastifyInstance, deps: ApiDependencies): void {
  const drizzle = (deps.prisma as unknown as { drizzle: any }).drizzle;

  app.get('/api/libraries', async (_request, reply) => {
    const rows = await drizzle.select().from(schema.libraries).orderBy(asc(schema.libraries.id));
    return sendSuccess(reply, rows);
  });

  app.get('/api/adult/items', async (_request, reply) => {
    const rows = await drizzle
      .select({
        id: schema.adultItems.id,
        title: schema.adultItems.title,
        fileName: schema.adultItems.fileName,
        studio: schema.adultItems.studio,
        quality: schema.adultItems.quality,
        releaseDate: schema.adultItems.releaseDate,
        needsReview: schema.adultItems.needsReview,
        path: schema.adultItems.path,
        sizeBytes: schema.adultItems.sizeBytes,
      })
      .from(schema.adultItems)
      .orderBy(asc(schema.adultItems.id));
    return sendSuccess(reply, rows);
  });

  app.post('/api/libraries/adult/import', async (_request, reply) => {
    const library = await drizzle
      .select()
      .from(schema.libraries)
      .where(eq(schema.libraries.kind, 'ADULT'))
      .limit(1);
    const adult = library[0];
    if (!adult) {
      return reply.code(422).send({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'Adult library is not registered' } });
    }
    if (typeof adult.rootFolder !== 'string' || adult.rootFolder.trim().length === 0) {
      return reply.code(422).send({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'adultRootFolder is empty' } });
    }

    const summary = await importAdultLibrary(
      {
        library: {
          findFirst: async () => ({ id: adult.id }),
          update: async ({ where, data }) => {
            await drizzle.update(schema.libraries).set(data).where(eq(schema.libraries.id, where.id));
          },
        },
        adultItem: {
          findMany: () => drizzle.select({ id: schema.adultItems.id, path: schema.adultItems.path }).from(schema.adultItems),
          upsert: async ({ where, create, update }) => {
            await drizzle
              .insert(schema.adultItems)
              .values(create)
              .onConflictDoUpdate({ target: schema.adultItems.path, set: update });
          },
        },
      },
      { root: adult.rootFolder, libraryId: adult.id },
    );

    return sendSuccess(reply, {
      root: summary.root,
      scanned: summary.scanned,
      created: summary.created,
      updated: summary.updated,
      needsReview: summary.needsReview,
      unreadableDirectories: summary.unreadableDirectories,
      notSeen: summary.notSeen,
    });
  });
}
