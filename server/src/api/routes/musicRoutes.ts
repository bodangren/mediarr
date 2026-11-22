import { execFile } from 'node:child_process';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { sendByteRangeStream } from '../utils/byteRangeStreaming';

const execFileAsync = promisify(execFile);
import pathPosix from 'node:path/posix';
import type { FastifyInstance } from 'fastify';
import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { runMusicLibraryScan } from '../../services/MusicLibraryScan';
import { MusicIngestService } from '../../services/MusicIngestService';
import { MusicTaggerService } from '../../services/MusicTaggerService';
import { audioHashOf, decideIngest } from '../../services/MusicIngestLedger';
import { appendIngestReceipt, readIngestReceipts, summarizeReceipts } from '../../services/MusicAutomation';
import { normalizeYoutubeVideoId } from '../../services/YoutubeLibrary';
import { applyMusicProgress } from '../../services/musicProgress';
import { buildListeningProfile } from '../../services/musicListeningProfile';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';

/** Music library endpoints (track feature_music_library_20261107). Own domain under /api/music/*. */
export function registerMusicRoutes(app: FastifyInstance, deps: ApiDependencies): void {
  const drizzle = (deps.prisma as unknown as { drizzle: any }).drizzle;

  /** Audio streaming with Range support, reusing the video handler's contract (206 + Content-Range). */
  /** Client heartbeat from the TV music player; feeds "recently listened" for the weekly picks pass. */
  app.post('/api/music/tracks/:id/progress', async (request, reply) => {
    const rawId = (request.params as { id?: string }).id;
    const trackId = Number.parseInt(String(rawId ?? ''), 10);
    if (!Number.isInteger(trackId) || trackId <= 0) {
      return reply.code(422).send({
        ok: false,
        error: { code: 'INVALID_ID', message: 'track id must be a positive integer' },
      });
    }
    const body = (request.body ?? {}) as { position?: unknown; duration?: unknown };
    const position = Number(body.position);
    const duration = Number(body.duration);
    if (!Number.isFinite(position) || !Number.isFinite(duration) || position < 0 || duration < 0) {
      return reply.code(422).send({
        ok: false,
        error: { code: 'INVALID_PROGRESS', message: 'position and duration must be non-negative numbers' },
      });
    }
    const current = (await drizzle
      .select({
        position: schema.musicTracks.position,
        isPlayed: schema.musicTracks.isPlayed,
        playCount: schema.musicTracks.playCount,
        lastPlayedAt: schema.musicTracks.lastPlayedAt,
      })
      .from(schema.musicTracks)
      .where(eq(schema.musicTracks.id, trackId))
      .limit(1))[0] as { position: number; isPlayed: boolean; playCount: number; lastPlayedAt: Date | null } | undefined;
    if (!current) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'track not found' } });
    }
    const update = applyMusicProgress(current, { position, duration });
    await drizzle.update(schema.musicTracks).set(update).where(eq(schema.musicTracks.id, trackId));
    return sendSuccess(reply, { trackId, ...update });
  });

  app.get('/api/music/tracks/:id/stream', async (request, reply) => {
    const id = Number.parseInt(String((request.params as { id?: string }).id ?? ''), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(422).send({ ok: false, error: { code: 'INVALID_ID', message: 'id must be a positive integer' } });
    }
    const row = (await drizzle
      .select({ path: schema.musicTracks.path })
      .from(schema.musicTracks)
      .where(eq(schema.musicTracks.id, id))
      .limit(1))[0];
    if (!row?.path) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Track not found' } });
    }
    try {
      await fsp.access(row.path);
    } catch {
      return reply.code(404).send({ ok: false, error: { code: 'FILE_MISSING', message: 'Audio file is missing on disk' } });
    }
    return sendByteRangeStream(reply, row.path, request.headers.range);
  });

  /**
   * Album artwork: folder image if the scan found one, else embedded art extracted once into a cache
   * file (ffmpeg), else 404 so clients can render their own placeholder.
   */
  app.get('/api/music/albums/:id/artwork', async (request, reply) => {
    const id = Number.parseInt(String((request.params as { id?: string })?.id ?? ''), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(422).send({ ok: false, error: { code: 'INVALID_ID', message: 'id must be a positive integer' } });
    }
    const album = (await drizzle
      .select({ artworkPath: schema.musicAlbums.artworkPath })
      .from(schema.musicAlbums)
      .where(eq(schema.musicAlbums.id, id))
      .limit(1))[0];
    if (!album) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Album not found' } });
    }

    const cached = path.join(process.env.CONFIG_DIR ?? '/config', 'cache', 'music-artwork', `album-${id}.jpg`);
    const serve = async (file: string) => {
      const data = await fsp.readFile(file);
      reply.header('Content-Type', 'image/jpeg');
      reply.header('Cache-Control', 'public, max-age=86400, immutable');
      return reply.send(data);
    };

    if (typeof album.artworkPath === 'string' && album.artworkPath.length > 0) {
      try {
        return await serve(album.artworkPath);
      } catch {
        // Fall through to embedded artwork / cache.
      }
    }
    try {
      return await serve(cached);
    } catch {
      // Not cached yet.
    }

    const track = (await drizzle
      .select({ path: schema.musicTracks.path })
      .from(schema.musicTracks)
      .where(eq(schema.musicTracks.albumId, id))
      .limit(1))[0];
    if (!track?.path) {
      return reply.code(404).send({ ok: false, error: { code: 'NO_ARTWORK', message: 'No artwork for this album' } });
    }
    try {
      await fsp.mkdir(path.dirname(cached), { recursive: true });
      await execFileAsync(
        process.env.FFMPEG_PATH ?? 'ffmpeg',
        ['-y', '-i', track.path, '-map', '0:v:0', '-frames:v', '1', '-f', 'image2', cached],
        { timeout: 20_000 },
      );
      return await serve(cached);
    } catch {
      return reply.code(404).send({ ok: false, error: { code: 'NO_ARTWORK', message: 'No embedded artwork for this album' } });
    }
  });

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
    const recent = String(query.recent ?? '') === '1';
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
        added: schema.musicAlbums.added,
      })
      .from(schema.musicAlbums)
      .where(conditions)
      .orderBy(recent ? desc(schema.musicAlbums.added) : asc(schema.musicAlbums.title))
      .limit(recent ? 50 : 500);
    const tracks = await drizzle
      .select({ albumId: schema.musicTracks.albumId })
      .from(schema.musicTracks);
    const counts = new Map<number, number>();
    for (const row of tracks) counts.set(row.albumId, (counts.get(row.albumId) ?? 0) + 1);
    return sendSuccess(reply, rows.map((album: { id: number }) => ({
      ...album,
      trackCount: counts.get(album.id) ?? 0,
      artworkUrl: `/api/music/albums/${album.id}/artwork`,
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
        // Needed by the client to level music against video (see MusicLoudness).
        loudnessLufs: schema.musicTracks.loudnessLufs,
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

  /**
   * Track library/search endpoint. Supports q (title/artist/album), artistId, albumId, sort
   * (title|recent), offset/limit and reports the total so the TV can paginate "play all".
   */
  app.get('/api/music/tracks', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const term = typeof query.q === 'string' ? query.q.trim() : '';
    const artistId = Number.parseInt(String(query.artistId ?? ''), 10);
    const albumId = Number.parseInt(String(query.albumId ?? ''), 10);
    const sort = String(query.sort ?? 'title');
    const offset = Math.max(0, Number.parseInt(String(query.offset ?? '0'), 10) || 0);
    const limit = Math.max(1, Math.min(500, Number.parseInt(String(query.limit ?? '100'), 10) || 100));
    const pattern = `%${term.replace(/[%_]/g, '')}%`;
    const conditions = [
      term.length === 0 ? undefined : or(
        like(schema.musicTracks.title, pattern),
        like(schema.musicArtists.name, pattern),
        like(schema.musicAlbums.title, pattern),
      ),
      Number.isInteger(artistId) && artistId > 0 ? eq(schema.musicTracks.artistId, artistId) : undefined,
      Number.isInteger(albumId) && albumId > 0 ? eq(schema.musicTracks.albumId, albumId) : undefined,
    ].filter(Boolean);
    const where = conditions.length === 0 ? undefined : and(...conditions as Parameters<typeof and>);
    const base = drizzle
      .select({
        id: schema.musicTracks.id,
        title: schema.musicTracks.title,
        albumId: schema.musicTracks.albumId,
        artistId: schema.musicTracks.artistId,
        artistName: schema.musicArtists.name,
        albumTitle: schema.musicAlbums.title,
        albumArtworkUrl: sql<string>`concat('/api/music/albums/', ${schema.musicTracks.albumId}, '/artwork')`,
        durationSeconds: schema.musicTracks.durationSeconds,
        // Needed by the client to level music against video (see MusicLoudness).
        loudnessLufs: schema.musicTracks.loudnessLufs,
        trackNumber: schema.musicTracks.trackNumber,
        discNumber: schema.musicTracks.discNumber,
        isPlayed: schema.musicTracks.isPlayed,
        playCount: schema.musicTracks.playCount,
        lastPlayedAt: schema.musicTracks.lastPlayedAt,
      })
      .from(schema.musicTracks)
      .innerJoin(schema.musicAlbums, eq(schema.musicAlbums.id, schema.musicTracks.albumId))
      .innerJoin(schema.musicArtists, eq(schema.musicArtists.id, schema.musicTracks.artistId));
    const rows = await (where ? base.where(where) : base)
      .orderBy(sort === 'recent' ? desc(sql`coalesce(${schema.musicTracks.lastPlayedAt}, 0)`) : asc(schema.musicTracks.title))
      .limit(limit)
      .offset(offset);
    const totalRows = await drizzle
      .select({ total: sql<number>`count(*)` })
      .from(schema.musicTracks)
      .innerJoin(schema.musicAlbums, eq(schema.musicAlbums.id, schema.musicTracks.albumId))
      .innerJoin(schema.musicArtists, eq(schema.musicArtists.id, schema.musicTracks.artistId))
      .where(where ?? undefined);
    return sendSuccess(reply, {
      items: rows,
      count: rows.length,
      total: Number(totalRows[0]?.total ?? rows.length),
      offset,
      limit,
      query: term,
    });
  });

  /**
   * Delete one library track (owner-managed collection action, SPA Music section). The file is only
   * unlinked when its resolved path is inside MUSIC_DIR; a missing file still drops the row so a
   * half-deleted scan cannot leave a phantom track. No cascade: the scanner rebuilds artists/albums.
   */
  app.delete('/api/music/tracks/:id', async (request, reply) => {
    const id = Number.parseInt(String((request.params as { id?: string }).id ?? ''), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(422).send({
        ok: false,
        error: { code: 'INVALID_ID', message: 'track id must be a positive integer' },
      });
    }
    const musicRoot = path.resolve(process.env.MUSIC_DIR ?? '/data/Music');
    const rows = await drizzle
      .select({ id: schema.musicTracks.id, path: schema.musicTracks.path, title: schema.musicTracks.title })
      .from(schema.musicTracks)
      .where(eq(schema.musicTracks.id, id))
      .limit(1);
    const track = rows[0] as { id: number; path: string; title: string } | undefined;
    if (!track) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'track not found' } });
    }
    const resolved = path.resolve(track.path);
    if (resolved !== musicRoot && !resolved.startsWith(`${musicRoot}${path.sep}`)) {
      return reply.code(422).send({
        ok: false,
        error: { code: 'OUTSIDE_MUSIC_ROOT', message: `refusing to delete a path outside ${musicRoot}: ${track.path}` },
      });
    }
    let fileDeleted = false;
    try {
      await fsp.unlink(resolved);
      fileDeleted = true;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        return reply.code(500).send({
          ok: false,
          error: { code: 'DELETE_FAILED', message: (error as Error).message },
        });
      }
    }
    await drizzle.delete(schema.musicTracks).where(eq(schema.musicTracks.id, id));
    return sendSuccess(reply, { trackId: id, title: track.title, path: track.path, fileDeleted });
  });

  /**
   * Listening profile for the weekly discovery run (owner decision 2026-11-11: discover from what
   * the owner actually listens to). Pure aggregation in `musicListeningProfile`; this route only
   * joins the playback columns with artist names.
   */
  app.get('/api/music/listening-profile', async (_request, reply) => {
    const rows = await drizzle
      .select({
        id: schema.musicTracks.id,
        title: schema.musicTracks.title,
        artistName: schema.musicArtists.name,
        playCount: schema.musicTracks.playCount,
        lastPlayedAt: schema.musicTracks.lastPlayedAt,
        isPlayed: schema.musicTracks.isPlayed,
        position: schema.musicTracks.position,
      })
      .from(schema.musicTracks)
      .innerJoin(schema.musicArtists, eq(schema.musicArtists.id, schema.musicTracks.artistId));
    return sendSuccess(reply, buildListeningProfile(rows));
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

    // A failed ingest must never be silent: log the exact tool error and publish it on the event hub
    // (the receipt alone is only discovered by someone who goes looking).
    if (!result.ok) {
      const message = result.error ?? 'ingest failed';
      console.error(`[Music] Ingest failed for ${videoId}: ${message}`);
      try {
        deps.eventHub?.publish('notification:music-ingest-failure', { videoId, error: message });
      } catch {
        // The journal line above is the fallback when no subscriber is attached.
      }
    } else if (tag?.filed !== true) {
      console.warn(`[Music] Ingest filed to review for ${videoId}: ${tag?.reason ?? 'needs review'}`);
    }

    return sendSuccess(reply, { videoId, ...result, tag, audioHash, receipt });
  });

  /** Scan /data/Music (or MUSIC_DIR): dry-run by default, idempotent by file path. */
  app.post('/api/music/scan', async (request, reply) => {
    const body = (request.body ?? {}) as { dryRun?: boolean };
    const summary = await runMusicLibraryScan(drizzle, { dryRun: body.dryRun !== false });
    return sendSuccess(reply, summary);
  });
}
