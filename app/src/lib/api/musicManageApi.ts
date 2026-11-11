import { z } from 'zod';
import { ApiHttpClient } from './httpClient';

/**
 * Music library management API (track feature_spa_management_surfaces_20261111, Phase 3).
 *
 * The server owns `/api/music/*` (track feature_music_library_20261107). This module is standalone
 * rather than part of `createApiClients` so the music surface can ship without touching the shared
 * registry; it reuses the same `ApiHttpClient` envelope/error contract as every other module.
 *
 * Deliberately absent: track delete and library retag. The server has no delete route, and
 * `POST /api/music/tag` only accepts a path *inside* the staging folder, so it cannot retag an
 * existing library track. Both are reported as server gaps instead of dead buttons (FR-6).
 */

const artistSchema = z.object({
  id: z.number(),
  name: z.string(),
  albumCount: z.number(),
  trackCount: z.number(),
});

const albumSchema = z.object({
  id: z.number(),
  artistId: z.number(),
  title: z.string(),
  year: z.number().nullable().optional(),
  artworkPath: z.string().nullable().optional(),
  added: z.string().optional(),
  trackCount: z.number().optional().default(0),
  artworkUrl: z.string().optional(),
});

const albumTrackSchema = z.object({
  id: z.number(),
  title: z.string(),
  trackNumber: z.number().nullable().optional(),
  discNumber: z.number().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
  isPlayed: z.boolean().optional().default(false),
  playCount: z.number().optional().default(0),
});

const albumDetailSchema = albumSchema.extend({
  tracks: z.array(albumTrackSchema),
});

const trackSearchItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  albumId: z.number(),
  artistId: z.number(),
  artistName: z.string(),
  albumTitle: z.string(),
  albumArtworkUrl: z.string().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
  trackNumber: z.number().nullable().optional(),
  discNumber: z.number().nullable().optional(),
  isPlayed: z.boolean().optional().default(false),
  playCount: z.number().optional().default(0),
  lastPlayedAt: z.string().nullable().optional(),
});

const trackSearchSchema = z.object({
  items: z.array(trackSearchItemSchema),
  count: z.number(),
  total: z.number(),
  offset: z.number(),
  limit: z.number(),
  query: z.string().optional().default(''),
});

const listeningArtistSchema = z.object({
  name: z.string(),
  plays: z.number(),
  lastPlayedAt: z.string().nullable(),
  tracks: z.number(),
});

const listeningTrackSchema = z.object({
  id: z.number(),
  title: z.string(),
  artist: z.string(),
  playCount: z.number(),
  lastPlayedAt: z.string().nullable(),
});

const listeningProfileSchema = z.object({
  artists: z.array(listeningArtistSchema),
  tracks: z.array(listeningTrackSchema),
  recentlyPlayed: z.array(listeningTrackSchema),
  library: z.object({
    trackCount: z.number(),
    artistNames: z.array(z.string()),
    /** "artist — title"; the profile sends it and the weekly run dedupes against it. */
    trackKeys: z.array(z.string()).optional().default([]),
  }),
  dataQuality: z.object({
    playsObserved: z.number(),
    tracksPlayed: z.number(),
    lastPlayedAt: z.string().nullable(),
    insufficientHistory: z.boolean(),
  }),
});

export const receiptStatuses = ['FILED', 'REVIEW', 'FAILED', 'SKIPPED'] as const;

const receiptSchema = z.object({
  at: z.string(),
  videoId: z.string(),
  status: z.string(),
  reason: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
});

const deleteTrackResultSchema = z.object({
  trackId: z.number(),
  title: z.string(),
  path: z.string(),
  fileDeleted: z.boolean(),
});

const receiptsSchema = z.object({
  receipts: z.array(receiptSchema),
  summary: z.object({
    attempted: z.number(),
    filed: z.number(),
    review: z.number(),
    failed: z.number(),
    skipped: z.number(),
  }),
  count: z.number(),
});

const scanSummarySchema = z.object({
  scanned: z.number(),
  artists: z.number(),
  albums: z.number(),
  tracks: z.number(),
  unreadable: z.array(z.object({ path: z.string(), error: z.string() })).optional().default([]),
});

const tagOutcomeSchema = z.object({
  ok: z.boolean(),
  filed: z.boolean(),
  finalPath: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
});

const ingestHintsSchema = z.object({
  artist: z.string().nullable(),
  album: z.string().nullable(),
  title: z.string().nullable(),
  year: z.number().nullable(),
});

