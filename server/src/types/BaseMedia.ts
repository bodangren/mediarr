export type MediaType = 'TV' | 'MOVIE';

export interface BaseMedia {
  mediaType: MediaType;
  tmdbId?: number | undefined;
  tvdbId?: number | undefined;
  imdbId?: string | undefined;
  title: string;
  status?: string | undefined;
  overview?: string | undefined;
  year?: number | undefined;
  network?: string | undefined;
  images?: Array<{ coverType: string; url: string }> | undefined;
  tmdbCollectionId?: number | undefined;
}

export interface MediaSearchRequest {
  mediaType?: MediaType | undefined;
  term: string;
}

export interface MediaDetailsRequest {
  mediaType: MediaType;
  tmdbId?: number | undefined;
  tvdbId?: number | undefined;
}
