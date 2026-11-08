import { rankByViewingPriority } from './ViewingPriorityService';
import type { ProgressSnapshot } from './ViewingPriorityQuery';

/**
 * Order sidecar-subtitle paths by viewing priority (track
 * feature_subtitle_coverage_priority_20261108, Phase 3 — bilingual cycle).
 *
 * `BilingualSubtitleService` receives paths from an injected candidate provider and walks them in
 * that order. The provider can now hand them over already prioritised: continue-watching first, then
 * recently watched, then recently added, then backfill, with unknown paths last but never dropped.
 */
export interface PathMediaRef {
  kind: 'movie' | 'episode';
  id: number;
  addedAt: Date | null;
}

export interface PathPriorityProgress {
  movies: ReadonlyMap<number, ProgressSnapshot>;
  episodes: ReadonlyMap<number, ProgressSnapshot>;
}

export function orderSubtitlePathsByPriority(
  paths: readonly string[],
  mediaOfPath: (path: string) => PathMediaRef | null,
  progress: PathPriorityProgress,
  now: Date = new Date(),
): string[] {
  const resolvable: Array<{ path: string; input: Parameters<typeof rankByViewingPriority>[0][number] }> = [];
  const unknown: string[] = [];

  for (const path of paths) {
    const media = mediaOfPath(path);
    if (!media) {
      unknown.push(path);
      continue;
    }
    const snapshot = media.kind === 'movie'
      ? progress.movies.get(media.id)
      : progress.episodes.get(media.id);
    resolvable.push({
      path,
      input: {
        kind: media.kind,
        id: media.id,
        addedAt: media.addedAt,
        lastWatchedAt: snapshot?.lastWatched ?? null,
        isWatched: snapshot?.isWatched ?? false,
        progress: snapshot?.progress ?? null,
      },
    });
  }

  const ranked = rankByViewingPriority(resolvable.map((entry) => entry.input), now);
  const pathByKey = new Map(resolvable.map((entry) => [`${entry.input.kind}:${entry.input.id}`, entry.path]));
  const ordered = ranked.flatMap((entry) => {
    const path = pathByKey.get(`${entry.kind}:${entry.id}`);
    return path === undefined ? [] : [path];
  });
  return [...ordered, ...unknown];
}
