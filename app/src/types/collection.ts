export interface MovieCollection {
  id: number;
  tmdbId: number;
  name: string;
  overview?: string;
  posterUrl?: string;
  movieCount: number;
  moviesInLibrary: number;
  monitored: boolean;
  movies: CollectionMovie[];
}

export interface CollectionMovie {
  id: number;
  tmdbId: number;
  title: string;
  year: number;
  posterUrl?: string;
  inLibrary: boolean;
  monitored?: boolean;
}

export interface CollectionEditForm {
  name: string;
  overview: string;
  monitored: boolean;
  minimumAvailability: string;
  qualityProfileId: number;
  rootFolder: string;
  searchOnAdd: boolean;
}
