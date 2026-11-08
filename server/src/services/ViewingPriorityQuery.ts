import { and, eq, inArray } from 'drizzle-orm';
import * as schema from '../db/schema';
import {
  rankByViewingPriority,
  type RankedViewingPriority,
  type ViewingPriorityInput,
} from './ViewingPriorityService';

/**
 * Batch loader for the viewing-priority model (track feature_subtitle_coverage_priority_20261108).
 *
 * `PlaybackRepository.getLatestProgressForMedia` is per item, so ranking a library with it is an
 * N+1: 2,600 episodes means 2,600 queries on a USB-backed SQLite file. This module loads every
 * progress row for a set of ids in one query per media type and hands the result to the pure
 * classifier.
 */

export type PrioritySubjectKind = 'movie' | 'episode';

/** The row facts the classifier needs that are not in `PlaybackProgress`. */
export interface PrioritySubject {
  kind: PrioritySubjectKind;
  id: number;
  addedAt: Date | null;
}

export interface ProgressSnapshot {
  mediaId: number;
  progress: number;
  isWatched: boolean;
  lastWatched: Date | null;
}

interface DrizzleLike {
  select: (...args: unknown[]) => any;
}

const MEDIA_TYPE_BY_KIND = { movie: 'MOVIE', episode: 'EPISODE' } as const;

/** Latest progress row per media id — the table can hold several rows (per user, per session). */
export function latestProgressByMediaId(rows: readonly ProgressSnapshot[]): Map<number, ProgressSnapshot> {
  const latest = new Map<number, ProgressSnapshot>();
  for (const row of rows) {
    const current = latest.get(row.mediaId);
    if (current === undefined) {
      latest.set(row.mediaId, row);
      continue;
    }
    const currentAt = current.lastWatched?.getTime() ?? 0;
    const rowAt = row.lastWatched?.getTime() ?? 0;
    if (rowAt > currentAt) latest.set(row.mediaId, row);
  }
  return latest;
}

export class ViewingPriorityQuery {
  constructor(private readonly db: DrizzleLike) {}

  /** One query per media type for every requested id; empty input performs no query. */
  async loadProgress(
    kind: PrioritySubjectKind,
    mediaIds: readonly number[],
  ): Promise<Map<number, ProgressSnapshot>> {
    const unique = [...new Set(mediaIds)].filter((id) => Number.isInteger(id) && id > 0);
    if (unique.length === 0) return new Map();

    const rows = (await this.db
      .select()
      .from(schema.playbackProgress)
      .where(
        and(
          eq(schema.playbackProgress.mediaType, MEDIA_TYPE_BY_KIND[kind]),
          inArray(schema.playbackProgress.mediaId, unique),
        ),
      )) as Array<{
      mediaId: number;
      progress: number;
      isWatched: number | boolean;
      lastWatched: Date | number | null;
    }>;

    return latestProgressByMediaId(
      rows.map((row) => ({
        mediaId: row.mediaId,
        progress: Number(row.progress ?? 0),
        isWatched: row.isWatched === true || row.isWatched === 1,
        lastWatched: row.lastWatched == null
          ? null
          : row.lastWatched instanceof Date
            ? row.lastWatched
            : new Date(Number(row.lastWatched) * 1000),
      })),
    );
  }

  /**
   * Rank subjects by viewing priority, loading their progress in batch. Returns the same objects
   * with a `priority` field, sorted by the model's order.
   */
  async rank(
    subjects: readonly PrioritySubject[],
    now: Date = new Date(),
  ): Promise<RankedViewingPriority[]> {
    const movieIds = subjects.filter((s) => s.kind === 'movie').map((s) => s.id);
    const episodeIds = subjects.filter((s) => s.kind === 'episode').map((s) => s.id);
    const [movieProgress, episodeProgress] = await Promise.all([
      this.loadProgress('movie', movieIds),
      this.loadProgress('episode', episodeIds),
    ]);

    const inputs: ViewingPriorityInput[] = subjects.map((subject) => {
      const progress = subject.kind === 'movie'
        ? movieProgress.get(subject.id)
        : episodeProgress.get(subject.id);
      return {
        kind: subject.kind,
        id: subject.id,
        addedAt: subject.addedAt,
        lastWatchedAt: progress?.lastWatched ?? null,
        isWatched: progress?.isWatched ?? false,
        progress: progress?.progress ?? null,
      };
    });

    return rankByViewingPriority(inputs, now);
  }
}
