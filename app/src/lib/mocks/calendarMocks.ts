import type { CalendarEvent } from '@/types/calendar';

/**
 * Mock calendar movies data for testing.
 * This will be replaced with actual API data when the backend is ready.
 */

export const mockCalendarMoviesData: CalendarEvent[] = [
  {
    type: 'movie',
    data: {
      id: 1,
      movieId: 101,
      title: 'Dune: Part Two',
      releaseType: 'cinema',
      releaseDate: '2024-03-01',
      posterUrl: 'https://via.placeholder.com/300x450?text=Dune+Part+Two',
      status: 'monitored',
      hasFile: false,
      monitored: true,
      certification: 'PG-13',
      runtime: 166,
    },
  },
  {
    type: 'movie',
    data: {
      id: 2,
      movieId: 102,
      title: 'Godzilla x Kong: The New Empire',
      releaseType: 'cinema',
      releaseDate: '2024-03-29',
      posterUrl: 'https://via.placeholder.com/300x450?text=Godzilla+x+Kong',
      status: 'missing',
      hasFile: false,
      monitored: true,
      certification: 'PG-13',
      runtime: 115,
    },
  },
  {
    type: 'movie',
    data: {
      id: 3,
      movieId: 103,
      title: 'Civil War',
      releaseType: 'digital',
      releaseDate: '2024-04-12',
      posterUrl: 'https://via.placeholder.com/300x450?text=Civil+War',
      status: 'monitored',
      hasFile: false,
      monitored: true,
      certification: 'R',
      runtime: 109,
    },
  },
  {
    type: 'movie',
    data: {
      id: 4,
      movieId: 104,
      title: 'Kingdom of the Planet of the Apes',
      releaseType: 'cinema',
      releaseDate: '2024-05-10',
      posterUrl: 'https://via.placeholder.com/300x450?text=Planet+of+the+Apes',
      status: 'monitored',
      hasFile: false,
      monitored: true,
      certification: 'PG-13',
      runtime: 145,
    },
  },
  {
    type: 'movie',
    data: {
      id: 5,
      movieId: 105,
      title: 'Furiosa: A Mad Max Saga',
      releaseType: 'cinema',
      releaseDate: '2024-05-24',
      posterUrl: 'https://via.placeholder.com/300x450?text=Furiosa',
      status: 'missing',
      hasFile: false,
      monitored: true,
      certification: 'R',
      runtime: 148,
    },
  },
  {
    type: 'movie',
    data: {
      id: 6,
      movieId: 106,
      title: 'Inside Out 2',
      releaseType: 'cinema',
      releaseDate: '2024-06-14',
      posterUrl: 'https://via.placeholder.com/300x450?text=Inside+Out+2',
      status: 'monitored',
      hasFile: false,
      monitored: true,
      certification: 'PG',
      runtime: 96,
    },
  },
  {
    type: 'movie',
    data: {
      id: 7,
      movieId: 107,
      title: 'A Quiet Place: Day One',
      releaseType: 'cinema',
      releaseDate: '2024-06-28',
      posterUrl: 'https://via.placeholder.com/300x450?text=Quiet+Place+Day+One',
      status: 'monitored',
      hasFile: false,
      monitored: true,
      certification: 'PG-13',
      runtime: 100,
    },
  },
  {
    type: 'movie',
    data: {
      id: 8,
      movieId: 108,
      title: 'Deadpool & Wolverine',
      releaseType: 'cinema',
      releaseDate: '2024-07-26',
      posterUrl: 'https://via.placeholder.com/300x450?text=Deadpool+Wolverine',
      status: 'monitored',
      hasFile: false,
      monitored: true,
      certification: 'R',
      runtime: 128,
    },
  },
  {
    type: 'movie',
    data: {
      id: 9,
      movieId: 109,
      title: 'Oppenheimer',
      releaseType: 'physical',
      releaseDate: '2024-11-19',
      posterUrl: 'https://via.placeholder.com/300x450?text=Oppenheimer',
      status: 'downloaded',
      hasFile: true,
      monitored: true,
      certification: 'R',
      runtime: 180,
    },
  },
  {
    type: 'movie',
    data: {
      id: 10,
      movieId: 110,
      title: 'Barbie',
      releaseType: 'physical',
      releaseDate: '2024-10-17',
      posterUrl: 'https://via.placeholder.com/300x450?text=Barbie',
      status: 'downloaded',
      hasFile: true,
      monitored: false,
      certification: 'PG-13',
      runtime: 114,
    },
  },
  {
    type: 'movie',
    data: {
      id: 11,
      movieId: 111,
      title: 'The Batman',
      releaseType: 'digital',
      releaseDate: '2024-04-18',
      posterUrl: 'https://via.placeholder.com/300x450?text=The+Batman',
      status: 'monitored',
      hasFile: false,
      monitored: true,
      certification: 'PG-13',
      runtime: 176,
    },
  },
  {
    type: 'movie',
    data: {
      id: 12,
      movieId: 112,
      title: 'Interstellar',
      releaseType: 'physical',
      releaseDate: '2024-09-17',
      posterUrl: 'https://via.placeholder.com/300x450?text=Interstellar',
      status: 'unmonitored',
      hasFile: true,
      monitored: false,
      certification: 'PG-13',
      runtime: 169,
    },
  },
];

/**
 * Filter mock movies by date range.
 */
export function getMockMoviesInRange(
  startDate: string,
  endDate: string
): CalendarEvent[] {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return mockCalendarMoviesData.filter(event => {
    if (event.type !== 'movie') return false;

    const movieDate = new Date(event.data.releaseDate);
    return movieDate >= start && movieDate <= end;
  });
}
