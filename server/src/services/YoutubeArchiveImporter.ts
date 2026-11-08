import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';

/**
 * Import the pre-existing `/data/Youtube` archive (track feature_youtube_library_20261107, Phase 4).
 *
 * These 262 files predate the library: they are unmanaged history, so they import with
 * `source: IMPORT` and are never retention-eligible (gate G9). Titles/runtime come from the Kodi-style
 * `.nfo` sidecars that already sit next to each file, so no filename regex guessing is needed.
 */

type Drizzle = any;

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.webm', '.mov', '.m4v']);

export function isArchiveVideoFile(name: string): boolean {
  const ext = path.extname(name).toLowerCase();
  return VIDEO_EXTENSIONS.has(ext) && !name.startsWith('.');
}

/** Deterministic 11-character id so a re-run maps the same file to the same row (column is UNIQUE). */
export function syntheticVideoId(relativePath: string): string {
  const digest = crypto.createHash('sha1').update(relativePath).digest('hex').slice(0, 8);
  return `imp${digest}`;
}

export interface NfoMetadata {
  title: string | null;
  runtimeMinutes: number | null;
}

/** Minimal, tolerant read of the Kodi `.nfo` fields this archive actually contains. */
export function parseNfo(xml: string): NfoMetadata {
  const title = /<title>([\s\S]*?)<\/title>/i.exec(xml)?.[1]?.trim() ?? null;
  const runtime = /<runtime>(\d+)<\/runtime>/i.exec(xml)?.[1];
  const minutes = runtime === undefined ? null : Number.parseInt(runtime, 10);
  return {
    title: title && title.length > 0 ? decodeEntities(title) : null,
    runtimeMinutes: minutes !== null && Number.isFinite(minutes) && minutes > 0 ? minutes : null,
  };
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

async function exists(file: string): Promise<boolean> {
  try {
    await fsp.access(file);
    return true;
  } catch {
    return false;
  }
}

/** Finds `<stem>-poster.jpg` / `<stem>.jpg` next to the video (this archive's convention). */
export async function findPoster(directory: string, stem: string): Promise<string | null> {
  for (const candidate of [`${stem}-poster.jpg`, `${stem}-poster.webp`, `${stem}.jpg`, `${stem}.webp`, `${stem}.png`]) {
    const file = path.join(directory, candidate);
    if (await exists(file)) return file;
  }
  return null;
}

export interface ArchiveImportResult {
  scanned: number;
  imported: number;
  skippedExisting: number;
  skippedUnreadable: number;
  channels: Record<string, number>;
}

export async function importYoutubeArchive(
  drizzle: Drizzle,
  options: { root: string; dryRun?: boolean },
): Promise<ArchiveImportResult> {
  const dryRun = options.dryRun === true;
  const result: ArchiveImportResult = {
    scanned: 0,
    imported: 0,
    skippedExisting: 0,
    skippedUnreadable: 0,
    channels: {},
  };

  const existing = new Set(
    (await drizzle.select({ path: schema.youtubeVideos.path }).from(schema.youtubeVideos))
      .map((row: { path: string | null }) => row.path)
      .filter((value: string | null): value is string => value !== null),
  );

  const walk = async (directory: string): Promise<void> => {
    let entries;
    try {
      entries = await fsp.readdir(directory, { withFileTypes: true });
    } catch {
      result.skippedUnreadable += 1;
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('_quarantine')) continue;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!isArchiveVideoFile(entry.name)) continue;
      result.scanned += 1;
      if (existing.has(fullPath)) {
        result.skippedExisting += 1;
        continue;
      }

      const stem = entry.name.replace(/\.[^.]+$/, '');
      const nfoPath = path.join(directory, `${stem}.nfo`);
      let metadata: NfoMetadata = { title: null, runtimeMinutes: null };
      try {
        metadata = parseNfo(await fsp.readFile(nfoPath, 'utf-8'));
      } catch {
        // No sidecar: the filename is the fallback title, never a failure.
      }
      const relative = path.relative(options.root, fullPath);
      const topLevel = relative.split(path.sep)[0];
      const channel = topLevel && topLevel !== entry.name && !topLevel.includes('.') ? topLevel : null;

      if (!dryRun) {
        await drizzle.insert(schema.youtubeVideos).values({
          subscriptionId: null,
          videoId: syntheticVideoId(relative),
          source: 'IMPORT',
          title: metadata.title ?? stem,
          channel,
          durationSeconds: metadata.runtimeMinutes === null ? null : metadata.runtimeMinutes * 60,
          status: 'AVAILABLE',
          path: fullPath,
          thumbPath: await findPoster(directory, stem),
        });
      }
      existing.add(fullPath);
      result.imported += 1;
      if (channel !== null) result.channels[channel] = (result.channels[channel] ?? 0) + 1;
    }
  };

  await walk(options.root);
  return result;
}
