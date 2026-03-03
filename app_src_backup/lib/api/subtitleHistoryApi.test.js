import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ApiHttpClient } from './httpClient';
import { createSubtitleHistoryApi } from './subtitleHistoryApi';
describe('subtitleHistoryApi', () => {
    const mockRequest = vi.fn();
    const mockRequestPaginated = vi.fn();
    const client = {
        request: mockRequest,
        requestPaginated: mockRequestPaginated,
    };
    const api = createSubtitleHistoryApi(client);
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe('listHistory', () => {
        it('should fetch history with default parameters', async () => {
            const mockHistoryItems = {
                items: [
                    {
                        id: 1,
                        type: 'movie',
                        movieId: 123,
                        movieTitle: 'Test Movie',
                        languageCode: 'en',
                        provider: 'opensubtitles',
                        score: 0.95,
                        action: 'download',
                        timestamp: '2026-02-17T10:00:00Z',
                    },
                    {
                        id: 2,
                        type: 'series',
                        seriesId: 456,
                        seriesTitle: 'Test Series',
                        episodeId: 789,
                        seasonNumber: 1,
                        episodeNumber: 1,
                        episodeTitle: 'Pilot',
                        languageCode: 'en',
                        provider: 'opensubtitles',
                        score: 0.92,
                        action: 'upgrade',
                        timestamp: '2026-02-17T09:00:00Z',
                    },
                ],
                meta: {
                    page: 1,
                    pageSize: 20,
                    totalCount: 2,
                    totalPages: 1,
                },
            };
            mockRequestPaginated.mockResolvedValue(mockHistoryItems);
            const result = await api.listHistory();
            expect(mockRequestPaginated).toHaveBeenCalledWith({
                path: '/api/subtitles/history',
                query: {},
            }, expect.any(Object));
            expect(result).toEqual(mockHistoryItems);
        });
        it('should fetch history with pagination', async () => {
            const mockHistoryItems = {
                items: [],
                meta: {
                    page: 2,
                    pageSize: 10,
                    totalCount: 25,
                    totalPages: 3,
                },
            };
            mockRequestPaginated.mockResolvedValue(mockHistoryItems);
            const result = await api.listHistory({ page: 2, pageSize: 10 });
            expect(mockRequestPaginated).toHaveBeenCalledWith({
                path: '/api/subtitles/history',
                query: { page: 2, pageSize: 10 },
            }, expect.any(Object));
            expect(result.meta.page).toBe(2);
            expect(result.meta.pageSize).toBe(10);
        });
        it('should filter by type', async () => {
            const mockHistoryItems = {
                items: [
                    {
                        id: 1,
                        type: 'series',
                        seriesId: 456,
                        seriesTitle: 'Test Series',
                        languageCode: 'en',
                        provider: 'opensubtitles',
                        score: 0.92,
                        action: 'download',
                        timestamp: '2026-02-17T09:00:00Z',
                    },
                ],
                meta: {
                    page: 1,
                    pageSize: 20,
                    totalCount: 1,
                    totalPages: 1,
                },
            };
            mockRequestPaginated.mockResolvedValue(mockHistoryItems);
            const result = await api.listHistory({ type: 'series' });
            expect(mockRequestPaginated).toHaveBeenCalledWith({
                path: '/api/subtitles/history',
                query: { type: 'series' },
            }, expect.any(Object));
            expect(result.items).toHaveLength(1);
            expect(result.items[0].type).toBe('series');
        });
        it('should filter by provider', async () => {
            mockRequestPaginated.mockResolvedValue({
                items: [],
                meta: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
            });
            await api.listHistory({ provider: 'subscene' });
            expect(mockRequestPaginated).toHaveBeenCalledWith({
                path: '/api/subtitles/history',
                query: { provider: 'subscene' },
            }, expect.any(Object));
        });
        it('should filter by language code', async () => {
            mockRequestPaginated.mockResolvedValue({
                items: [],
                meta: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
            });
            await api.listHistory({ languageCode: 'es' });
            expect(mockRequestPaginated).toHaveBeenCalledWith({
                path: '/api/subtitles/history',
                query: { languageCode: 'es' },
            }, expect.any(Object));
        });
        it('should filter by action', async () => {
            mockRequestPaginated.mockResolvedValue({
                items: [],
                meta: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
            });
            await api.listHistory({ action: 'manual' });
            expect(mockRequestPaginated).toHaveBeenCalledWith({
                path: '/api/subtitles/history',
                query: { action: 'manual' },
            }, expect.any(Object));
        });
        it('should filter by date range', async () => {
            mockRequestPaginated.mockResolvedValue({
                items: [],
                meta: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
            });
            await api.listHistory({
                startDate: '2026-02-01',
                endDate: '2026-02-17',
            });
            expect(mockRequestPaginated).toHaveBeenCalledWith({
                path: '/api/subtitles/history',
                query: { startDate: '2026-02-01', endDate: '2026-02-17' },
            }, expect.any(Object));
        });
        it('should handle all action types', async () => {
            const actions = [
                'download',
                'upgrade',
                'manual',
                'upload',
            ];
            for (const action of actions) {
                const mockItem = {
                    id: 1,
                    type: 'movie',
                    movieId: 123,
                    movieTitle: 'Test',
                    languageCode: 'en',
                    provider: 'test',
                    score: 0.9,
                    action,
                    timestamp: '2026-02-17T10:00:00Z',
                };
                mockRequestPaginated.mockResolvedValue({
                    items: [mockItem],
                    meta: { page: 1, pageSize: 20, totalCount: 1, totalPages: 1 },
                });
                const result = await api.listHistory({ action });
                expect(result.items[0].action).toBe(action);
            }
        });
        it('should include optional fields when present', async () => {
            const mockItem = {
                id: 1,
                type: 'series',
                seriesId: 456,
                seriesTitle: 'Test Series',
                episodeId: 789,
                seasonNumber: 1,
                episodeNumber: 5,
                episodeTitle: 'Episode 5',
                languageCode: 'en',
                provider: 'opensubtitles',
                score: 0.95,
                action: 'download',
                timestamp: '2026-02-17T10:00:00Z',
                filePath: '/path/to/subtitle.srt',
            };
            mockRequestPaginated.mockResolvedValue({
                items: [mockItem],
                meta: { page: 1, pageSize: 20, totalCount: 1, totalPages: 1 },
            });
            const result = await api.listHistory();
            expect(result.items[0].seriesId).toBe(456);
            expect(result.items[0].episodeId).toBe(789);
            expect(result.items[0].seasonNumber).toBe(1);
            expect(result.items[0].episodeNumber).toBe(5);
            expect(result.items[0].episodeTitle).toBe('Episode 5');
            expect(result.items[0].filePath).toBe('/path/to/subtitle.srt');
        });
    });
    describe('getHistoryStats', () => {
        it('should fetch stats for day period', async () => {
            const mockStats = {
                period: 'day',
                downloads: [
                    { date: '2026-02-17', series: 5, movies: 3 },
                ],
                byProvider: [
                    { provider: 'opensubtitles', count: 6 },
                    { provider: 'subscene', count: 2 },
                ],
                byLanguage: [
                    { language: 'en', count: 5 },
                    { language: 'es', count: 3 },
                ],
            };
            mockRequest.mockResolvedValue(mockStats);
            const result = await api.getHistoryStats({ period: 'day' });
            expect(mockRequest).toHaveBeenCalledWith({
                path: '/api/subtitles/history/stats',
                query: { period: 'day' },
            }, expect.any(Object));
            expect(result.period).toBe('day');
            expect(result.downloads).toHaveLength(1);
            expect(result.byProvider).toHaveLength(2);
            expect(result.byLanguage).toHaveLength(2);
        });
        it('should fetch stats for week period', async () => {
            const mockStats = {
                period: 'week',
                downloads: [
                    { date: '2026-02-11', series: 10, movies: 5 },
                    { date: '2026-02-12', series: 8, movies: 6 },
                    { date: '2026-02-13', series: 12, movies: 4 },
                ],
                byProvider: [
                    { provider: 'opensubtitles', count: 25 },
                    { provider: 'subscene', count: 10 },
                ],
                byLanguage: [
                    { language: 'en', count: 20 },
                    { language: 'es', count: 15 },
                ],
            };
            mockRequest.mockResolvedValue(mockStats);
            const result = await api.getHistoryStats({ period: 'week' });
            expect(mockRequest).toHaveBeenCalledWith({
                path: '/api/subtitles/history/stats',
                query: { period: 'week' },
            }, expect.any(Object));
            expect(result.downloads).toHaveLength(3);
        });
        it('should fetch stats for month period', async () => {
            mockRequest.mockResolvedValue({
                period: 'month',
                downloads: [],
                byProvider: [],
                byLanguage: [],
            });
            await api.getHistoryStats({ period: 'month' });
            expect(mockRequest).toHaveBeenCalledWith({
                path: '/api/subtitles/history/stats',
                query: { period: 'month' },
            }, expect.any(Object));
        });
        it('should fetch stats for year period', async () => {
            mockRequest.mockResolvedValue({
                period: 'year',
                downloads: [],
                byProvider: [],
                byLanguage: [],
            });
            await api.getHistoryStats({ period: 'year' });
            expect(mockRequest).toHaveBeenCalledWith({
                path: '/api/subtitles/history/stats',
                query: { period: 'year' },
            }, expect.any(Object));
        });
        it('should filter stats by provider', async () => {
            const mockStats = {
                period: 'week',
                downloads: [],
                byProvider: [
                    { provider: 'subscene', count: 10 },
                ],
                byLanguage: [],
            };
            mockRequest.mockResolvedValue(mockStats);
            const result = await api.getHistoryStats({ period: 'week', provider: 'subscene' });
            expect(mockRequest).toHaveBeenCalledWith({
                path: '/api/subtitles/history/stats',
                query: { period: 'week', provider: 'subscene' },
            }, expect.any(Object));
            expect(result.byProvider).toHaveLength(1);
            expect(result.byProvider[0].provider).toBe('subscene');
        });
        it('should filter stats by language code', async () => {
            mockRequest.mockResolvedValue({
                period: 'day',
                downloads: [],
                byProvider: [],
                byLanguage: [{ language: 'fr', count: 5 }],
            });
            await api.getHistoryStats({ period: 'day', languageCode: 'fr' });
            expect(mockRequest).toHaveBeenCalledWith({
                path: '/api/subtitles/history/stats',
                query: { period: 'day', languageCode: 'fr' },
            }, expect.any(Object));
        });
        it('should filter stats by action', async () => {
            mockRequest.mockResolvedValue({
                period: 'month',
                downloads: [],
                byProvider: [],
                byLanguage: [],
            });
            await api.getHistoryStats({ period: 'month', action: 'manual' });
            expect(mockRequest).toHaveBeenCalledWith({
                path: '/api/subtitles/history/stats',
                query: { period: 'month', action: 'manual' },
            }, expect.any(Object));
        });
        it('should combine multiple filters', async () => {
            mockRequest.mockResolvedValue({
                period: 'week',
                downloads: [],
                byProvider: [],
                byLanguage: [],
            });
            await api.getHistoryStats({
                period: 'week',
                provider: 'opensubtitles',
                languageCode: 'en',
                action: 'download',
            });
            expect(mockRequest).toHaveBeenCalledWith({
                path: '/api/subtitles/history/stats',
                query: {
                    period: 'week',
                    provider: 'opensubtitles',
                    languageCode: 'en',
                    action: 'download',
                },
            }, expect.any(Object));
        });
    });
    describe('clearHistory', () => {
        it('should clear all history when no type specified', async () => {
            const mockResult = { deletedCount: 150 };
            mockRequest.mockResolvedValue(mockResult);
            const result = await api.clearHistory();
            expect(mockRequest).toHaveBeenCalledWith({
                path: '/api/subtitles/history',
                method: 'DELETE',
                query: {},
            }, expect.any(Object));
            expect(result.deletedCount).toBe(150);
        });
        it('should clear series history only', async () => {
            const mockResult = { deletedCount: 75 };
            mockRequest.mockResolvedValue(mockResult);
            const result = await api.clearHistory('series');
            expect(mockRequest).toHaveBeenCalledWith({
                path: '/api/subtitles/history',
                method: 'DELETE',
                query: { type: 'series' },
            }, expect.any(Object));
            expect(result.deletedCount).toBe(75);
        });
        it('should clear movies history only', async () => {
            const mockResult = { deletedCount: 50 };
            mockRequest.mockResolvedValue(mockResult);
            const result = await api.clearHistory('movies');
            expect(mockRequest).toHaveBeenCalledWith({
                path: '/api/subtitles/history',
                method: 'DELETE',
                query: { type: 'movies' },
            }, expect.any(Object));
            expect(result.deletedCount).toBe(50);
        });
        it('should return zero when no history to clear', async () => {
            mockRequest.mockResolvedValue({ deletedCount: 0 });
            const result = await api.clearHistory('movies');
            expect(result.deletedCount).toBe(0);
        });
    });
});
//# sourceMappingURL=subtitleHistoryApi.test.js.map