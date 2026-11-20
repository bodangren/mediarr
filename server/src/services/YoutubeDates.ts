/**
 * Publication dates for the YouTube (podcast) library.
 *
 * Measured 2026-11-20: every one of the 629 AVAILABLE rows had `publishedAt = NULL`.
 * The poller maps `timestamp` from its listings, but yt-dlp's `--flat-playlist`
 * output does not carry a date for channel/playlist entries, so the column stayed
 * empty — and with it went "today", age labels and any recency-based retention.
 *
 * The authoritative date already exists on disk: every download writes
 * `<name> [<id>].info.json` with `upload_date` / `timestamp`. These helpers parse it
 * and backfill rows, so the podcast axis can be built on real dates.
 */

export interface YoutubeDateBackfillDeps {
  /** Rows whose publishedAt is null and which have a downloaded file. */
  listRows(limit: number): Promise<Array<{ id: number; path: string; publishedAt: Date | null }>>;
  readFile(filePath: string, encoding: 'utf-8'): Promise<string>;
  updateRow(id: number, publishedAt: Date): Promise<void>;
}

export interface YoutubeDateBackfillResult {
  checked: number;
  filled: number;
  missingInfo: number;
  unreadable: number;
}

/** Date from a yt-dlp info sidecar: `timestamp`/`release_timestamp` (unix s) or `upload_date` (YYYYMMDD). */
export function publishedAtFromInfo(info: unknown): Date | null {
  if (!info || typeof info !== 'object') return null;
  const record = info as Record<string, unknown>;

  const unix = firstFiniteNumber(record.timestamp, record.release_timestamp);
  if (unix !== null) {
    const date = new Date(unix * 1000);
    if (isPlausiblePublishDate(date)) return date;
  }

  const compact = firstString(record.upload_date, record.release_date);
  if (compact) {
    const match = /^(\d{4})(\d{2})(\d{2})$/.exec(compact.trim());
    if (match) {
      const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
      if (isPlausiblePublishDate(date)) return date;
    }
  }
  return null;
}

/** The info sidecar for a downloaded file: same stem, `.info.json` suffix. */
export function infoJsonPathFor(mediaPath: string): string {
  const lastDot = mediaPath.lastIndexOf('.');
  const stem = lastDot > mediaPath.lastIndexOf('/') ? mediaPath.slice(0, lastDot) : mediaPath;
  return `${stem}.info.json`;
}

export async function backfillYoutubeDates(
  deps: YoutubeDateBackfillDeps,
  options: { limit?: number } = {},
): Promise<YoutubeDateBackfillResult> {
  const rows = await deps.listRows(Math.max(1, options.limit ?? 200));
  const result: YoutubeDateBackfillResult = { checked: rows.length, filled: 0, missingInfo: 0, unreadable: 0 };

  for (const row of rows) {
    let raw: string;
    try {
      raw = await deps.readFile(infoJsonPathFor(row.path), 'utf-8');
    } catch {
      result.missingInfo += 1;
      continue;
    }
    let publishedAt: Date | null;
    try {
      publishedAt = publishedAtFromInfo(JSON.parse(raw));
    } catch {
      result.unreadable += 1;
      continue;
    }
    if (!publishedAt) {
      result.unreadable += 1;
      continue;
    }
    await deps.updateRow(row.id, publishedAt);
    result.filled += 1;
  }
  return result;
}

function firstFiniteNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return null;
}

/** YouTube launched in 2005; anything before that or in the future is a parsing bug. */
function isPlausiblePublishDate(date: Date): boolean {
  const year = date.getUTCFullYear();
  return Number.isFinite(year) && year >= 2005 && date.getTime() <= Date.now() + 24 * 60 * 60 * 1000;
}
