/**
 * Listening profile for the weekly music discovery run (track feature_music_library_20261107, Phase 5).
 *
 * The owner decision of 2026-11-11 is that the run must *look at what I listen to* and propose music,
 * not wait for a hand-curated picks file. This module turns the library's playback columns
 * (`playCount`/`lastPlayedAt`/`isPlayed`) plus the full inventory into one honest, bounded payload:
 * what is played, by which artist, what was touched most recently, and everything already in the
 * library so the agent can dedupe. It is pure so the ordering and the thin-data flag are testable.
 *
 * Live signal is thin (1 play / 3 touched tracks as of 2026-11-11), so `dataQuality` never pretends
 * otherwise: the run is expected to supplement this with the browser's history/likes.
 */

export interface ListeningTrackRow {
  id: number;
  title: string;
  artistName: string;
  playCount: number;
  lastPlayedAt: Date | null;
  isPlayed?: boolean | null;
  position?: number | null;
  /** Negative signal (owner request 2026-11-28): leaving before the 90 % play threshold. */
  skipCount?: number | null;
  earlySkipCount?: number | null;
  lastSkippedAt?: Date | null;
}

export interface ListeningProfileArtist {
  name: string;
  plays: number;
  lastPlayedAt: string | null;
  /** Number of library tracks by this artist (not plays). */
  tracks: number;
}

export interface ListeningProfileTrack {
  id: number;
  title: string;
  artist: string;
  playCount: number;
  lastPlayedAt: string | null;
}

export interface ListeningProfileSkippedTrack {
  id: number;
  title: string;
  artist: string;
  skipCount: number;
  earlySkipCount: number;
  lastSkippedAt: string | null;
}

export interface ListeningProfileSkippedArtist {
  name: string;
  skips: number;
  earlySkips: number;
  tracks: number;
  plays: number;
  lastSkippedAt: string | null;
}

export interface ListeningProfile {
  artists: ListeningProfileArtist[];
  /** Anti-indicator: what the owner rejected, for the weekly run to steer away from. */
  skippedTracks: ListeningProfileSkippedTrack[];
  skippedArtists: ListeningProfileSkippedArtist[];
  tracks: ListeningProfileTrack[];
  recentlyPlayed: ListeningProfileTrack[];
  library: {
    trackCount: number;
    artistNames: string[];
    /** "artist — title" (em dash) so the agent can string-compare before picking. */
    trackKeys: string[];
  };
  dataQuality: {
    playsObserved: number;
    tracksPlayed: number;
    lastPlayedAt: string | null;
    /** True while there are fewer than `insufficientThreshold` observed plays. */
    insufficientHistory: boolean;
    /** Total skips observed (negative signal). */
    skipsObserved: number;
  };
}

export interface ListeningProfileOptions {
  /** Safety cap for the artist ranking; the library inventory is intentionally not capped. */
  maxArtists?: number;
  maxTracks?: number;
  maxRecentlyPlayed?: number;
  insufficientThreshold?: number;
}

export const LISTENING_PROFILE_DEFAULTS = {
  maxArtists: 25,
  maxTracks: 50,
  maxRecentlyPlayed: 50,
  insufficientThreshold: 10,
} as const;

