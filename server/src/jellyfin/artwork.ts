import type { JellyfinCatalogRepository } from './catalog';
import { decodeJellyfinId } from './ids';

/** Kept in lockstep with the existing `/api/images/proxy` allowlist. */
export const JELLYFIN_ARTWORK_ALLOWED_HOSTS = [
  'image.tmdb.org',
  'artworks.thetvdb.com',
  'www.thetvdb.com',
  'thetvdb.com',
] as const;

const IMAGE_REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
};

const ARTWORK_CACHE_CONTROL = 'public, max-age=31536000';

export class ArtworkUrlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArtworkUrlValidationError';
  }
}

export interface JellyfinArtworkSource {
  url: string;
  /** True when a season or episode inherits the series poster. */
  inherited: boolean;
}

export type JellyfinArtworkProxyResult =
  | {
    ok: true;
    status: number;
    contentType: string;
    cacheControl: string;
    body: Uint8Array;
  }
  | {
    ok: false;
    status: number;
    statusText: string;
  };

export type JellyfinArtworkFetcher = (
  url: string,
  init: { headers: typeof IMAGE_REQUEST_HEADERS },
) => Promise<Pick<Response, 'ok' | 'status' | 'statusText' | 'headers' | 'arrayBuffer'>>;

/** Validates a remote artwork URL before Mediarr makes any outbound request. */
export function validateJellyfinArtworkUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ArtworkUrlValidationError('Invalid artwork URL');
  }

  if (!JELLYFIN_ARTWORK_ALLOWED_HOSTS.includes(
    parsed.hostname as typeof JELLYFIN_ARTWORK_ALLOWED_HOSTS[number],
  )) {
    throw new ArtworkUrlValidationError(`Artwork host ${parsed.hostname} is not allowed`);
  }

  return parsed;
}

/**
 * Fetches artwork from an allowlisted metadata host, retaining upstream error
 * statuses so the route layer can send a Jellyfin-compatible response.
 */
export async function proxyJellyfinArtwork(
  url: string,
  fetcher: JellyfinArtworkFetcher = globalThis.fetch,
): Promise<JellyfinArtworkProxyResult> {
  const parsed = validateJellyfinArtworkUrl(url);
  const response = await fetcher(parsed.toString(), {
    headers: IMAGE_REQUEST_HEADERS,
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      statusText: response.statusText,
    };
  }

  return {
    ok: true,
    status: response.status,
    contentType: response.headers.get('content-type') || 'image/jpeg',
    cacheControl: ARTWORK_CACHE_CONTROL,
    body: new Uint8Array(await response.arrayBuffer()),
  };
}

function posterSource(
  record: { posterUrl?: string | null | undefined } | null,
  inherited: boolean,
): JellyfinArtworkSource | null {
  const url = record?.posterUrl?.trim();
  return url ? { url, inherited } : null;
}

/**
 * Resolves a Primary poster for a Jellyfin item. Mediarr has no backdrop
 * column, so unsupported image types deliberately produce no fabricated art.
 */
export async function resolveJellyfinArtworkSource(
  catalog: JellyfinCatalogRepository,
  rawItemId: string,
  imageType: string,
): Promise<JellyfinArtworkSource | null> {
  if (imageType.trim().toLowerCase() !== 'primary') {
    return null;
  }

  const itemId = decodeJellyfinId(rawItemId);
  if (!itemId) {
    return null;
  }

  switch (itemId.kind) {
    case 'movie':
      return posterSource(await catalog.findMovieById(itemId.id), false);
    case 'series':
      return posterSource(await catalog.findSeriesById(itemId.id), false);
    case 'season': {
      const season = await catalog.findSeasonById(itemId.id);
      if (!season) {
        return null;
      }
      return posterSource(await catalog.findSeriesById(season.seriesId), true);
    }
    case 'episode': {
      const episode = await catalog.findEpisodeById(itemId.id);
      if (!episode) {
        return null;
      }
      return posterSource(await catalog.findSeriesById(episode.seriesId), true);
    }
    case 'movie-view':
    case 'tv-view':
      return null;
  }
}
