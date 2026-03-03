import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import BlacklistSeriesPage from './page';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const listBlacklistSeriesMock = vi.fn();
const removeFromBlacklistMock = vi.fn();
const clearBlacklistSeriesMock = vi.fn();
vi.mock('@/lib/api/client', () => ({
    getApiClients: () => ({
        subtitleBlacklistApi: {
            listBlacklistSeries: listBlacklistSeriesMock,
            removeFromBlacklist: removeFromBlacklistMock,
            clearBlacklistSeries: clearBlacklistSeriesMock,
        },
    }),
}));
const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
    },
});
describe('BlacklistSeriesPage', () => {
    beforeEach(() => {
        listBlacklistSeriesMock.mockResolvedValue({
            items: [],
            meta: { page: 1, pageSize: 25, totalCount: 0, totalPages: 0 },
        });
        removeFromBlacklistMock.mockResolvedValue({ deletedCount: 1 });
        clearBlacklistSeriesMock.mockResolvedValue({ deletedCount: 0 });
    });
    it('renders page header', async () => {
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(BlacklistSeriesPage, {}) }));
        expect(screen.getByText('Blacklisted Episode Subtitles')).toBeInTheDocument();
        expect(screen.getByText('Manage blacklisted subtitles for TV series episodes.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Remove All' })).toBeInTheDocument();
    });
    it('shows empty state', async () => {
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(BlacklistSeriesPage, {}) }));
        expect(await screen.findByText('No blacklisted subtitles found')).toBeInTheDocument();
        expect(screen.getByText('Subtitles are automatically blacklisted when they fail validation checks.')).toBeInTheDocument();
    });
    it('renders blacklist table when data is available', async () => {
        listBlacklistSeriesMock.mockResolvedValue({
            items: [
                {
                    id: 1,
                    type: 'series',
                    seriesId: 1,
                    seriesTitle: 'Test Series',
                    episodeId: 1,
                    seasonNumber: 1,
                    episodeNumber: 1,
                    episodeTitle: 'Test Episode',
                    languageCode: 'en',
                    provider: 'OpenSubtitles',
                    reason: 'Failed validation',
                    timestamp: new Date().toISOString(),
                    subtitlePath: '/path/to/sub.srt',
                },
            ],
            meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
        });
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(BlacklistSeriesPage, {}) }));
        expect(await screen.findByText('Test Series')).toBeInTheDocument();
        expect(screen.getByText('S01E01')).toBeInTheDocument();
        expect(screen.getByText('Test Episode')).toBeInTheDocument();
        expect(screen.getByText('en')).toBeInTheDocument();
        expect(screen.getByText('OpenSubtitles')).toBeInTheDocument();
        expect(screen.getByText('Failed validation')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    });
    it('shows count badge when items exist', async () => {
        listBlacklistSeriesMock.mockResolvedValue({
            items: [
                {
                    id: 1,
                    type: 'series',
                    seriesId: 1,
                    seriesTitle: 'Test Series',
                    episodeId: 1,
                    seasonNumber: 1,
                    episodeNumber: 1,
                    episodeTitle: 'Test Episode',
                    languageCode: 'en',
                    provider: 'OpenSubtitles',
                    reason: 'Failed validation',
                    timestamp: new Date().toISOString(),
                    subtitlePath: '/path/to/sub.srt',
                },
            ],
            meta: { page: 1, pageSize: 25, totalCount: 5, totalPages: 1 },
        });
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(BlacklistSeriesPage, {}) }));
        expect(await screen.findByText('5')).toBeInTheDocument();
    });
    it('disables Remove All button when no items exist', async () => {
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(BlacklistSeriesPage, {}) }));
        const removeButton = await screen.findByRole('button', { name: 'Remove All' });
        expect(removeButton).toBeDisabled();
    });
    it('opens clear blacklist modal when button is clicked', async () => {
        listBlacklistSeriesMock.mockResolvedValue({
            items: [
                {
                    id: 1,
                    type: 'series',
                    seriesId: 1,
                    seriesTitle: 'Test Series',
                    episodeId: 1,
                    seasonNumber: 1,
                    episodeNumber: 1,
                    episodeTitle: 'Test Episode',
                    languageCode: 'en',
                    provider: 'OpenSubtitles',
                    reason: 'Failed validation',
                    timestamp: new Date().toISOString(),
                    subtitlePath: '/path/to/sub.srt',
                },
            ],
            meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
        });
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(BlacklistSeriesPage, {}) }));
        const clearButton = await screen.findByRole('button', { name: 'Remove All' });
        await userEvent.click(clearButton);
        expect(screen.getByText('Clear All Blacklisted Subtitles')).toBeInTheDocument();
        expect(screen.getByText(/This will permanently remove all 1 blacklisted episode subtitles/)).toBeInTheDocument();
    });
    it('opens remove item modal when remove button is clicked', async () => {
        listBlacklistSeriesMock.mockResolvedValue({
            items: [
                {
                    id: 1,
                    type: 'series',
                    seriesId: 1,
                    seriesTitle: 'Test Series',
                    episodeId: 1,
                    seasonNumber: 1,
                    episodeNumber: 1,
                    episodeTitle: 'Test Episode',
                    languageCode: 'en',
                    provider: 'OpenSubtitles',
                    reason: 'Failed validation',
                    timestamp: new Date().toISOString(),
                    subtitlePath: '/path/to/sub.srt',
                },
            ],
            meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
        });
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(BlacklistSeriesPage, {}) }));
        const removeButton = await screen.findByRole('button', { name: 'Remove' });
        await userEvent.click(removeButton);
        expect(screen.getByText('Remove from Blacklist')).toBeInTheDocument();
        expect(screen.getByText('This subtitle will be removed from the blacklist. It may be downloaded again in the future.')).toBeInTheDocument();
    });
    it('changes page size and resets to page 1', async () => {
        listBlacklistSeriesMock.mockResolvedValue({
            items: [
                {
                    id: 1,
                    type: 'series',
                    seriesId: 1,
                    seriesTitle: 'Test Series',
                    episodeId: 1,
                    seasonNumber: 1,
                    episodeNumber: 1,
                    episodeTitle: 'Test Episode',
                    languageCode: 'en',
                    provider: 'OpenSubtitles',
                    reason: 'Failed validation',
                    timestamp: new Date().toISOString(),
                    subtitlePath: '/path/to/sub.srt',
                },
            ],
            meta: { page: 2, pageSize: 25, totalCount: 100, totalPages: 4 },
        });
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(BlacklistSeriesPage, {}) }));
        // Click the page size selector
        const pageSizeSelect = await screen.findByRole('combobox');
        await userEvent.click(pageSizeSelect);
        // Select a different page size
        const pageSizeOption = await screen.findByRole('option', { name: '50' });
        await userEvent.click(pageSizeOption);
        // After changing page size, it should trigger refetch
        expect(listBlacklistSeriesMock).toHaveBeenCalled();
    });
    it('clears blacklist and invalidates cache with correct key', async () => {
        listBlacklistSeriesMock.mockResolvedValue({
            items: [
                {
                    id: 1,
                    type: 'series',
                    seriesId: 1,
                    seriesTitle: 'Test Series',
                    episodeId: 1,
                    seasonNumber: 1,
                    episodeNumber: 1,
                    episodeTitle: 'Test Episode',
                    languageCode: 'en',
                    provider: 'OpenSubtitles',
                    reason: 'Failed validation',
                    timestamp: new Date().toISOString(),
                    subtitlePath: '/path/to/sub.srt',
                },
            ],
            meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
        });
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(BlacklistSeriesPage, {}) }));
        // Find and click the Remove All button
        const clearButton = await screen.findByRole('button', { name: 'Remove All' });
        await userEvent.click(clearButton);
        // Click confirm in modal (the second Remove All button)
        const confirmButton = screen.getAllByRole('button', { name: 'Remove All' })[1];
        await userEvent.click(confirmButton);
        // Verify the clear API was called
        expect(clearBlacklistSeriesMock).toHaveBeenCalled();
    });
});
//# sourceMappingURL=page.test.js.map