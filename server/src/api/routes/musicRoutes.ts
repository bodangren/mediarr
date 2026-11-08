import fsp from 'node:fs/promises';
import pathPosix from 'node:path/posix';
import type { FastifyInstance } from 'fastify';
import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { scanMusicLibrary } from '../../services/MusicScanner';
import { MusicIngestService } from '../../services/MusicIngestService';
import { MusicTaggerService } from '../../services/MusicTaggerService';
import { audioHashOf, decideIngest } from '../../services/MusicIngestLedger';
import { appendIngestReceipt, readIngestReceipts, summarizeReceipts } from '../../services/MusicAutomation';
import { normalizeYoutubeVideoId } from '../../services/YoutubeLibrary';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';

/** Music library endpoints (track feature_music_library_20261107). Own domain under /api/music/*. */
export function registerMusicRoutes(app: FastifyInstance, deps: ApiDependencies): void {
  const drizzle = (deps.prisma as unknown as { drizzle: any }).drizzle;

  /** Artists with album and track counts. */
  app.get('/api/music/artists', async (_request, reply) => {
    const artists = await drizzle
      .select({ id: schema.musicArtists.id, name: schema.musicArtists.name })
      .from(schema.musicArtists)
      .orderBy(asc(schema.musicArtists.name));
    const albums = await drizzle
      .select({ artistId: schema.musicAlbums.artistId })
      .from(schema.musicAlbums);
    const tracks = await drizzle
      .select({ artistId: schema.musicTracks.artistId })
      .from(schema.musicTracks);
    const albumCounts = new Map<number, number>();
    for (const row of albums) albumCounts.set(row.artistId, (albumCounts.get(row.artistId) ?? 0) + 1);
    const trackCounts = new Map<number, number>();
    for (const row of tracks) trackCounts.set(row.artistId, (trackCounts.get(row.artistId) ?? 0) + 1);
    return sendSuccess(reply, artists.map((artist: { id: number; name: string }) => ({
      ...artist,
      albumCount: albumCounts.get(artist.id) ?? 0,
      trackCount: trackCounts.get(artist.id) ?? 0,
    })));
  });

  /** Albums, optionally for one artist; trackCount per album. */
  app.get('/api/music/albums', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const artistId = Number.parseInt(String(query.artistId ?? ''), 10);
    const conditions = Number.isInteger(artistId) && artistId > 0
      ? eq(schema.musicAlbums.artistId, artistId)
      : undefined;
    const rows = await drizzle
      .select({
        id: schema.musicAlbums.id,
        artistId: schema.musicAlbums.artistId,
        title: schema.musicAlbums.title,
        year: schema.musicAlbums.year,
        artworkPath: schema.musicAlbums.artworkPath,
      })
      .from(schema.musicAlbums)
      .where(conditions)
      .orderBy(asc(schema.musicAlbums.title));
    const tracks = await drizzle
      .select({ albumId: schema.musicTracks.albumId })
      .from(schema.musicTracks);
    const counts = new Map<number, number>();
    for (const row of tracks) counts.set(row.albumId, (counts.get(row.albumId) ?? 0) + 1);
    return sendSuccess(reply, rows.map((album: { id: number }) => ({
      ...album,
      trackCount: counts.get(album.id) ?? 0,
    })));
  });

  /** One album with its tracks in disc/track order, untagged numbers last. */
  app.get('/api/music/albums/:id', async (request, reply) => {
    const id = Number.parseInt(String((request.params as { id?: string }).id ?? ''), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(422).send({ ok: false, error: { code: 'INVALID_ID', message: 'id must be a positive integer' } });
    }
    const album = (await drizzle
      .select()
      .from(schema.musicAlbums)
      .where(eq(schema.musicAlbums.id, id))
      .limit(1))[0];
    if (!album) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Album not found' } });
    }
    const tracks = await drizzle
      .select({
        id: schema.musicTracks.id,
        title: schema.musicTracks.title,
        trackNumber: schema.musicTracks.trackNumber,
        discNumber: schema.musicTracks.discNumber,
        durationSeconds: schema.musicTracks.durationSeconds,
        isPlayed: schema.musicTracks.isPlayed,
        playCount: schema.musicTracks.playCount,
      })
      .from(schema.musicTracks)
      .where(eq(schema.musicTracks.albumId, id))
      .orderBy(
        asc(sql`coalesce(${schema.musicTracks.discNumber}, 0)`),
        asc(sql`coalesce(${schema.musicTracks.trackNumber}, 9999)`),
      );
    return sendSuccess(reply, { ...album, tracks });
  });

  /** Track search over title, artist name and album title. */
  app.get('/api/music/tracks', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const term = typeof query.q === 'string' ? query.q.trim() : '';
    const limit = Math.max(1, Math.min(200, Number.parseInt(String(query.limit ?? '100'), 10) || 100));
    const pattern = `%${term.replace(/[%_]/g, '')}%`;
    const rows = await drizzle
      .select({
        id: schema.musicTracks.id,
        title: schema.musicTracks.title,
        albumId: schema.musicTracks.albumId,
        artistId: schema.musicTracks.artistId,
        durationSeconds: schema.musicTracks.durationSeconds,
        isPlayed: schema.musicTracks.isPlayed,
      })
      .from(schema.musicTracks)
      .innerJoin(schema.musicAlbums, eq(schema.musicAlbums.id, schema.musicTracks.albumId))
      .innerJoin(schema.musicArtists, eq(schema.musicArtists.id, schema.musicTracks.artistId))
      .where(term.length === 0 ? undefined : or(
        like(schema.musicTracks.title, pattern),
        like(schema.musicArtists.name, pattern),
        like(schema.musicAlbums.title, pattern),
      ))
      .orderBy(asc(schema.musicTracks.title))
      .limit(limit);
    return sendSuccess(reply, { items: rows, count: rows.length, query: term });
  });

  /** Recent ingest receipts plus a summary: answers 'why did this song not appear?'. */
  app.get('/api/music/receipts', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const limit = Math.max(1, Math.min(200, Number.parseInt(String(query.limit ?? '50'), 10) || 50));
    const receipts = await readIngestReceipts(process.env.CONFIG_DIR ?? '/config', limit);
    return sendSuccess(reply, { receipts, summary: summarizeReceipts(receipts), count: receipts.length });
  });

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
    const existing = await drizzle
      .select({ videoId: schema.musicIngestLog.videoId, audioHash: schema.musicIngestLog.audioHash, status: schema.musicIngestLog.status })
      .from(schema.musicIngestLog);
    const videoDecision = decideIngest(videoId, null, existing);
    if (videoDecision.duplicate) {
      await appendIngestReceipt(process.env.CONFIG_DIR ?? '/config', {
        videoId, status: 'SKIPPED', reason: 'duplicate-video', path: null,
      });
      return sendSuccess(reply, { videoId, ok: true, skipped: 'duplicate-video', existingVideoId: videoDecision.existingVideoId });
    }

    const service = new MusicIngestService({
      stagingDir: process.env.MUSIC_STAGING_DIR ?? '/data/Music/_incoming',
    });
    const result = await service.ingest(videoId);

    let audioHash: string | null = null;
    if (result.ok && result.audioPath !== undefined) {
      try {
        audioHash = await audioHashOf(result.audioPath);
      } catch {
        audioHash = null;
      }
      const audioDecision = decideIngest(videoId, audioHash, existing);
      if (audioDecision.duplicate) {
        await fsp.unlink(result.audioPath).catch(() => undefined);
        await appendIngestReceipt(process.env.CONFIG_DIR ?? '/config', {
          videoId, status: 'SKIPPED', reason: 'duplicate-audio', path: null,
        });
        return sendSuccess(reply, { videoId, ok: true, skipped: 'duplicate-audio', existingVideoId: audioDecision.existingVideoId });
      }
    }
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
    await drizzle.insert(schema.musicIngestLog).values({
      videoId,
      audioHash,
      status: result.ok ? (tag?.filed === true ? 'FILED' : 'REVIEW') : 'FAILED',
      trackPath: tag?.finalPath ?? result.audioPath ?? null,
      error: result.ok ? (tag?.reason ?? null) : (result.error ?? 'ingest failed'),
    }).onConflictDoNothing();

    const receipt = await appendIngestReceipt(process.env.CONFIG_DIR ?? '/config', {
      videoId,
      status: result.ok ? (tag?.filed === true ? 'FILED' : 'REVIEW') : 'FAILED',
      reason: result.ok ? (tag?.reason ?? null) : (result.error ?? 'ingest failed'),
      path: tag?.finalPath ?? result.audioPath ?? null,
    });

    return sendSuccess(reply, { videoId, ...result, tag, audioHash, receipt });
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
