import { HttpClient } from '../indexers/HttpClient';
import { SettingsService } from './SettingsService';
import type {
  BaseMedia,
  MediaDetailsRequest,
  MediaSearchRequest,
  MediaType,
} from '../types/BaseMedia';

export interface SeriesSearchResult {
  tvdbId: number;
  title: string;
  status: string;
  overview?: string;
  year?: number;
  network?: string;
  slug?: string;
  images: Array<{ coverType: string; url: string }>;
}

export interface SeriesDetails {
  series: SeriesSearchResult & { seasons: any[] };
  episodes: any[];
}

export interface MovieSearchResult {
  tmdbId: number;
  title: string;
  status?: string;
  overview?: string;
  year?: number;
  imdbId?: string;
  images: Array<{ coverType: string; url: string }>;
}

export interface MovieDetails extends BaseMedia {
  mediaType: 'MOVIE';
  availability: string;
  inCinemas?: string;
  digitalRelease?: string;
  physicalRelease?: string;
}

/**
 * Service to fetch metadata for TV series from SkyHook (Sonarr's metadata proxy).
 */
export class MetadataProvider {
  private readonly tvBaseUrl = 'https://skyhook.sonarr.tv/v1/tvdb';
  private readonly movieBaseUrl = 'https://api.themoviedb.org/3';

  constructor(
    private readonly httpClient: HttpClient,
    private readonly settingsService: SettingsService,
  ) {}

  async searchMedia(request: MediaSearchRequest, fetchFn?: any): Promise<BaseMedia[]> {
    if (!request.mediaType) {
      const results = await Promise.allSettled([
        this.searchSeries(request.term, fetchFn),
        this.searchMovies(request.term, fetchFn),
      ]);

      const tvResults = results[0].status === 'fulfilled' ? results[0].value : [];
      const movieResults = results[1].status === 'fulfilled' ? results[1].value : [];

      if (results.some(r => r.status === 'rejected')) {
        console.error('One or more metadata providers failed during unified search:', 
          results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason)
        );
      }

      const mappedTv = tvResults.map(result => ({
        mediaType: 'TV' as MediaType,
        tvdbId: result.tvdbId,
        tmdbId: undefined,
        imdbId: undefined,
        title: result.title,
        status: result.status,
        overview: result.overview,
        year: result.year,
        network: result.network,
        images: result.images,
        popularity: (result as any).popularity ?? 0,
      }));

      const mappedMovies = movieResults.map(result => ({
        mediaType: 'MOVIE' as MediaType,
        tmdbId: result.tmdbId,
        imdbId: result.imdbId,
        title: result.title,
        status: result.status,
        overview: result.overview,
        year: result.year,
        images: result.images,
        popularity: (result as any).popularity ?? 0,
      }));

      return [...mappedTv, ...mappedMovies].sort(
        (a, b) => ((b as any).popularity ?? 0) - ((a as any).popularity ?? 0),
      );
    }

    if (request.mediaType === 'TV') {
      const results = await this.searchSeries(request.term, fetchFn);
      return results.map(result => ({
        mediaType: 'TV',
        tvdbId: result.tvdbId,
        tmdbId: undefined,
        imdbId: undefined,
        title: result.title,
        status: result.status,
        overview: result.overview,
        year: result.year,
        network: result.network,
        images: result.images,
      }));
    }

