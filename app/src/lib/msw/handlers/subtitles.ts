import { http } from 'msw';
import {
  createMockDataset,
  createMockSubtitleBlacklistMovie,
  createMockSubtitleBlacklistSeries,
  createMockSubtitleHistoryItem,
  createMockSubtitleProvider,
  type FactoryMode,
} from '../factories';
import { sendSuccess } from './helpers';

export function createSubtitleHandlers(mode: FactoryMode = 'deterministic') {
  const dataset = createMockDataset(mode);

  return [
    http.get('/api/subtitles/movie/:id/variants', ({ params }) => {
      return sendSuccess([{ variantId: Number(params.id) * 10, path: '/media/movie.variant.mkv' }]);
    }),

    http.get('/api/subtitles/episode/:id/variants', ({ params }) => {
      return sendSuccess([{ variantId: Number(params.id) * 10, path: '/media/episode.variant.mkv' }]);
    }),

    http.post('/api/subtitles/search', () => {
      return sendSuccess([{ languageCode: 'en', isForced: false, isHi: false, provider: 'opensubtitles', score: 97 }]);
    }),

    http.post('/api/subtitles/download', () => {
      return sendSuccess({ storedPath: '/tmp/subtitle.srt' });
    }),

    http.get('/api/subtitles/wanted/movies', () => {
      return sendSuccess(dataset.movies.filter(m => m.fileVariants.length === 0).map(m => ({
        id: m.id,
        tmdbId: m.tmdbId,
        title: m.title,
        year: m.year,
        monitored: m.monitored,
      })));
    }),

    http.get('/api/subtitles/wanted/series', () => {
      return sendSuccess(dataset.series.filter(s =>
        s.seasons.some(season => season.episodes.some(e => e.path === null)),
      ).map(s => ({
        id: s.id,
        tvdbId: s.tvdbId,
        title: s.title,
        year: s.year,
        monitored: s.monitored,
      })));
    }),

    http.get('/api/subtitles/wanted/count', () => {
      const moviesCount = dataset.movies.filter(m => m.fileVariants.length === 0).length;
      const seriesCount = dataset.series.filter(s =>
        s.seasons.some(season => season.episodes.some(e => e.path === null)),
      ).length;
      return sendSuccess({ seriesCount, moviesCount, totalCount: seriesCount + moviesCount });
    }),

    http.get('/api/subtitles/history', () => {
      return sendSuccess([createMockSubtitleHistoryItem(1)]);
    }),

    http.get('/api/subtitles/history/stats', () => {
      return sendSuccess({
        period: '30d',
        downloads: 15,
        byProvider: [{ provider: 'opensubtitles', count: 10 }, { provider: 'addic7ed', count: 5 }],
        byLanguage: [{ languageCode: 'en', count: 12 }, { languageCode: 'fr', count: 3 }],
      });
    }),

    http.delete('/api/subtitles/history', () => {
      return sendSuccess({ deletedCount: 1 });
    }),

    http.get('/api/subtitles/providers', () => {
      return sendSuccess([
        createMockSubtitleProvider('opensubtitles'),
        createMockSubtitleProvider('addic7ed'),
      ]);
    }),

    http.get('/api/subtitles/providers/opensubtitles', () => {
      return sendSuccess(createMockSubtitleProvider('opensubtitles', { apiKey: '***' }));
    }),

    http.put('/api/subtitles/providers/opensubtitles', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return sendSuccess(createMockSubtitleProvider('opensubtitles', body));
    }),

    http.post('/api/subtitles/providers/opensubtitles/test', () => {
      return sendSuccess({ success: true, message: 'Connection successful' });
    }),

    http.post('/api/subtitles/providers/opensubtitles/reset', () => {
      return sendSuccess({ reset: true });
    }),

    http.get('/api/subtitles/blacklist/movies', () => {
      return sendSuccess([createMockSubtitleBlacklistMovie(1)]);
    }),

    http.get('/api/subtitles/blacklist/series', () => {
      return sendSuccess([createMockSubtitleBlacklistSeries(2)]);
    }),

    http.delete('/api/subtitles/blacklist/:id', ({ params }) => {
      return sendSuccess({ id: Number(params.id), deleted: true });
    }),

    http.delete('/api/subtitles/blacklist/movies', () => {
      return sendSuccess({ deletedCount: 1 });
    }),

    http.delete('/api/subtitles/blacklist/series', () => {
      return sendSuccess({ deletedCount: 1 });
    }),
  ];
}
