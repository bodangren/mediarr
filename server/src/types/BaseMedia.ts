export type MediaType = 'TV' | 'MOVIE';

export interface BaseMedia {
  mediaType: MediaType;
  tmdbId?: number;
  tvdbId?: number;
  imdbId?: string;
  title: string;
  status?: string;
  overview?: string;
  year?: number;
  network?: string;
  images?: Array<{ coverType: string; url: string }>;
}

export interface MediaSearchRequest {
  mediaType?: MediaType;
  term: string;
}

export interface MediaDetailsRequest {
  mediaType: MediaType;
  tmdbId?: number;
  tvdbId?: number;
}
