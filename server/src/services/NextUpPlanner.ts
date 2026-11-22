/**
 * "Next up" — the Home row the owner asked for 2026-11-22: *"there should be an 'In progress' or
 * 'Next up' section which lists all the partially watched series and shows the next episode up in
 * the series. Listed from most recently watched first."*
 *
 * Pure planning so the ordering and skip-watched rules are testable without SQL: the repository feeds
 * episodes (ordered by season/episode, files only) and per-episode progress, this module decides which
 * series are "in progress", which episode is next, and how recently each was watched.
 */

export interface NextUpEpisode {
  episodeId: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
}

export interface NextUpProgress {
  episodeId: number;
  isWatched: boolean;
  position: number;
  updatedAt: number;
}

export interface NextUpSeriesInput {
  seriesId: number;
  title: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  year: number | null;
  /** Episodes that have a file, in season/episode order. */
  episodes: NextUpEpisode[];
  /** Progress keyed by episode id. */
  progress: Map<number, NextUpProgress>;
}

export interface NextUpItem {
  seriesId: number;
  title: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  year: number | null;
  watchedCount: number;
  totalCount: number;
  nextEpisode: NextUpEpisode;
  /** Newest watch activity in this series (ms), for the "most recently watched first" order. */
  lastWatchedAt: number;
}

function isWatched(progress: NextUpProgress | undefined): boolean {
  return progress?.isWatched === true;
}

/** A series is in progress when at least one episode is watched AND an unwatched episode with a file exists. */
export function planNextUp(input: NextUpSeriesInput): NextUpItem | null {
  if (input.episodes.length === 0) return null;
  let watchedCount = 0;
  let lastWatchedAt = 0;
  let nextEpisode: NextUpEpisode | null = null;

  for (const episode of input.episodes) {
    const progress = input.progress.get(episode.episodeId);
    if (isWatched(progress)) {
      watchedCount += 1;
      if (progress && progress.updatedAt > lastWatchedAt) lastWatchedAt = progress.updatedAt;
      continue;
    }
    // A partially played episode is activity worth ordering by, and is itself the next up.
    if (progress && progress.position > 0 && progress.updatedAt > lastWatchedAt) {
      lastWatchedAt = progress.updatedAt;
    }
    if (!nextEpisode) nextEpisode = episode;
  }

  if (watchedCount === 0 || !nextEpisode) return null;
  return {
    seriesId: input.seriesId,
    title: input.title,
    posterUrl: input.posterUrl,
    backdropUrl: input.backdropUrl,
    year: input.year,
    watchedCount,
    totalCount: input.episodes.length,
    nextEpisode,
    lastWatchedAt,
  };
}

/** Plans and orders every in-progress series: most recently watched first. */
export function planNextUpList(inputs: ReadonlyArray<NextUpSeriesInput>): NextUpItem[] {
  return inputs
    .map(planNextUp)
    .filter((item): item is NextUpItem => item !== null)
    .sort((a, b) => b.lastWatchedAt - a.lastWatchedAt || a.title.localeCompare(b.title));
}
