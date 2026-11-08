import { rankByViewingPriority, type ViewingPriorityInput } from './ViewingPriorityService';
import type { ProgressSnapshot } from './ViewingPriorityQuery';

/**
 * Order wanted-subtitle candidates by viewing priority (track
 * feature_subtitle_coverage_priority_20261108, Phase 3).
 *
 * `SubtitleVariantRepository.listWantedSubtitlesByStates` returns rows in
 * `updatedAt`/`id` order, so a show being watched competes with 1,700 rows nobody has played. This
 * pure step maps each wanted row to its movie/episode, attaches progress (own, or inherited from the
 * series for an episode), and returns the rows in the model's order.
 *
 * Rows whose variant does not resolve to a movie/episode keep their relative order and go last —
 * they cannot be prioritised, and dropping them would silently lose work.
 */
export interface WantedCandidate {
  /** WantedSubtitle row id. */
  id: number;
  variantId: number;
}

export interface WantedMediaRef {
  kind: 'movie' | 'episode';
  /** Movie.id or Episode.id — the id playback progress is keyed by. */
  id: number;
  addedAt: Date | null;
  /** For episodes: the series the episode belongs to, used for inherited activity. */
  seriesId: number | null;
}

export interface WantedPriorityProgress {
  movies: Map<number, ProgressSnapshot>;
  episodes: Map<number, ProgressSnapshot>;
  /** Series-level activity, derived from sibling episodes. */
  series?: Map<number, ProgressSnapshot>;
}

export function orderWantedCandidates<T extends WantedCandidate>(
  candidates: readonly T[],
  mediaOf: (candidate: T) => WantedMediaRef | null,
  progress: WantedPriorityProgress,
  now: Date = new Date(),
): T[] {
  const resolvable: Array<{ candidate: T; input: ViewingPriorityInput }> = [];
  const unresolved: T[] = [];

  for (const candidate of candidates) {
    const media = mediaOf(candidate);
    if (!media) {
      unresolved.push(candidate);
      continue;
    }
    const own = media.kind === 'movie'
      ? progress.movies.get(media.id)
      : progress.episodes.get(media.id);
    const inherited = media.kind === 'episode' && media.seriesId !== null
      ? progress.series?.get(media.seriesId)
      : undefined;
    resolvable.push({
      candidate,
      input: {
        kind: media.kind,
        id: media.id,
        addedAt: media.addedAt,
        lastWatchedAt: own?.lastWatched ?? inherited?.lastWatched ?? null,
        isWatched: own?.isWatched ?? inherited?.isWatched ?? false,
        progress: own?.progress ?? inherited?.progress ?? null,
      },
    });
  }

  const ranked = rankByViewingPriority(resolvable.map((entry) => entry.input), now);
  const byIdentity = new Map(resolvable.map((entry) => [`${entry.input.kind}:${entry.input.id}`, entry.candidate]));
  const ordered = ranked.flatMap((entry) => {
    const candidate = byIdentity.get(`${entry.kind}:${entry.id}`);
    return candidate === undefined ? [] : [candidate];
  });
  return [...ordered, ...unresolved];
}
