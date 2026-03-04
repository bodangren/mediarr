import type { MovieListItem as ApiMovieListItem } from '@/lib/api/mediaApi';

/**
 * View mode options for movie library.
 */
export type MovieViewMode = 'table' | 'poster' | 'overview';

/**
 * Movie options state for localStorage persistence.
 */
export interface MovieOptionsState {
  viewMode: MovieViewMode;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

/**
 * Extended movie item with computed properties for UI views.
 */
export interface MovieListItem extends ApiMovieListItem {
  posterUrl?: string;
  overview?: string;
  runtime?: number;
  certification?: string;
  sizeOnDisk?: number;
  fileVariants?: Array<{
    id?: number;
    path?: string;
    subtitleTracks?: Array<{
      languageCode?: string | null;
      isForced?: boolean;
      isHi?: boolean;
      filePath?: string | null;
    }>;
    missingSubtitles?: Array<{
      languageCode?: string | null;
      isForced?: boolean;
      isHi?: boolean;
    }>;
  }>;
  ratings?: {
    tmdb?: number;
    imdb?: number;
    rottenTomatoes?: number;
  };
}

/**
 * Determine file status for a movie.
 */
export function getFileStatus(item: MovieListItem): 'missing' | 'wanted' | 'completed' | 'downloading' {
  if (!item.fileVariants || item.fileVariants.length === 0) {
    return 'wanted';
  }

  const hasFile = item.fileVariants.some(variant => Boolean(variant.path));

  if (hasFile) {
    return 'completed';
  }

  return 'downloading';
}

/**
 * Get rating display value (prefers TMDB, falls back to IMDb, then RT).
 */
export function getRatingDisplay(item: MovieListItem): number | undefined {
  return item.ratings?.tmdb ?? item.ratings?.imdb ?? item.ratings?.rottenTomatoes;
}

/**
 * Get formatted runtime string.
 */
export function getRuntimeDisplay(runtime?: number): string {
  if (!runtime) return '-';

  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Detailed movie information for the movie detail page.
 */
export interface MovieDetail {
  id: number;
  title: string;
  year?: number;
  overview?: string;
  runtime?: number;
  certification?: string;
  posterUrl?: string;
  backdropUrl?: string;
  status: string;
  monitored: boolean;
  qualityProfileId: number;
  qualityProfileName?: string;
  sizeOnDisk?: number;
  path?: string;
  genres?: string[];
  studio?: string;
  collection?: { id: number; name: string; posterUrl?: string | null };
  ratings: MovieRatings;
  files: MovieFile[];
  cast: CastMember[];
  crew: CrewMember[];
  alternateTitles: AlternateTitle[];
}

/**
 * Movie ratings from various sources.
 */
export interface MovieRatings {
  tmdb?: number;
  imdb?: number;
  rottenTomatoes?: number;
}

/**
 * Movie file information.
 */
export interface MovieFile {
  id: number;
  path: string;
  quality: string;
  size: number;
  language: string;
}

/**
 * Cast member information.
 */
export interface CastMember {
  id: number;
  name: string;
  character: string;
  profileUrl?: string;
}

/**
 * Crew member information.
 */
export interface CrewMember {
  id: number;
  name: string;
  role: string;
  profileUrl?: string;
}

/**
 * Alternate title information.
 */
export interface AlternateTitle {
  title: string;
  source: string;
}

/**
 * Format file size in human readable format.
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return '-';

  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(1)} GB`;
  }

  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${Math.round(mb)} MB`;
  }

  return `${bytes} B`;
}
