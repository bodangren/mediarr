/**
 * Freshness helpers for the YouTube podcast surface.
 *
 * The owner's ask (2026-11-20): *"Easy to identify today's or most recent podcasts."*
 * Dates are stored as `publishedAt` (see YoutubeDates) and these helpers turn them
 * into the two things the UI needs: a sort order that puts the newest first, and a
 * human label ("today", "2h", "yesterday", "3d") plus a NEW marker for the last
 * 24 hours.
 */

export interface DatedRow {
  publishedAt: Date | null;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Newest first; undated rows last (they are archive imports, not podcast episodes). */
export function sortByPublishedDesc<T extends DatedRow>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => {
    const left = a.publishedAt ? a.publishedAt.getTime() : Number.NEGATIVE_INFINITY;
    const right = b.publishedAt ? b.publishedAt.getTime() : Number.NEGATIVE_INFINITY;
    return right - left;
  });
}

/** True when the video was published inside the NEW window (default 24 h). */
export function isNew(publishedAt: Date | null, now: Date = new Date(), windowHours = 24): boolean {
  if (!publishedAt) return false;
  const age = now.getTime() - publishedAt.getTime();
  return age >= 0 && age < windowHours * HOUR_MS;
}

/**
 * Compact relative age for a card: "today", "2h", "yesterday", "3d", "6d", "3w",
 * "4mo", "2y". Null dates read "archive" so the label never lies about a real date.
 */
export function ageLabel(publishedAt: Date | null, now: Date = new Date()): string {
  if (!publishedAt) return 'archive';
  const age = now.getTime() - publishedAt.getTime();
  if (age < 0) return 'today';
  if (age < 22 * HOUR_MS) return 'today';
  if (age < 2 * DAY_MS) return 'yesterday';
  const days = Math.floor(age / DAY_MS);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (days < 30) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (days < 365) return `${months}mo`;
  return `${Math.floor(days / 365)}y`;
}

/** How many rows are inside the NEW window — the number a "Today" header can show. */
export function countNew(rows: readonly DatedRow[], now: Date = new Date(), windowHours = 24): number {
  return rows.reduce((total, row) => total + (isNew(row.publishedAt, now, windowHours) ? 1 : 0), 0);
}
