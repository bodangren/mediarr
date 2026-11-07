/**
 * Viewing-priority model (track feature_subtitle_coverage_priority_20261108, Phase 1).
 *
 * One deterministic classification of "how much does this item matter right now", shared by the
 * wanted list, the subtitle fetch queue, the bilingual EN+ZH cycle and the coverage report. Before
 * this, every queue walked the library in insertion order, so a show being watched tonight competed
 * with 550 movies nobody had opened.
 *
 * Buckets, in order:
 *   1. continue-watching  — has playback state and is not finished (the household started it);
 *   2. recently-watched   — finished, watched within the last 14 days;
 *   3. recently-added     — added within the last 30 days, no playback yet;
 *   4. backfill           — everything else.
 *
 * The model is a pure function over progress rows so it can be tested without a database and used
 * from any query afterwards.
 */

export const VIEWING_PRIORITY_BUCKETS = [
  'continue-watching',
  'recently-watched',
  'recently-added',
  'backfill',
] as const;

export type ViewingPriorityBucket = typeof VIEWING_PRIORITY_BUCKETS[number];

export const RECENTLY_WATCHED_WINDOW_DAYS = 14;
export const RECENTLY_ADDED_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ViewingPriorityInput {
  kind: 'movie' | 'episode';
  id: number;
  addedAt: Date | null;
  /** `PlaybackProgress.lastWatched` — null when the item has never been played. */
  lastWatchedAt: Date | null;
  isWatched: boolean;
  /** 0..1 playback fraction; null when there is no progress row. */
  progress: number | null;
}

export interface ViewingPriority {
  bucket: ViewingPriorityBucket;
  /** 0 (continue-watching) … 3 (backfill); lower sorts first. */
  rank: number;
  /** Millisecond timestamp that orders items inside a bucket (newest first). */
  recency: number;
}

export interface RankedViewingPriority extends ViewingPriorityInput {
  priority: ViewingPriority;
}

function withinWindow(value: Date | null, now: Date, days: number): boolean {
  if (!value) return false;
  const age = now.getTime() - value.getTime();
  return age <= days * DAY_MS;
}

/** Classify one item. `now` is injected so the result is deterministic in tests. */
export function classifyViewingPriority(
  input: ViewingPriorityInput,
  now: Date = new Date(),
): ViewingPriority {
  const hasPlayback = input.lastWatchedAt !== null || input.progress !== null;
  const added = input.addedAt?.getTime() ?? 0;
  const watched = input.lastWatchedAt?.getTime() ?? 0;

  if (hasPlayback && !input.isWatched) {
    return { bucket: 'continue-watching', rank: 0, recency: watched || added };
  }
  if (input.isWatched && withinWindow(input.lastWatchedAt, now, RECENTLY_WATCHED_WINDOW_DAYS)) {
    return { bucket: 'recently-watched', rank: 1, recency: watched || added };
  }
  if (withinWindow(input.addedAt, now, RECENTLY_ADDED_WINDOW_DAYS)) {
    return { bucket: 'recently-added', rank: 2, recency: added };
  }
  return { bucket: 'backfill', rank: 3, recency: added };
}

/** True when the item is in the buckets that define the high-priority coverage denominator. */
export function isHighPriority(bucket: ViewingPriorityBucket): boolean {
  return bucket === 'continue-watching' || bucket === 'recently-watched';
}

/**
 * Compare two ranked items. Bucket first, then newest activity, then id — the id tie-break keeps
 * the order stable across calls so pagination and automation runs see the same sequence.
 */
export function compareViewingPriority(
  a: RankedViewingPriority,
  b: RankedViewingPriority,
): number {
  if (a.priority.rank !== b.priority.rank) return a.priority.rank - b.priority.rank;
  if (a.priority.recency !== b.priority.recency) return b.priority.recency - a.priority.recency;
  if (a.kind !== b.kind) return a.kind === 'movie' ? -1 : 1;
  return a.id - b.id;
}

/** Classify and sort a batch. Pure — the caller decides which rows to load. */
export function rankByViewingPriority(
  items: readonly ViewingPriorityInput[],
  now: Date = new Date(),
): RankedViewingPriority[] {
  return items
    .map((item) => ({ ...item, priority: classifyViewingPriority(item, now) }))
    .sort(compareViewingPriority);
}
