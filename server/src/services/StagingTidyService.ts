import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

/**
 * Safe daily tidy of download staging areas (track chore_migrate_hermes_automation_20261107, B7
 * "tidy 04:30"): removes only abandoned tool artefacts — yt-dlp `.part`/`.ytdl`, our own `.tmp`
 * files and empty leftovers older than `minAgeMs`. Never touches media files by extension policy.
 */

export const TIDY_PATTERNS = [/\.part$/i, /\.ytdl$/i, /\.tmp$/i, /\.temp$/i];
export const DEFAULT_TIDY_DIRS = [
  process.env.MUSIC_STAGING_DIR ?? '/data/Music/_incoming',
  path.join(process.env.YOUTUBE_DIR ?? '/data/Youtube', 'Uncategorized'),
];

export interface TidyCandidate {
  path: string;
  bytes: number;
  ageMs: number;
  reason: 'tool-partial' | 'empty-file';
}

export function isTidyCandidate(
  name: string,
  size: number,
  ageMs: number,
  minAgeMs: number,
): 'tool-partial' | 'empty-file' | null {
  if (ageMs < minAgeMs) return null;
  if (TIDY_PATTERNS.some((pattern) => pattern.test(name))) return 'tool-partial';
  if (size === 0) return 'empty-file';
  return null;
}

export async function planTidy(options: {
  dirs?: string[];
  minAgeMs?: number;
  now?: Date;
  listDir?: (dir: string) => Promise<Array<{ name: string; size: number; ageMs: number }>>;
} = {}): Promise<TidyCandidate[]> {
  const dirs = options.dirs ?? DEFAULT_TIDY_DIRS;
  const minAgeMs = options.minAgeMs ?? 6 * 60 * 60 * 1000;
  const now = options.now ?? new Date();
  const listDir = options.listDir ?? (async (dir: string) => {
    const names = await fsp.readdir(dir);
    const rows = [];
    for (const name of names) {
      try {
        const info = await fsp.stat(path.join(dir, name));
        if (!info.isFile()) continue;
        rows.push({ name, size: info.size, ageMs: now.getTime() - info.mtimeMs });
      } catch {
        // Raced with a delete; ignore.
      }
    }
    return rows;
  });

  const candidates: TidyCandidate[] = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of await listDir(dir)) {
      const reason = isTidyCandidate(file.name, file.size, file.ageMs, minAgeMs);
      if (!reason) continue;
      candidates.push({ path: path.join(dir, file.name), bytes: file.size, ageMs: file.ageMs, reason });
    }
  }
  return candidates;
}

export async function applyTidy(
  candidates: TidyCandidate[],
  unlink: (file: string) => Promise<void> = (file) => fsp.unlink(file),
): Promise<{ deleted: number; bytes: number; failed: string[] }> {
  let deleted = 0;
  let bytes = 0;
  const failed: string[] = [];
  for (const candidate of candidates) {
    try {
      await unlink(candidate.path);
      deleted += 1;
      bytes += candidate.bytes;
    } catch {
      failed.push(candidate.path);
    }
  }
  return { deleted, bytes, failed };
}
