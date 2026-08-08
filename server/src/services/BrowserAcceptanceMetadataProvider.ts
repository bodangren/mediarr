import { ProviderUnavailableError } from '../errors/domainErrors';
import { MetadataProvider, type SeriesDetails } from './MetadataProvider';
import type { BaseMedia, MediaDetailsRequest, MediaSearchRequest } from '../types/BaseMedia';

const BROWSER_SEARCH_MOVIE: BaseMedia = {
  mediaType: 'MOVIE',
  tmdbId: 990_000_007,
  title: 'Browser Search Movie',
  status: 'released',
  overview: 'A deterministic local movie used only by production-browser acceptance tests.',
  year: 2026,
  images: [],
};

const BROWSER_SEARCH_SERIES: BaseMedia = {
  mediaType: 'TV',
  tvdbId: 990_000_008,
  title: 'Browser Search Series',
  status: 'continuing',
  overview: 'A deterministic local series used only by production-browser acceptance tests.',
  year: 2026,
  network: 'Mediarr Fixture Network',
  images: [],
};

/**
 * Local-only metadata used by the disposable browser daemon. It prevents
 * acceptance checks from reaching TVDB/TMDB while retaining the production
 * MetadataProvider contract used by routes and services.
 */
export class BrowserAcceptanceMetadataProvider extends MetadataProvider {
  override async searchMedia(request: MediaSearchRequest): Promise<BaseMedia[]> {
    if (request.term.toLowerCase().includes('browser provider failure')) {
      throw new ProviderUnavailableError('Browser acceptance metadata provider is temporarily unavailable');
    }

    if (!request.term.toLowerCase().includes('browser search')) {
      return [];
    }

    if (request.mediaType === 'MOVIE') {
      return [BROWSER_SEARCH_MOVIE];
    }
    if (request.mediaType === 'TV') {
      return [BROWSER_SEARCH_SERIES];
    }
    return [BROWSER_SEARCH_MOVIE, BROWSER_SEARCH_SERIES];
  }

  override async getMediaDetails(request: MediaDetailsRequest): Promise<BaseMedia> {
    if (request.mediaType === 'MOVIE' && request.tmdbId === BROWSER_SEARCH_MOVIE.tmdbId) {
      return BROWSER_SEARCH_MOVIE;
    }
    if (request.mediaType === 'TV' && request.tvdbId === BROWSER_SEARCH_SERIES.tvdbId) {
      return BROWSER_SEARCH_SERIES;
    }
    throw new Error('Browser acceptance metadata fixture was not found');
  }

  override async getSeriesDetails(tvdbId: number): Promise<SeriesDetails> {
    if (tvdbId !== BROWSER_SEARCH_SERIES.tvdbId) {
      throw new Error('Browser acceptance series fixture was not found');
    }
    return {
      series: { ...BROWSER_SEARCH_SERIES, tvdbId, seasons: [] },
      episodes: [],
    };
  }

  override async findMovieByImdbId(imdbId: string): Promise<BaseMedia | null> {
    return imdbId === BROWSER_SEARCH_MOVIE.imdbId ? BROWSER_SEARCH_MOVIE : null;
  }
}
