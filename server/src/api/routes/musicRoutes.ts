import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { scanMusicLibrary } from '../../services/MusicScanner';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';

/** Music library endpoints (track feature_music_library_20261107). Own domain under /api/music/*. */
export function registerMusicRoutes(app: FastifyInstance, deps: ApiDependencies): void {
  const drizzle = (deps.prisma as unknown as { drizzle: any }).drizzle;

  /** Scan /data/Music (or MUSIC_DIR): dry-run by default, idempotent by file path. */
  app.post('/api/music/scan', async (request, reply) => {
    const body = (request.body ?? {}) as { dryRun?: boolean };
    const summary = await scanMusicLibrary({
      root: process.env.MUSIC_DIR ?? '/data/Music',
      dryRun: body.dryRun !== false,
      store: {
        findArtistId: async (key) => (await drizzle
          .select({ id: schema.musicArtists.id })
          .from(schema.musicArtists)
          .where(eq(schema.musicArtists.nameKey, key))
          .limit(1))[0]?.id ?? null,
        createArtist: async (name, key) => (await drizzle
          .insert(schema.musicArtists)
          .values({ name, nameKey: key })
          .returning({ id: schema.musicArtists.id }))[0].id,
        findAlbumId: async (artistId, titleKey) => (await drizzle
          .select({ id: schema.musicAlbums.id })
          .from(schema.musicAlbums)
          .where(and(
            eq(schema.musicAlbums.artistId, artistId),
            eq(schema.musicAlbums.titleKey, titleKey),
          ))
          .limit(1))[0]?.id ?? null,
        createAlbum: async (input) => (await drizzle
          .insert(schema.musicAlbums)
          .values(input)
          .returning({ id: schema.musicAlbums.id }))[0].id,
        upsertTrack: async (input) => {
          const existing = (await drizzle
            .select({ id: schema.musicTracks.id })
            .from(schema.musicTracks)
            .where(eq(schema.musicTracks.path, input.path))
            .limit(1))[0];
          if (existing) {
            await drizzle.update(schema.musicTracks).set(input).where(eq(schema.musicTracks.id, existing.id));
          } else {
            await drizzle.insert(schema.musicTracks).values(input);
          }
        },
      },
    });
    return sendSuccess(reply, summary);
  });
}
