import type { PlaybackProgress } from '@prisma/client';

/**
 * Build a map from mediaId to the latest (first-encountered) PlaybackProgress record.
 * Assumes the input is already sorted by recency (most recent first).
 */
export function latestPlaybackMap(records: PlaybackProgress[]): Map<number, PlaybackProgress> {
  const result = new Map<number, PlaybackProgress>();
  for (const record of records) {
    if (!result.has(record.mediaId)) {
      result.set(record.mediaId, record);
    }
  }
  return result;
}

/**
 * Serialize a PlaybackProgress record into a plain JSON-safe object, or null if absent.
 */
export function serializePlaybackState(progress: PlaybackProgress | null | undefined) {
  if (!progress) {
    return null;
  }

  return {
    position: progress.position,
    duration: progress.duration,
    progress: progress.progress,
    isWatched: progress.isWatched,
    lastWatched: progress.lastWatched.toISOString(),
  };
}
