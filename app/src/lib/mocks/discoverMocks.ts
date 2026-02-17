import type { DiscoverMovie, DiscoverMode } from '@/types/discover';

const GENRES = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 'Romance', 'Science Fiction', 'TV Movie', 'Thriller', 'War', 'Western'] as const;

const createMockMovie = (id: number, overrides: Partial<DiscoverMovie> = {}): DiscoverMovie => ({
  id,
  tmdbId: id,
  title: `Movie ${id}`,
  year: 2020 + (id % 6),
  overview: `This is the overview for Movie ${id}. It tells the story of...`,
  posterUrl: `https://via.placeholder.com/300x450?text=Movie+${id}`,
  backdropUrl: `https://via.placeholder.com/1920x1080?text=Backdrop+${id}`,
  genres: [GENRES[id % GENRES.length], GENRES[(id + 1) % GENRES.length]],
  certification: ['G', 'PG', 'PG-13', 'R', 'NC-17'][id % 5] as 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17',
  ratings: {
    tmdb: 6 + (id % 4) + Math.random(),
    imdb: 6 + (id % 4) + Math.random(),
  },
  releaseDate: `202${id % 5}-0${(id % 9) + 1}-${10 + (id % 20)}`,
  inLibrary: id % 3 === 0,
  ...overrides,
});

export const mockDiscoverMovies: Record<DiscoverMode, DiscoverMovie[]> = {
  popular: Array.from({ length: 24 }, (_, i) =>
    createMockMovie(i + 1, {
      title: `Popular Movie ${i + 1}`,
      ratings: { tmdb: 7 + Math.random() * 2, imdb: 7 + Math.random() * 2 },
    })
  ),
  'top-rated': Array.from({ length: 24 }, (_, i) =>
    createMockMovie(i + 101, {
      title: `Top Rated Movie ${i + 1}`,
      ratings: { tmdb: 8 + Math.random() * 2, imdb: 8 + Math.random() * 2 },
      year: 2010 + (i % 14),
    })
  ),
  'new-releases': Array.from({ length: 24 }, (_, i) =>
    createMockMovie(i + 201, {
      title: `New Release ${i + 1}`,
      year: 2024,
      releaseDate: `2024-0${(i % 9) + 1}-${10 + (i % 20)}`,
    })
  ),
  upcoming: Array.from({ length: 24 }, (_, i) =>
    createMockMovie(i + 301, {
      title: `Upcoming Movie ${i + 1}`,
      year: 2025,
      releaseDate: `2025-0${(i % 9) + 1}-${10 + (i % 20)}`,
    })
  ),
};

export const mockGenres = [...GENRES];

export const mockCertifications = ['G', 'PG', 'PG-13', 'R', 'NC-17'] as const;

export const mockLanguages = ['English', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 'Chinese', 'Italian'] as const;
