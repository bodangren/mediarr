export interface MovieCollection {
  id: number;
  tmdbCollectionId: number;
  name: string;
  overview?: string | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  movieCount: number;
  moviesInLibrary: number;
  monitored: boolean;
  movies?: CollectionMovie[];
  qualityProfileId?: number | null;
  qualityProfile?: { id: number; name: string } | null;
  minimumAvailability?: string;
  rootFolderPath?: string | null;
  addMoviesAutomatically?: boolean;
  searchOnAdd?: boolean;
}

export interface CollectionMovie {
  id: number;
  tmdbId: number;
  title: string;
  year: number;
  posterUrl?: string | null;
  overview?: string | null;
  status?: string;
  inLibrary: boolean;
  monitored?: boolean;
  quality?: string | null;
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
