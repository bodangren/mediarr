import { execFile } from 'node:child_process';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import {
  albumTitleKey,
  nameKey,
  resolveAlbum,
  resolveArtist,
  resolveTitle,
  summarizeScan,
  type ScanSummary,
} from './MusicLibrary';

/**
 * Tag scanner for the Music library (track feature_music_library_20261107, Phase 1).
 *
 * Reads tags with maintained tooling (ffprobe JSON) instead of parsing ID3 by hand, uses the tested
 * identity rules to avoid duplicate artists/albums, upserts by file path so a re-scan is idempotent,
 * and reports every unreadable file instead of skipping it.
 */

const execFileAsync = promisify(execFile);

const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.m4a', '.aac', '.ogg', '.oga', '.opus', '.wav', '.wma']);

export function isAudioFile(name: string): boolean {
  return AUDIO_EXTENSIONS.has(path.extname(name).toLowerCase()) && !name.startsWith('.');
}

export interface ProbedTrack {
  artist: string | null;
  /** Album artist: for compilations this is "Various Artists" while `artist` varies per track. */
  albumArtist?: string | null;
  album: string | null;
  title: string | null;
  trackNumber: number | null;
  discNumber: number | null;
  durationSeconds: number | null;
  format: string | null;
  bitrate: number | null;
  sizeBytes: number | null;
}

function tagValue(tags: Record<string, unknown>, ...names: string[]): string | null {
  for (const name of names) {
    for (const [key, value] of Object.entries(tags)) {
      if (key.toLowerCase() === name.toLowerCase() && typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
  }
  return null;
}

function positiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.trunc(value);
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.split('/')[0]!.trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

/** Pure ffprobe-JSON → track metadata mapping (exported for tests). */
export function parseProbeOutput(payload: unknown): ProbedTrack {
  const format = (payload as { format?: Record<string, unknown> })?.format ?? {};
  const streams = (payload as { streams?: Array<Record<string, unknown>> })?.streams ?? [];
  const audio = streams.find((stream) => stream['codec_type'] === 'audio') ?? {};
  const tags = (format['tags'] as Record<string, unknown> | undefined) ?? {};

  const duration = Number(format['duration']);
  const bitrate = Number(format['bit_rate']);
  const size = Number(format['size']);

  return {
    artist: tagValue(tags, 'artist'),
    albumArtist: tagValue(tags, 'album_artist', 'albumartist'),
    album: tagValue(tags, 'album'),
    title: tagValue(tags, 'title'),
    trackNumber: positiveInt(tagValue(tags, 'track', 'tracknumber') ?? format['track']),
    discNumber: positiveInt(tagValue(tags, 'disc', 'discnumber') ?? format['disc']),
    durationSeconds: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null,
    format: typeof audio['codec_name'] === 'string' ? String(audio['codec_name']) : null,
    bitrate: Number.isFinite(bitrate) && bitrate > 0 ? Math.trunc(bitrate) : null,
    sizeBytes: Number.isFinite(size) && size > 0 ? Math.trunc(size) : null,
  };
}

/** Finds a folder-level cover image; embedded artwork extraction is a Phase 3 concern. */
export async function findFolderArtwork(directory: string): Promise<string | null> {
  try {
    const entries = await fsp.readdir(directory);
    const match = entries.find((name) => /^(cover|folder|front|album|albumart)(-\d+)?\.(jpe?g|png|webp)$/i.test(name));
    return match === undefined ? null : path.join(directory, match);
  } catch {
    return null;
  }
}

export interface MusicScanStore {
  findArtistId(nameKeyValue: string): Promise<number | null>;
  createArtist(name: string, nameKeyValue: string): Promise<number>;
  findAlbumId(artistId: number, titleKeyValue: string): Promise<number | null>;
  createAlbum(input: { artistId: number; title: string; titleKey: string; artworkPath: string | null }): Promise<number>;
  upsertTrack(input: {
    path: string;
    artistId: number;
    albumId: number;
    title: string;
    trackNumber: number | null;
    discNumber: number | null;
    durationSeconds: number | null;
    format: string | null;
    bitrate: number | null;
    sizeBytes: number | null;
  }): Promise<void>;
}

export interface MusicScannerOptions {
  root: string;
  store: MusicScanStore;
  probe?: (file: string) => Promise<ProbedTrack>;
  dryRun?: boolean;
}

export async function scanMusicLibrary(options: MusicScannerOptions): Promise<ScanSummary> {
  const dryRun = options.dryRun === true;
  const probe = options.probe ?? (async (file) => {
    const { stdout } = await execFileAsync(
      process.env.FFPROBE_PATH ?? 'ffprobe',
      ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file],
      { timeout: 20_000, maxBuffer: 4 * 1024 * 1024 },
    );
    return parseProbeOutput(JSON.parse(String(stdout)));
  });

  const unreadable: Array<{ path: string; error: string }> = [];
  const collected: Array<{ file: string; probed: ProbedTrack }> = [];

  const walk = async (directory: string): Promise<void> => {
    let entries;
    try {
      entries = await fsp.readdir(directory, { withFileTypes: true });
    } catch (error) {
      unreadable.push({ path: directory, error: error instanceof Error ? error.message : String(error) });
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!isAudioFile(entry.name)) continue;
      try {
        collected.push({ file: full, probed: await probe(full) });
      } catch (error) {
        unreadable.push({ path: full, error: error instanceof Error ? error.message : String(error) });
      }
    }
  };

  await walk(options.root);
  collected.sort((a, b) => a.file.localeCompare(b.file));

  for (const { file, probed } of collected) {
    if (dryRun) continue;
    // Album identity uses the album artist when present, so a compilation is one album under
    // "Various Artists" instead of one album per track artist (found live: 50 duplicated
    // "100 Greatest Heavy Metal Songs" albums after the first scan).
    const artistName = resolveArtist(probed.albumArtist ?? probed.artist);
    const artistKey = nameKey(artistName);
    const artistId = (await options.store.findArtistId(artistKey))
      ?? (await options.store.createArtist(artistName, artistKey));

    const albumName = resolveAlbum(probed.album);
    const albumKey = albumTitleKey(albumName);
    const albumId = (await options.store.findAlbumId(artistId, albumKey))
      ?? (await options.store.createAlbum({
        artistId,
        title: albumName,
        titleKey: albumKey,
        artworkPath: await findFolderArtwork(path.dirname(file)),
      }));

    await options.store.upsertTrack({
      path: file,
      artistId,
      albumId,
      title: resolveTitle(probed.title, file),
      trackNumber: probed.trackNumber,
      discNumber: probed.discNumber,
      durationSeconds: probed.durationSeconds,
      format: probed.format,
      bitrate: probed.bitrate,
      sizeBytes: probed.sizeBytes,
    });
  }

  return summarizeScan(
    collected.map(({ probed }) => ({
      path: '',
      artist: probed.albumArtist ?? probed.artist,
      album: probed.album,
      title: probed.title,
      trackNumber: probed.trackNumber,
      discNumber: probed.discNumber,
      durationSeconds: probed.durationSeconds,
      format: probed.format,
      bitrate: probed.bitrate,
      sizeBytes: probed.sizeBytes,
    })),
    unreadable,
  );
}
