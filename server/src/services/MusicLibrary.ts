/**
 * Music domain helpers (track feature_music_library_20261107, Phase 1).
 *
 * Pure contracts for the scanner and API: name normalisation, album identity, track ordering and the
 * scan summary shape. File parsing lives in the scanner so these rules are testable without disk.
 */

export interface ScannedTrack {
  path: string;
  artist: string | null;
  album: string | null;
  title: string | null;
  trackNumber: number | null;
  discNumber: number | null;
  durationSeconds: number | null;
  format: string | null;
  bitrate: number | null;
  sizeBytes: number | null;
}

export interface ScanSummary {
  scanned: number;
  artists: number;
  albums: number;
  tracks: number;
  unreadable: Array<{ path: string; error: string }>;
}

/** Casefolded identity key; collapses whitespace so tag noise cannot duplicate artists/albums. */
export function nameKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function albumTitleKey(value: string): string {
  return nameKey(value).replace(/[\u2018\u2019]/g, "'");
}

/**
 * Unknowns become explicit buckets instead of null artist cascades: a file tagged "Unknown Artist" is
 * catalogued (and fixable) rather than dropped.
 */
export function resolveArtist(raw: string | null | undefined): string {
  const value = (raw ?? '').trim();
  return value.length === 0 ? 'Unknown Artist' : value;
}

export function resolveAlbum(raw: string | null | undefined): string {
  const value = (raw ?? '').trim();
  return value.length === 0 ? 'Unknown Album' : value;
}

export function resolveTitle(raw: string | null | undefined, path: string): string {
  const value = (raw ?? '').trim();
  if (value.length > 0) return value;
  const base = path.split('/').pop() ?? path;
  return base.replace(/\.[^.]+$/, '');
}

/** Disc-then-track ordering with untagged tracks last, never interleaved by string comparison. */
export function trackOrderKey(track: { discNumber: number | null; trackNumber: number | null }): [number, number] {
  const disc = track.discNumber !== null && track.discNumber > 0 ? track.discNumber : 0;
  const number = track.trackNumber !== null && track.trackNumber > 0 ? track.trackNumber : 9999;
  return [disc, number];
}

/** Aggregates scan results for the receipt/API without touching the database. */
export function summarizeScan(tracks: readonly ScannedTrack[], unreadable: Array<{ path: string; error: string }> = []): ScanSummary {
  const artists = new Set<string>();
  const albums = new Set<string>();
  for (const track of tracks) {
    const artist = resolveArtist(track.artist);
    artists.add(nameKey(artist));
    albums.add(`${nameKey(artist)}::${albumTitleKey(resolveAlbum(track.album))}`);
  }
  return {
    scanned: tracks.length + unreadable.length,
    artists: artists.size,
    albums: albums.size,
    tracks: tracks.length,
    unreadable,
  };
}
