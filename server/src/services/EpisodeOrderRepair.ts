/**
 * Repairs episode metadata that was indexed by *broadcast* order while the files
 * on disk are in *production/canonical* order (the Firefly problem, owner report
 * 2026-11-17: "the files are in canonical order as S01E01 (the pilot) but the
 * titles and descriptions are the original broadcast order").
 *
 * The library already holds every correct title + synopsis — they are simply
 * attached to the wrong episode numbers. The release filenames carry the
 * canonical title (`Firefly.S01E02.The.Train.Job...mkv`), so the mapping can be
 * derived from the files instead of a hard-coded table per show.
 */

export interface ReorderRow {
  id: number;
  episodeNumber: number;
  title: string;
  overview: string | null;
  airDateUtc: number | null;
  filePath: string | null;
}

export interface ReorderChange {
  episodeId: number;
  episodeNumber: number;
  fromTitle: string;
  toTitle: string;
  filePath: string;
}

/** Tokens that end the title segment of a release filename. */
const TITLE_STOP_TOKENS = new Set([
  '1080p', '720p', '2160p', '480p', '4k', 'uhd',
  'brrip', 'bdrip', 'bluray', 'blu-ray', 'webrip', 'web-dl', 'webdl', 'hdtv', 'dvdrip', 'remux',
  'x264', 'x265', 'h264', 'h265', 'hevc', 'avc', 'xvid', 'divx',
  'aac', 'ac3', 'dts', 'ddp', 'dd', 'eac3', 'truehd', 'atmos', 'flac', 'mp3',
  '10bit', '8bit', 'hdr', 'sdr', 'proper', 'repack', 'internal',
]);

/**
 * Canonical episode title carried by a release filename, or null.
 *
 * Handles `Show.S01E02.The.Train.Job.1080p.BRRip...` and
 * `Show - S01E02 - The Train Job.mkv`. Returns null when there is no title
 * segment or when it is nothing but quality tokens, so a caller can never
 * replace a good title with junk.
 */
export function canonicalTitleFromFileName(filePath: string | null): string | null {
  if (!filePath) return null;
  const base = filePath.split('/').pop() ?? '';
  const withoutExtension = base.replace(/\.[a-z0-9]{2,4}$/i, '');

  const marker = /s\d{1,2}[ ._-]?e\d{1,3}/i.exec(withoutExtension);
  if (!marker) return null;

  let rest = withoutExtension.slice(marker.index + marker[0].length);
  rest = rest.replace(/^[\s._-]+/, '');
  // "Show - S01E02 - Title" style keeps a separator between number and title.
  const tokens = rest.split(/[._\s]+/).filter(Boolean);

  const title: string[] = [];
  for (const token of tokens) {
    const normalized = token.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (TITLE_STOP_TOKENS.has(normalized) || /^\d+bit$/.test(normalized)) break;
    // A bracketed group ("[1080p]") hands the rest to the quality tokens.
    if (/^\[/.test(token)) break;
    title.push(token);
  }

  const joined = title.join(' ').trim();
  if (joined.length < 2) return null;
  // Reject segments that are obviously not a title (all digits / a single word
  // that is a known quality token).
  if (/^\d+$/.test(joined)) return null;
  return joined;
}

const normalizeTitle = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Works out the metadata permutation that makes every file's episode carry the
 * metadata its filename names.
 *
 * Pure: no IO, so the mapping can be table-tested before anything is written.
 */
export function planEpisodeReorder(rows: ReorderRow[]): ReorderChange[] {
  const byTitle = new Map<string, ReorderRow>();
  for (const row of rows) {
    byTitle.set(normalizeTitle(row.title), row);
  }

  const changes: ReorderChange[] = [];
  for (const row of rows) {
    const canonical = canonicalTitleFromFileName(row.filePath);
    if (!canonical) continue;
    const source = byTitle.get(normalizeTitle(canonical));
    if (!source) continue;
    if (source.id === row.id) continue;
    changes.push({
      episodeId: row.id,
      episodeNumber: row.episodeNumber,
      fromTitle: row.title,
      toTitle: source.title,
      filePath: row.filePath!,
    });
  }
  return changes;
}

/** The metadata a given row should end up with after the repair. */
export function metadataForRow(row: ReorderRow, rows: ReorderRow[]): ReorderRow | null {
  const canonical = canonicalTitleFromFileName(row.filePath);
  if (!canonical) return null;
  const source = rows.find(
    candidate => normalizeTitle(candidate.title) === normalizeTitle(canonical),
  );
  if (!source) return null;
  return source;
}
