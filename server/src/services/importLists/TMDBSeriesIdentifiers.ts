import type { HttpClient } from '../../indexers/HttpClient';

export interface TMDBSeriesIdentifiers {
  tvdbId: number;
  imdbId?: string | undefined;
}

/** Resolve the canonical TVDB identifier required by the series persistence contract. */
export async function resolveTMDBSeriesIdentifiers(
  httpClient: HttpClient,
  baseUrl: string,
  apiKey: string,
  tmdbId: number,
): Promise<TMDBSeriesIdentifiers> {
  const url = `${baseUrl}/tv/${tmdbId}/external_ids?api_key=${encodeURIComponent(apiKey)}`;
  const response = await httpClient.get(url);

  if (!response.ok) {
    throw new Error(
      `Failed to resolve identifiers for TMDB series ${tmdbId}: ${response.status} ${response.body}`,
    );
  }

  const payload = JSON.parse(response.body) as {
    tvdb_id?: unknown;
    imdb_id?: unknown;
  };
  const tvdbId = payload.tvdb_id;
  if (typeof tvdbId !== 'number' || !Number.isInteger(tvdbId) || tvdbId <= 0) {
    throw new Error(`TMDB series ${tmdbId} has no valid TVDB ID`);
  }

  const imdbId = typeof payload.imdb_id === 'string' && payload.imdb_id.trim()
    ? payload.imdb_id.trim()
    : undefined;

  return imdbId ? { tvdbId, imdbId } : { tvdbId };
}
