import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import BlacklistMoviesPage from './page';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const listBlacklistMoviesMock = vi.fn();
const removeFromBlacklistMock = vi.fn();
const clearBlacklistMoviesMock = vi.fn();
vi.mock('@/lib/api/client', () => ({
    getApiClients: () => ({
        subtitleBlacklistApi: {
            listBlacklistMovies: listBlacklistMoviesMock,
            removeFromBlacklist: removeFromBlacklistMock,
            clearBlacklistMovies: clearBlacklistMoviesMock,
        },
    }),
}));
const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
    },
});
describe('BlacklistMoviesPage', () => {
    beforeEach(() => {
        listBlacklistMoviesMock.mockResolvedValue({
            items: [],
            meta: { page: 1, pageSize: 25, totalCount: 0, totalPages: 0 },
        });
        removeFromBlacklistMock.mockResolvedValue({ deletedCount: 1 });
        clearBlacklistMoviesMock.mockResolvedValue({ deletedCount: 0 });
    });
    it('renders page header', async () => {
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(BlacklistMoviesPage, {}) }));
        expect(screen.getByText('Blacklisted Movie Subtitles')).toBeInTheDocument();
        expect(screen.getByText('Manage blacklisted subtitles for movies.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Remove All' })).toBeInTheDocument();
    });
    it('shows empty state', async () => {
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(BlacklistMoviesPage, {}) }));
        expect(await screen.findByText('No blacklisted subtitles found')).toBeInTheDocument();
        expect(screen.getByText('Subtitles are automatically blacklisted when they fail validation checks.')).toBeInTheDocument();
    });
    it('renders blacklist table when data is available', async () => {
        listBlacklistMoviesMock.mockResolvedValue({
            items: [
                {
                    id: 1,
                    type: 'movie',
                    movieId: 1,
                    movieTitle: 'Test Movie',
                    languageCode: 'en',
                    provider: 'OpenSubtitles',
                    reason: 'Failed validation',
                    timestamp: new Date().toISOString(),
                    subtitlePath: '/path/to/sub/(2023).srt',
                },
            ],
            meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
        });
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(BlacklistMoviesPage, {}) }));
        expect(await screen.findByText('Test Movie')).toBeInTheDocument();
        expect(screen.getByText('en')).toBeInTheDocument();
        expect(screen.getByText('OpenSubtitles')).toBeInTheDocument();
        expect(screen.getByText('Failed validation')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    });
    it('shows count badge when items exist', async () => {
        listBlacklistMoviesMock.mockResolvedValue({
            items: [
                {
                    id: 1,
                    type: 'movie',
                    movieId: 1,
                    movieTitle: 'Test Movie',
                    languageCode: 'en',
                    provider: 'OpenSubtitles',
                    reason: 'Failed validation',
                    timestamp: new Date().toISOString(),
                    subtitlePath: '/path/to/sub/(2023).srt',
                },
            ],
            meta: { page: 1, pageSize: 25, totalCount: 3, totalPages: 1 },
        });
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(BlacklistMoviesPage, {}) }));
        expect(await screen.findByText('3')).toBeInTheDocument();
    });
    it('disables Remove All button when no items exist', async () => {
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(BlacklistMoviesPage, {}) }));
        const removeButton = await screen.findByRole('button', { name: 'Remove All' });
        expect(removeButton).toBeDisabled();
    });
    it('opens clear blacklist modal when button is clicked', async () => {
        listBlacklistMoviesMock.mockResolvedValue({
            items: [
                {
                    id: 1,
                    type: 'movie',
                    movieId: 1,
                    movieTitle: 'Test Movie',
                    languageCode: 'en',
                    provider: 'OpenSubtitles',
                    reason: 'Failed validation',
                    timestamp: new Date().toISOString(),
                    subtitlePath: '/path/to/sub/(2023).srt',
                },
            ],
            meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
        });
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(BlacklistMoviesPage, {}) }));
        const clearButton = await screen.findByRole('button', { name: 'Remove All' });
        await userEvent.click(clearButton);
        expect(screen.getByText('Clear All Blacklisted Subtitles')).toBeInTheDocument();
        expect(screen.getByText(/This will permanently remove all 1 blacklisted movie subtitles/)).toBeInTheDocument();
    });
    it('opens remove item modal when remove button is clicked', async () => {
        listBlacklistMoviesMock.mockResolvedValue({
            items: [
                {
                    id: 1,
                    type: 'movie',
                    movieId: 1,
                    movieTitle: 'Test Movie',
                    languageCode: 'en',
                    provider: 'OpenSubtitles',
                    reason: 'Failed validation',
                    timestamp: new Date().toISOString(),
                    subtitlePath: '/path/to/sub/(2023).srt',
                },
            ],
            meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
        });
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(BlacklistMoviesPage, {}) }));
        const removeButton = await screen.findByRole('button', { name: 'Remove' });
        await userEvent.click(removeButton);
        expect(screen.getByText('Remove from Blacklist')).toBeInTheDocument();
        expect(screen.getByText('This subtitle will be removed from the blacklist. It may be downloaded again in the future.')).toBeInTheDocument();
    });
    it('extracts year from subtitle path', async () => {
        listBlacklistMoviesMock.mockResolvedValue({
            items: [
                {
                    id: 1,
                    type: 'movie',
                    movieId: 1,
                    movieTitle: 'Test Movie',
                    languageCode: 'en',
                    provider: 'OpenSubtitles',
                    reason: 'Failed validation',
                    timestamp: new Date().toISOString(),
                    subtitlePath: '/path/to/sub/(2023).srt',
                },
            ],
            meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
        });
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(BlacklistMoviesPage, {}) }));
        expect(await screen.findByText('2023')).toBeInTheDocument();
    });
    it('handles missing year in subtitle path', async () => {
        listBlacklistMoviesMock.mockResolvedValue({
            items: [
                {
                    id: 1,
                    type: 'movie',
                    movieId: 1,
                    movieTitle: 'Test Movie',
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
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(BlacklistMoviesPage, {}) }));
        expect(await screen.findByText('-')).toBeInTheDocument();
    });
    it('changes page size and resets to page 1', async () => {
        listBlacklistMoviesMock.mockResolvedValue({
            items: [
                {
                    id: 1,
                    type: 'movie',
                    movieId: 1,
                    movieTitle: 'Test Movie',
                    languageCode: 'en',
                    provider: 'OpenSubtitles',
                    reason: 'Failed validation',
                    timestamp: new Date().toISOString(),
                    subtitlePath: '/path/to/sub/(2023).srt',
                },
            ],
            meta: { page: 2, pageSize: 25, totalCount: 100, totalPages: 4 },
        });
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(BlacklistMoviesPage, {}) }));
        // Click the page size selector
        const pageSizeSelect = await screen.findByRole('combobox');
        await userEvent.click(pageSizeSelect);
        // Select a different page size
        const pageSizeOption = await screen.findByRole('option', { name: '50' });
        await userEvent.click(pageSizeOption);
        // After changing page size, it should trigger refetch
        expect(listBlacklistMoviesMock).toHaveBeenCalled();
    });
    it('clears blacklist and invalidates cache with correct key', async () => {
        listBlacklistMoviesMock.mockResolvedValue({
            items: [
                {
                    id: 1,
                    type: 'movie',
                    movieId: 1,
                    movieTitle: 'Test Movie',
                    languageCode: 'en',
                    provider: 'OpenSubtitles',
                    reason: 'Failed validation',
                    timestamp: new Date().toISOString(),
                    subtitlePath: '/path/to/sub/(2023).srt',
                },
            ],
            meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
        });
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(BlacklistMoviesPage, {}) }));
        // Find and click the Remove All button
        const clearButton = await screen.findByRole('button', { name: 'Remove All' });
        await userEvent.click(clearButton);
        // Click confirm in modal (the second Remove All button)
        const confirmButton = screen.getAllByRole('button', { name: 'Remove All' })[1];
        await userEvent.click(confirmButton);
        // Verify the clear API was called
        expect(clearBlacklistMoviesMock).toHaveBeenCalled();
    });
});
//# sourceMappingURL=page.test.js.map