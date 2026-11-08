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

/**
 * Collapse sibling-episode progress into one snapshot per series.
 *
 * A missing episode has no progress of its own, so the series' activity is the only signal that the
 * household is watching that show. Preference: an unfinished episode (the show is mid-watch) beats a
 * finished one; within the same state the most recently watched wins. This is the aggregation the
 * acquisition list already performs, extracted so the fetch cycle can reuse it instead of a second
 * hand-written copy.
 */
export function aggregateSeriesProgress(
  episodeProgress: ReadonlyMap<number, ProgressSnapshot>,
  episodeToSeries: ReadonlyMap<number, number>,
): Map<number, ProgressSnapshot> {
  const bySeries = new Map<number, ProgressSnapshot>();
  for (const [episodeId, snapshot] of episodeProgress) {
    const seriesId = episodeToSeries.get(episodeId);
    if (seriesId === undefined) continue;
    const current = bySeries.get(seriesId);
    if (current === undefined) {
      bySeries.set(seriesId, snapshot);
      continue;
    }
    const currentActive = !current.isWatched;
    const candidateActive = !snapshot.isWatched;
    if (candidateActive && !currentActive) {
      bySeries.set(seriesId, snapshot);
    } else if (currentActive === candidateActive
      && (snapshot.lastWatched?.getTime() ?? 0) > (current.lastWatched?.getTime() ?? 0)) {
      bySeries.set(seriesId, snapshot);
    }
  }
  return bySeries;
}