    const results = await this.searchMovies(request.term, fetchFn);
    return results.map(result => ({
      mediaType: 'MOVIE',
      tmdbId: result.tmdbId,
      imdbId: result.imdbId,
      title: result.title,
      status: result.status,
      overview: result.overview,
      year: result.year,
      images: result.images,
    }));
  }

  async getMediaDetails(request: MediaDetailsRequest, fetchFn?: any): Promise<BaseMedia | MovieDetails> {
    if (request.mediaType === 'TV') {
      if (!request.tvdbId) {
        throw new Error('tvdbId is required for TV metadata details');
      }

      const { series } = await this.getSeriesDetails(request.tvdbId, fetchFn);
      return {
        mediaType: 'TV',
        tvdbId: series.tvdbId,
        title: series.title,
        status: series.status,
        overview: series.overview,
        year: series.year,
        network: series.network,
      };
    }

    if (!request.tmdbId) {
      throw new Error('tmdbId is required for movie metadata details');
    }

    return this.getMovieDetails(request.tmdbId, fetchFn);
  }

  getMovieAvailability(movie: {
    status?: string;
    releaseDate?: string;
    digitalRelease?: string;
    physicalRelease?: string;
    inCinemas?: string;
  }): string {
    const now = Date.now();
    const normalizedStatus = movie.status?.toLowerCase().trim();
    if (normalizedStatus === 'streaming') {
      return 'streaming';
    }

    if (normalizedStatus && new Set(['released', 'digital']).has(normalizedStatus)) {
      return 'released';
    }

    const releaseDates = [movie.digitalRelease, movie.physicalRelease, movie.releaseDate]
      .filter((value): value is string => Boolean(value))
      .map(value => new Date(value).getTime())
      .filter(value => Number.isFinite(value));

    if (releaseDates.some(value => value <= now)) {
      return 'released';
    }

    if (movie.inCinemas) {
      const inCinemasTime = new Date(movie.inCinemas).getTime();
      if (Number.isFinite(inCinemasTime) && inCinemasTime <= now) {
        return 'in_cinemas';
      }
    }

    return 'announced';
  }

  /**
   * Search for a series by title.
   */
  async searchSeries(term: string, fetchFn?: any): Promise<SeriesSearchResult[]> {
    const encodedTerm = encodeURIComponent(term.toLowerCase().trim());
    const url = `${this.tvBaseUrl}/search/en/?term=${encodedTerm}`;
    
    const response = await this.httpClient.get(url, {}, fetchFn);
    
    if (!response.ok) {
      throw new Error(`Failed to search series: ${response.status} ${response.body}`);
    }

    const raw: any[] = JSON.parse(response.body);
    return raw.map(item => ({
      ...item,
      year: item.year ?? (item.firstAired ? parseInt(String(item.firstAired).slice(0, 4), 10) : undefined),
      popularity: item.rating?.count ?? 0,
    }));
  }

  /**
   * Get full details for a series including episodes.
   */
  async getSeriesDetails(tvdbId: number, fetchFn?: any): Promise<SeriesDetails> {
    const url = `${this.tvBaseUrl}/shows/en/${tvdbId}`;
    
    const response = await this.httpClient.get(url, {}, fetchFn);
    
    if (!response.ok) {
      throw new Error(`Failed to get series details: ${response.status} ${response.body}`);
    }

    const data = JSON.parse(response.body);
    
    return {
      series: data,
      episodes: data.episodes || []
    };
  }

  async findMovieByImdbId(imdbId: string, fetchFn?: any): Promise<BaseMedia | null> {
    const settings = await this.settingsService.get();
    const apiKey = settings.apiKeys.tmdbApiKey;

    if (!apiKey) {
      throw new Error('TMDB API Key is missing. Please configure it in settings.');
    }

    const normalizedImdbId = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;
    const url = `${this.movieBaseUrl}/find/${encodeURIComponent(normalizedImdbId)}?api_key=${encodeURIComponent(apiKey)}&external_source=imdb_id`;
    const response = await this.httpClient.get(url, {}, fetchFn);

    if (!response.ok) {
      throw new Error(`Failed to find movie by IMDb ID: ${response.status} ${response.body}`);
    }

    const payload = JSON.parse(response.body);
    const match = Array.isArray(payload.movie_results) ? payload.movie_results[0] : null;

    if (!match) {
      return null;
    }

    return {
      mediaType: 'MOVIE',
      tmdbId: match.id,
      imdbId: normalizedImdbId,
      title: match.title,
      status: match.status,
      overview: match.overview,
      year: this.parseYear(match.release_date),
      images: match.poster_path ? [{ coverType: 'poster', url: `https://image.tmdb.org/t/p/w500${match.poster_path}` }] : [],
    };
  }

  private async searchMovies(term: string, fetchFn?: any): Promise<MovieSearchResult[]> {
    const settings = await this.settingsService.get();
    const apiKey = settings.apiKeys.tmdbApiKey;

    if (!apiKey) {
      throw new Error('TMDB API Key is missing. Please configure it in settings.');
    }
    const encodedTerm = encodeURIComponent(term.toLowerCase().trim());
    const url = `${this.movieBaseUrl}/search/movie?api_key=${encodeURIComponent(apiKey)}&query=${encodedTerm}`;
    const response = await this.httpClient.get(url, {}, fetchFn);

    if (!response.ok) {
      throw new Error(`Failed to search movies: ${response.status} ${response.body}`);
    }

    const payload = JSON.parse(response.body);
    const results = Array.isArray(payload.results) ? payload.results : [];
    return results.map((movie: any) => ({
      tmdbId: movie.id,
      title: movie.title,
      status: movie.status,
      overview: movie.overview,
      year: this.parseYear(movie.release_date),
      popularity: movie.popularity ?? 0,
      images: movie.poster_path ? [{ coverType: 'poster', url: `https://image.tmdb.org/t/p/w500${movie.poster_path}` }] : [],
    }));
  }

  private async getMovieDetails(tmdbId: number, fetchFn?: any): Promise<MovieDetails> {
    const settings = await this.settingsService.get();
    const apiKey = settings.apiKeys.tmdbApiKey;

    if (!apiKey) {
      throw new Error('TMDB API Key is missing. Please configure it in settings.');
    }
    const url = `${this.movieBaseUrl}/movie/${tmdbId}?api_key=${encodeURIComponent(apiKey)}`;
    const response = await this.httpClient.get(url, {}, fetchFn);

    if (!response.ok) {
      throw new Error(`Failed to get movie details: ${response.status} ${response.body}`);
    }

    const movie = JSON.parse(response.body);
    const availability = this.getMovieAvailability({
      status: movie.status,
      releaseDate: movie.release_date,
      inCinemas: movie.in_cinemas,
      digitalRelease: movie.digital_release,
      physicalRelease: movie.physical_release,
    });

    return {
      mediaType: 'MOVIE',
      tmdbId: movie.id,
      imdbId: movie.imdb_id,
      title: movie.title,
      status: movie.status,
      overview: movie.overview,
      year: this.parseYear(movie.release_date),
      images: movie.poster_path
        ? [{ coverType: 'poster', url: `https://image.tmdb.org/t/p/w500${movie.poster_path}` }]
        : [],
      availability,
      inCinemas: movie.in_cinemas,
      digitalRelease: movie.digital_release,
      physicalRelease: movie.physical_release,
    };
  }

  private parseYear(releaseDate?: string): number | undefined {
    if (!releaseDate) {
      return undefined;
    }

    const year = parseInt(String(releaseDate).slice(0, 4), 10);
    return Number.isFinite(year) ? year : undefined;
  }
}
