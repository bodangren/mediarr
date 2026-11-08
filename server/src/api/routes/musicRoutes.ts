import pathPosix from 'node:path/posix';
import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { scanMusicLibrary } from '../../services/MusicScanner';
import { MusicIngestService } from '../../services/MusicIngestService';
import { MusicTaggerService } from '../../services/MusicTaggerService';
import { normalizeYoutubeVideoId } from '../../services/YoutubeLibrary';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';

/** Music library endpoints (track feature_music_library_20261107). Own domain under /api/music/*. */
export function registerMusicRoutes(app: FastifyInstance, deps: ApiDependencies): void {
  const drizzle = (deps.prisma as unknown as { drizzle: any }).drizzle;

  /** Tag one staged file with beets and file it into the library tree / review folder. */
  app.post('/api/music/tag', async (request, reply) => {
    const body = (request.body ?? {}) as { path?: string };
    const musicRoot = process.env.MUSIC_DIR ?? '/data/Music';
    const stagingDir = process.env.MUSIC_STAGING_DIR ?? '/data/Music/_incoming';
    const stagedPath = typeof body.path === 'string' ? body.path : '';
    // Guard: only files inside the staging folder may be moved by this endpoint.
    if (!pathPosix.normalize(stagedPath).startsWith(`${pathPosix.normalize(stagingDir)}/`)) {
      return reply.code(422).send({
        ok: false,
        error: { code: 'OUTSIDE_STAGING', message: 'path must be inside the music staging folder' },
      });
    }
    const service = new MusicTaggerService({
      musicRoot,
      reviewDir: pathPosix.join(musicRoot, '_review'),
    });
    const result = await service.tagAndFile(stagedPath);
    return sendSuccess(reply, result);
  });

  /** Ingest one YouTube video as m4a 256k into the staging folder (beets tagging follows). */
  app.post('/api/music/ingest', async (request, reply) => {
    const body = (request.body ?? {}) as { url?: string; videoId?: string; tag?: boolean };
    const videoId = normalizeYoutubeVideoId(body.videoId ?? body.url ?? null);
    if (videoId === null) {
      return reply.code(422).send({
        ok: false,
        error: { code: 'INVALID_URL', message: 'url/videoId must identify a YouTube video' },
      });
    }
    const service = new MusicIngestService({
      stagingDir: process.env.MUSIC_STAGING_DIR ?? '/data/Music/_incoming',
    });
    const result = await service.ingest(videoId);
    // Hands-off default: tag and file immediately after a successful ingest, so an owner doesn't have
    // to make two calls; the /tag endpoint remains for retries and review items.
    let tag = null;
    if (result.ok && result.audioPath !== undefined && body.tag !== false) {
      const musicRoot = process.env.MUSIC_DIR ?? '/data/Music';
      tag = await new MusicTaggerService({
        musicRoot,
        reviewDir: pathPosix.join(musicRoot, '_review'),
      }).tagAndFile(result.audioPath);
    }
    return sendSuccess(reply, { videoId, ...result, tag });
  });

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
