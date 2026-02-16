// Mock data for Import Series feature (development only)
import type { DetectedSeries, SeriesSearchResult } from './types';

export const mockDetectedSeries: DetectedSeries[] = [
  {
    id: 1,
    folderName: 'Breaking Bad',
    path: '/media/tv/Breaking Bad',
    fileCount: 62,
    matchedSeriesId: 123,
    matchedSeriesTitle: 'Breaking Bad',
    matchedSeriesYear: 2008,
    status: 'matched',
  },
  {
    id: 2,
    folderName: 'The Office US',
    path: '/media/tv/The Office US',
    fileCount: 201,
    matchedSeriesId: null,
    status: 'unmatched',
  },
  {
    id: 3,
    folderName: 'Game of Thrones',
    path: '/media/tv/Game of Thrones',
    fileCount: 73,
    matchedSeriesId: 456,
    matchedSeriesTitle: 'Game of Thrones',
    matchedSeriesYear: 2011,
    status: 'matched',
  },
  {
    id: 4,
    folderName: 'Stranger Things',
    path: '/media/tv/Stranger Things',
    fileCount: 34,
    matchedSeriesId: null,
    status: 'pending',
  },
];

export const mockSearchResults: SeriesSearchResult[] = [
  {
    id: 101,
    title: 'The Office',
    year: 2005,
    overview: 'A mockumentary on a group of typical office workers.',
    network: 'NBC',
    status: 'ended',
    tvdbId: 73244,
    images: [],
  },
  {
    id: 102,
    title: 'The Office (UK)',
    year: 2001,
    overview: 'The original British version of the mockumentary.',
    network: 'BBC Two',
    status: 'ended',
    tvdbId: 73545,
    images: [],
  },
  {
    id: 103,
    title: 'The Office Australia',
    year: 2024,
    overview: 'Australian adaptation of the comedy series.',
    network: 'Amazon Prime',
    status: 'continuing',
    tvdbId: 856732,
    images: [],
  },
];
