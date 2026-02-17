import type { MovieCollection, CollectionMovie } from '@/types/collection';

const createMockCollectionMovie = (id: number, overrides: Partial<CollectionMovie> = {}): CollectionMovie => ({
  id,
  tmdbId: id,
  title: `Collection Movie ${id}`,
  year: 2010 + (id % 14),
  posterUrl: `https://via.placeholder.com/300x450?text=Movie+${id}`,
  inLibrary: id % 3 !== 0,
  monitored: id % 2 === 0,
  ...overrides,
});

export const mockCollections: MovieCollection[] = [
  {
    id: 1,
    tmdbId: 86311,
    name: 'The Avengers Collection',
    overview: 'The Avengers film series produced by Marvel Studios.',
    posterUrl: 'https://via.placeholder.com/300x450?text=Avengers',
    movieCount: 6,
    moviesInLibrary: 5,
    monitored: true,
    movies: Array.from({ length: 6 }, (_, i) => createMockCollectionMovie(i + 1, {
      title: `Avengers Movie ${i + 1}`,
      year: 2012 + i,
    })),
  },
  {
    id: 2,
    tmdbId: 10,
    name: 'Star Wars Collection',
    overview: 'The Star Wars saga.',
    posterUrl: 'https://via.placeholder.com/300x450?text=Star+Wars',
    movieCount: 9,
    moviesInLibrary: 7,
    monitored: true,
    movies: Array.from({ length: 9 }, (_, i) => createMockCollectionMovie(i + 10, {
      title: `Star Wars Episode ${i + 1}`,
      year: 1977 + (i * 2),
    })),
  },
  {
    id: 3,
    tmdbId: 528,
    name: 'Harry Potter Collection',
    overview: 'The Harry Potter film series.',
    posterUrl: 'https://via.placeholder.com/300x450?text=Harry+Potter',
    movieCount: 8,
    moviesInLibrary: 6,
    monitored: false,
    movies: Array.from({ length: 8 }, (_, i) => createMockCollectionMovie(i + 19, {
      title: `Harry Potter ${i + 1}`,
      year: 2001 + i,
    })),
  },
  {
    id: 4,
    tmdbId: 157336,
    name: 'Marvel Cinematic Universe',
    overview: 'All Marvel superhero films.',
    posterUrl: 'https://via.placeholder.com/300x450?text=MCU',
    movieCount: 32,
    moviesInLibrary: 18,
    monitored: true,
    movies: Array.from({ length: 10 }, (_, i) => createMockCollectionMovie(i + 27, {
      title: `MCU Movie ${i + 1}`,
      year: 2008 + i,
    })),
  },
  {
    id: 5,
    tmdbId: 119089,
    name: 'The Dark Knight Trilogy',
    overview: 'Christopher Nolan\'s Batman trilogy.',
    posterUrl: 'https://via.placeholder.com/300x450?text=Dark+Knight',
    movieCount: 3,
    moviesInLibrary: 3,
    monitored: false,
    movies: Array.from({ length: 3 }, (_, i) => createMockCollectionMovie(i + 37, {
      title: `Batman ${2005 + (i * 3)}`,
      year: 2005 + (i * 3),
    })),
  },
];

export const mockCollectionMovies: Record<number, CollectionMovie[]> = {
  1: mockCollections[0].movies,
  2: mockCollections[1].movies,
  3: mockCollections[2].movies,
  4: mockCollections[3].movies,
  5: mockCollections[4].movies,
};