function iso(value: Date | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function timeOf(value: string | null): number {
  return value === null ? 0 : Date.parse(value);
}

/**
 * Builds the weekly run's view of the owner's listening. Only tracks with an observed play or a
 * touched `lastPlayedAt` enter `tracks`/`recentlyPlayed`; the whole library enters `library`.
 */
export function buildListeningProfile(
  rows: readonly ListeningTrackRow[],
  options: ListeningProfileOptions = {},
): ListeningProfile {
  const maxArtists = options.maxArtists ?? LISTENING_PROFILE_DEFAULTS.maxArtists;
  const maxTracks = options.maxTracks ?? LISTENING_PROFILE_DEFAULTS.maxTracks;
  const maxRecentlyPlayed = options.maxRecentlyPlayed ?? LISTENING_PROFILE_DEFAULTS.maxRecentlyPlayed;
  const insufficientThreshold = options.insufficientThreshold ?? LISTENING_PROFILE_DEFAULTS.insufficientThreshold;

  const artistMap = new Map<string, { plays: number; lastPlayedAt: string | null; tracks: number }>();
  for (const row of rows) {
    const name = row.artistName;
    const entry = artistMap.get(name) ?? { plays: 0, lastPlayedAt: null, tracks: 0 };
    entry.plays += Math.max(0, row.playCount);
    entry.tracks += 1;
    const played = iso(row.lastPlayedAt);
    if (played !== null && (entry.lastPlayedAt === null || timeOf(played) > timeOf(entry.lastPlayedAt))) {
      entry.lastPlayedAt = played;
    }
    artistMap.set(name, entry);
  }

  const artists = [...artistMap.entries()]
    .map(([name, entry]) => ({ name, ...entry }))
    .sort((a, b) => {
      if (b.plays !== a.plays) return b.plays - a.plays;
      const recency = timeOf(b.lastPlayedAt) - timeOf(a.lastPlayedAt);
      if (recency !== 0) return recency;
      return a.name.localeCompare(b.name);
    })
    .slice(0, Math.max(0, maxArtists));

  const observed = rows.filter((row) => row.playCount > 0 || row.lastPlayedAt !== null);

  const tracks = observed
    .map((row) => ({
      id: row.id,
      title: row.title,
      artist: row.artistName,
      playCount: row.playCount,
      lastPlayedAt: iso(row.lastPlayedAt),
    }))
    .sort((a, b) => {
      if (b.playCount !== a.playCount) return b.playCount - a.playCount;
      const recency = timeOf(b.lastPlayedAt) - timeOf(a.lastPlayedAt);
      if (recency !== 0) return recency;
      return a.title.localeCompare(b.title);
    })
    .slice(0, Math.max(0, maxTracks));

  const recentlyPlayed = observed
    .filter((row) => row.lastPlayedAt !== null)
    .map((row) => ({
      id: row.id,
      title: row.title,
      artist: row.artistName,
      playCount: row.playCount,
      lastPlayedAt: iso(row.lastPlayedAt),
    }))
    .sort((a, b) => {
      const recency = timeOf(b.lastPlayedAt) - timeOf(a.lastPlayedAt);
      if (recency !== 0) return recency;
      return a.title.localeCompare(b.title);
    })
    .slice(0, Math.max(0, maxRecentlyPlayed));

  const skippedRows = rows.filter((row) => Math.max(0, row.skipCount ?? 0) > 0);
  const skippedTracks = skippedRows
    .map((row) => ({
      id: row.id,
      title: row.title,
      artist: row.artistName,
      skipCount: Math.max(0, row.skipCount ?? 0),
      earlySkipCount: Math.max(0, row.earlySkipCount ?? 0),
      lastSkippedAt: iso(row.lastSkippedAt ?? null),
    }))
    .sort((a, b) => {
      if (b.earlySkipCount !== a.earlySkipCount) return b.earlySkipCount - a.earlySkipCount;
      if (b.skipCount !== a.skipCount) return b.skipCount - a.skipCount;
      const recency = timeOf(b.lastSkippedAt) - timeOf(a.lastSkippedAt);
      if (recency !== 0) return recency;
      return a.title.localeCompare(b.title);
    })
    .slice(0, Math.max(0, maxTracks));

  const skippedArtistMap = new Map<string, { skips: number; earlySkips: number; tracks: number; plays: number; lastSkippedAt: string | null }>();
  for (const row of rows) {
    const skips = Math.max(0, row.skipCount ?? 0);
    if (skips === 0) continue;
    const name = row.artistName;
    const entry = skippedArtistMap.get(name) ?? { skips: 0, earlySkips: 0, tracks: 0, plays: 0, lastSkippedAt: null };
    entry.skips += skips;
    entry.earlySkips += Math.max(0, row.earlySkipCount ?? 0);
    entry.tracks += 1;
    entry.plays += Math.max(0, row.playCount);
    const skippedAt = iso(row.lastSkippedAt ?? null);
    if (skippedAt !== null && (entry.lastSkippedAt === null || timeOf(skippedAt) > timeOf(entry.lastSkippedAt))) {
      entry.lastSkippedAt = skippedAt;
    }
    skippedArtistMap.set(name, entry);
  }
  const skippedArtists = [...skippedArtistMap.entries()]
    .map(([name, entry]) => ({ name, ...entry }))
    .sort((a, b) => {
      if (b.earlySkips !== a.earlySkips) return b.earlySkips - a.earlySkips;
      if (b.skips !== a.skips) return b.skips - a.skips;
      const recency = timeOf(b.lastSkippedAt) - timeOf(a.lastSkippedAt);
      if (recency !== 0) return recency;
      return a.name.localeCompare(b.name);
    })
    .slice(0, Math.max(0, maxArtists));

  const artistNames = [...new Set(rows.map((row) => row.artistName))].sort((a, b) => a.localeCompare(b));
  const trackKeys = [...new Set(rows.map((row) => `${row.artistName} — ${row.title}`))].sort((a, b) =>
    a.localeCompare(b),
  );

  const playsObserved = rows.reduce((sum, row) => sum + Math.max(0, row.playCount), 0);
  const tracksPlayed = rows.filter((row) => row.playCount > 0).length;
  const lastPlayedAt = rows.reduce<string | null>((latest, row) => {
    const played = iso(row.lastPlayedAt);
    if (played === null) return latest;
    return latest === null || timeOf(played) > timeOf(latest) ? played : latest;
  }, null);

  return {
    artists,
    skippedTracks,
    skippedArtists,
    tracks,
    recentlyPlayed,
    library: {
      trackCount: rows.length,
      artistNames,
      trackKeys,
    },
    dataQuality: {
      playsObserved,
      tracksPlayed,
      lastPlayedAt,
      insufficientHistory: playsObserved < insufficientThreshold,
      skipsObserved: rows.reduce((sum, row) => sum + Math.max(0, row.skipCount ?? 0), 0),
    },
  };
}