const ingestResultSchema = z.object({
  videoId: z.string(),
  ok: z.boolean(),
  audioPath: z.string().optional(),
  thumbnailPath: z.string().nullable().optional(),
  sizeBytes: z.number().optional(),
  hints: ingestHintsSchema.nullable().optional(),
  error: z.string().nullable().optional(),
  /** Set when the ledger already had this video or an identical audio hash. */
  skipped: z.string().optional(),
  existingVideoId: z.string().optional(),
  audioHash: z.string().nullable().optional(),
  tag: tagOutcomeSchema.nullable().optional(),
  receipt: receiptSchema.optional(),
});

export type MusicArtist = z.infer<typeof artistSchema>;
export type MusicAlbum = z.infer<typeof albumSchema>;
export type MusicAlbumTrack = z.infer<typeof albumTrackSchema>;
export type MusicAlbumDetail = z.infer<typeof albumDetailSchema>;
export type MusicTrackSearchItem = z.infer<typeof trackSearchItemSchema>;
export type MusicTrackSearch = z.infer<typeof trackSearchSchema>;
export type MusicListeningProfile = z.infer<typeof listeningProfileSchema>;
export type MusicReceipt = z.infer<typeof receiptSchema>;
export type MusicReceipts = z.infer<typeof receiptsSchema>;
export type MusicScanSummary = z.infer<typeof scanSummarySchema>;
export type MusicTagOutcome = z.infer<typeof tagOutcomeSchema>;
export type MusicIngestResult = z.infer<typeof ingestResultSchema>;

export interface MusicDeleteResult {
  trackId: number;
  title: string;
  path: string;
  fileDeleted: boolean;
}

export interface MusicTrackQuery {
  q?: string;
  artistId?: number;
  albumId?: number;
  sort?: 'title' | 'recent';
  limit?: number;
  offset?: number;
}

export function albumArtworkUrl(albumId: number): string {
  return `/api/music/albums/${albumId}/artwork`;
}

export function trackStreamUrl(trackId: number): string {
  return `/api/music/tracks/${trackId}/stream`;
}

export function createMusicManageApi(client: ApiHttpClient) {
  return {
    listArtists(): Promise<MusicArtist[]> {
      return client.request({ path: '/api/music/artists' }, z.array(artistSchema));
    },

    /** Albums for one artist (the route returns every album when `artistId` is omitted). */
    listAlbums(artistId?: number): Promise<MusicAlbum[]> {
      return client.request(
        { path: '/api/music/albums', query: artistId === undefined ? undefined : { artistId } },
        z.array(albumSchema),
      );
    },

    getAlbum(id: number): Promise<MusicAlbumDetail> {
      return client.request({ path: `/api/music/albums/${id}` }, albumDetailSchema);
    },

    /** Track search across title, artist and album. */
    searchTracks(query: MusicTrackQuery = {}): Promise<MusicTrackSearch> {
      return client.request({ path: '/api/music/tracks', query }, trackSearchSchema);
    },

    getListeningProfile(): Promise<MusicListeningProfile> {
      return client.request({ path: '/api/music/listening-profile' }, listeningProfileSchema);
    },

    /**
     * Scan `MUSIC_DIR`. Dry-run by default; the route flips to apply only with `dryRun: false`.
     * The summary is honest about unreadable files rather than swallowing them.
     */
    scan(dryRun = true): Promise<MusicScanSummary> {
      return client.request(
        { path: '/api/music/scan', method: 'POST', body: { dryRun } },
        scanSummarySchema,
      );
    },

    /**
     * Download one YouTube video into the music staging folder and (by default) file it with beets.
     * Slow (~60 s); the page shows a pending state. A `REVIEW` outcome is a successful ingest whose
     * tag was uncertain — the caller reads `tag.reason`, not `ok`.
     */
    ingest(url: string): Promise<MusicIngestResult> {
      return client.request(
        { path: '/api/music/ingest', method: 'POST', body: { url, tag: true } },
        ingestResultSchema,
      );
    },

    /**
     * Delete one library track: the server unlinks the file only inside MUSIC_DIR and drops the row.
     * `fileDeleted:false` means the file was already gone but the phantom row was removed.
     */
    deleteTrack(trackId: number): Promise<MusicDeleteResult> {
      return client.request(
        { path: `/api/music/tracks/${trackId}`, method: 'DELETE' },
        deleteTrackResultSchema,
      );
    },

    getReceipts(limit = 20): Promise<MusicReceipts> {
      return client.request({ path: '/api/music/receipts', query: { limit } }, receiptsSchema);
    },
  };
}

export type MusicManageApi = ReturnType<typeof createMusicManageApi>;

/** Singleton for the SPA (same-origin API). Tests mock this module's export. */
export const musicManageApi: MusicManageApi = createMusicManageApi(new ApiHttpClient({ baseUrl: '' }));
