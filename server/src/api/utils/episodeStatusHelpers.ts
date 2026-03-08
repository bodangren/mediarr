export type EpisodeStatus = 'downloaded' | 'missing' | 'airing' | 'unaired';

/**
 * Determine episode status based on air date and whether a file is present on disk.
 *
 * Rules:
 *  - Has file → 'downloaded'
 *  - No air date → 'unaired'
 *  - Air date is today (calendar day, local time) → 'airing'
 *  - Air date is in the past → 'missing'
 *  - Air date is in the future → 'unaired'
 */
export function determineEpisodeStatus(airDateUtc: Date | null | undefined, hasFile: boolean): EpisodeStatus {
  if (hasFile) {
    return 'downloaded';
  }

  if (!airDateUtc) {
    return 'unaired';
  }

  const now = new Date();
  const airDate = new Date(airDateUtc);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const airDay = new Date(airDate.getFullYear(), airDate.getMonth(), airDate.getDate());

  if (airDay.getTime() === today.getTime()) {
    return 'airing';
  }

  if (airDate < now) {
    return 'missing';
  }

  return 'unaired';
}

/**
 * Determine movie status based on release date and whether a file is present on disk.
 */
export function determineMovieStatus(releaseDate: Date | null | undefined, hasFile: boolean): EpisodeStatus {
  if (hasFile) return 'downloaded';
  if (!releaseDate) return 'unaired';

  const now = new Date();
  if (releaseDate > now) return 'unaired';

  return 'missing';
}
