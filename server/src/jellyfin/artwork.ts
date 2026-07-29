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
  /**
   * Present when a requested Backdrop deliberately reuses persisted Primary
   * artwork. Mediarr does not persist movie or series backdrop URLs, so this
   * keeps the Jellyfin image surface useful without inventing a remote URL.
   */
  fallback?: 'primary';
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
  fallback?: JellyfinArtworkSource['fallback'],
): JellyfinArtworkSource | null {
  const url = record?.posterUrl?.trim();
  return url ? { url, inherited, ...(fallback === undefined ? {} : { fallback }) } : null;
}

/**
 * Resolves artwork for a Jellyfin item using persisted poster URLs. Primary
 * returns the poster directly. Mediarr has no movie or series backdrop URL,
 * so Backdrop deliberately falls back to the same persisted Primary artwork;
 * the returned source marks that choice for callers and tests. Other image
 * types are unsupported rather than fabricated.
 *
 * Image resize query parameters belong to the HTTP route and are safely
 * ignored there: this resolver only selects the source URL, and proxy URL
 * allowlisting remains unchanged.
 */
export async function resolveJellyfinArtworkSource(
  catalog: JellyfinCatalogRepository,
  rawItemId: string,
  imageType: string,
): Promise<JellyfinArtworkSource | null> {
  const normalizedImageType = imageType.trim().toLowerCase();
  if (normalizedImageType !== 'primary' && normalizedImageType !== 'backdrop') {
    return null;
  }

  const fallback = normalizedImageType === 'backdrop' ? 'primary' : undefined;
  const itemId = decodeJellyfinId(rawItemId);
  if (!itemId) {
    return null;
  }

  switch (itemId.kind) {
    case 'movie':
      return posterSource(await catalog.findMovieById(itemId.id), false, fallback);
    case 'series':
      return posterSource(await catalog.findSeriesById(itemId.id), false, fallback);
    case 'season': {
      const season = await catalog.findSeasonById(itemId.id);
      if (!season) {
        return null;
      }
      return posterSource(await catalog.findSeriesById(season.seriesId), true, fallback);
    }
    case 'episode': {
      const episode = await catalog.findEpisodeById(itemId.id);
      if (!episode) {
        return null;
      }
      return posterSource(await catalog.findSeriesById(episode.seriesId), true, fallback);
    }
    case 'movie-view':
    case 'tv-view':
      return null;
  }
}
