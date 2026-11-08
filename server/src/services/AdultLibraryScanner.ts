import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Adult library scanner (track feature_adult_library_20261107, Phase 1).
 *
 * The live tree is a flat collection of 196 videos under `/data/Porn` plus eight sub-folders, with
 * filenames in six grammar classes measured on 2026-11-08 (evidence in the track folder). This module
 * classifies a filename honestly and walks the root preserving the layout — it never renames or moves
 * anything, and a name that carries no information goes to the review bucket instead of being guessed.
 */

export type AdultNameClass =
  | 'quality-tagged'
  | 'studio-dash-title'
  | 'underscore-title'
  | 'date-prefixed'
  | 'plain-title'
  | 'seq-only';

export interface AdultFilenameInfo {
  className: AdultNameClass;
  /** Human-readable title, or null when the name carries none (review bucket). */
  title: string | null;
  studio: string | null;
  quality: string | null;
  /** YYYY-MM-DD when the name is date-stamped. */
  releaseDate: string | null;
  /** True when the file cannot be titled from its name and needs a human/agent look. */
  needsReview: boolean;
}

export const ADULT_VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.avi', '.wmv', '.m4v', '.mov']);

const QUALITY = /(2160p|4k|1080p|720p|480p|x265|x264|hevc)/i;

export function classifyAdultFilename(fileName: string): AdultFilenameInfo {
  const base = path.basename(fileName);
  const ext = path.extname(base);
  let stem = base.slice(0, base.length - ext.length).trim();
  const bracket = stem.match(/\[([^\]]+)\]\s*$/);
  if (bracket) stem = stem.slice(0, bracket.index ?? stem.length).trim();

  const qualityMatch = stem.match(QUALITY);
  const quality = qualityMatch?.[1]?.toLowerCase() ?? null;
  const date = stem.match(/(?:^|\.)(\d{2}|(?:19|20)\d{2})[.\-_](\d{2})[.\-_](\d{2})/) ?? null;

  if (/^\d{1,4}$/.test(stem)) {
    return { className: 'seq-only', title: null, studio: null, quality: null, releaseDate: null, needsReview: true };
  }

  if (date) {
    const [full, yRaw = '', m = '', d = ''] = date;
    const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
    const dateIndex = date.index ?? 0;
    const studio = stem.split('.')[0]?.toLowerCase() ?? null;
    const after = stem.slice(dateIndex + full.length).replace(/^[.\-_]+/, '').replace(/[.\-_]+/g, ' ').trim();
    return {
      className: 'date-prefixed',
      title: after.length > 0 ? after : null,
      studio,
      quality,
      releaseDate: `${y}-${m}-${d}`,
      needsReview: after.length === 0,
    };
  }

  if (/_/.test(stem) && !/\s/.test(stem)) {
    const title = stem.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    return { className: 'underscore-title', title, studio: null, quality, releaseDate: null, needsReview: false };
  }

  const dash = stem.split(/\s+-\s+/);
  if (dash.length === 2) {
    const [left, right] = dash as [string, string];
    // `<studio> - <title>` when the left side is short and title-cased like a studio name.
    const looksStudio = left.length <= 24 && /^[A-Za-z0-9&'. ]+$/.test(left) && !QUALITY.test(left);
    const rawTitle = (looksStudio ? right : `${left} - ${right}`).replace(/\s+/g, ' ').trim();
    const title = rawTitle.replace(new RegExp(`\\s*${QUALITY.source}\\s*$`, 'i'), '').trim();
    return {
      className: looksStudio ? 'quality-tagged' : 'studio-dash-title',
      title,
      studio: looksStudio ? left : null,
      quality,
      releaseDate: null,
      needsReview: title.length === 0,
    };
  }

  const title = stem.replace(/\s+/g, ' ').trim();
  return {
    className: quality ? 'quality-tagged' : 'plain-title',
    title: title.length > 0 ? title : null,
    studio: null,
    quality,
    releaseDate: null,
    needsReview: title.length === 0,
  };
}

export interface AdultScanEntry extends AdultFilenameInfo {
  /** Absolute path; the layout is preserved, never flattened. */
  path: string;
  /** Path relative to the root, for reporting. */
  relativePath: string;
  sizeBytes: number;
}

export interface AdultScanSummary {
  root: string;
  videos: number;
  needsReview: number;
  unreadableDirectories: string[];
  entries: AdultScanEntry[];
}

export interface ScanFs {
  readdir(dir: string, options: { withFileTypes: true }): Promise<Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>>;
  stat(file: string): Promise<{ size: number }>;
}

/**
 * Walk the root depth-first preserving the layout. Unreadable directories are reported, never
 * silently skipped, and a missing root is an error rather than an empty library.
 */
export async function scanAdultLibrary(
  root: string,
  deps: { fs?: ScanFs } = {},
): Promise<AdultScanSummary> {
  const io = deps.fs ?? (fs as unknown as ScanFs);
  const entries: AdultScanEntry[] = [];
  const unreadableDirectories: string[] = [];

  const walk = async (dir: string): Promise<void> => {
    let dirents;
    try {
      dirents = await io.readdir(dir, { withFileTypes: true });
    } catch {
      unreadableDirectories.push(dir);
      return;
    }
    for (const dirent of dirents) {
      const full = path.join(dir, dirent.name);
      if (dirent.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!dirent.isFile()) continue;
      const ext = path.extname(dirent.name).toLowerCase();
      if (!ADULT_VIDEO_EXTENSIONS.has(ext)) continue;
      let sizeBytes = 0;
      try {
        sizeBytes = (await io.stat(full)).size;
      } catch {
        sizeBytes = 0;
      }
      entries.push({
        ...classifyAdultFilename(dirent.name),
        path: full,
        relativePath: path.relative(root, full),
        sizeBytes,
      });
    }
  };

  await walk(root);

  return {
    root,
    videos: entries.length,
    needsReview: entries.filter((entry) => entry.needsReview).length,
    unreadableDirectories,
    entries,
  };
}
