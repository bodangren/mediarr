export type JellyfinItemKind = 'movie' | 'series' | 'season' | 'episode' | 'movie-view' | 'tv-view';

const TYPE_CODES: Record<JellyfinItemKind, string> = {
  movie: '01',
  series: '02',
  season: '03',
  episode: '04',
  'movie-view': '10',
  'tv-view': '11',
};

const CODE_TYPES = new Map(Object.entries(TYPE_CODES).map(([kind, code]) => [code, kind as JellyfinItemKind]));
const PREFIX = '4d656469617272';
const HEX_LENGTH = 32;

export interface JellyfinItemId {
  kind: JellyfinItemKind;
  id: number;
}

/** Creates deterministic, reversible UUID-shaped identifiers for Jellyfin. */
export function encodeJellyfinId(kind: JellyfinItemKind, id: number): string {
  if (!Number.isSafeInteger(id) || id < 0) {
    throw new Error(`Invalid Jellyfin item id: ${id}`);
  }
  const hex = `${PREFIX}${TYPE_CODES[kind]}${id.toString(16).padStart(HEX_LENGTH - PREFIX.length - 2, '0')}`;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Decodes both dashed and compact identifiers, rejecting foreign UUIDs. */
export function decodeJellyfinId(value: string): JellyfinItemId | null {
  const hex = value.replace(/-/g, '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex) || !hex.startsWith(PREFIX)) {
    return null;
  }
  const kind = CODE_TYPES.get(hex.slice(PREFIX.length, PREFIX.length + 2));
  if (!kind) return null;
  const id = Number.parseInt(hex.slice(PREFIX.length + 2), 16);
  return Number.isSafeInteger(id) ? { kind, id } : null;
}

export const JELLYFIN_MOVIE_VIEW_ID = encodeJellyfinId('movie-view', 1);
export const JELLYFIN_TV_VIEW_ID = encodeJellyfinId('tv-view', 1);
