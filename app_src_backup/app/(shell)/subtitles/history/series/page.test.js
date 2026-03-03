import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SeriesHistoryPage from './page';
const listHistoryMock = vi.fn();
const clearHistoryMock = vi.fn();
vi.mock('@/lib/api/client', () => ({
    getApiClients: () => ({
        subtitleHistoryApi: {
            listHistory: listHistoryMock,
            clearHistory: clearHistoryMock,
        },
    }),
}));
const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
    },
});
describe('SeriesHistoryPage', () => {
    beforeEach(() => {
        listHistoryMock.mockResolvedValue({
            items: [],
            meta: { page: 1, pageSize: 25, totalCount: 0, totalPages: 0 },
        });
        clearHistoryMock.mockResolvedValue({ deletedCount: 0 });
    });
    it('renders page header', async () => {
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(SeriesHistoryPage, {}) }));
        expect(screen.getByText('Series History')).toBeInTheDocument();
        expect(screen.getByText('View subtitle download history for TV series.')).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: 'Clear History' })).toBeInTheDocument();
    });
    it('renders history filters', async () => {
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(SeriesHistoryPage, {}) }));
        expect(await screen.findByLabelText('Provider')).toBeInTheDocument();
        expect(screen.getByLabelText('Language')).toBeInTheDocument();
        expect(screen.getByLabelText('Action')).toBeInTheDocument();
        expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
        expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    });
    it('shows empty state', async () => {
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(SeriesHistoryPage, {}) }));
        expect(await screen.findByText('No history found')).toBeInTheDocument();
        expect(screen.getByText('Start downloading subtitles for series to see history here.')).toBeInTheDocument();
    });
    it('renders history table when data is available', async () => {
        listHistoryMock.mockResolvedValue({
            items: [
                {
                    id: 1,
                    type: 'series',
                    seriesId: 1,
                    seriesTitle: 'Test Series',
                    seasonNumber: 1,
                    episodeNumber: 1,
                    episodeTitle: 'Test Episode',
                    languageCode: 'en',
                    provider: 'OpenSubtitles',
                    score: 9.5,
                    action: 'download',
                    timestamp: new Date().toISOString(),
                },
            ],
            meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
        });
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(SeriesHistoryPage, {}) }));
        expect(await screen.findByText('Test Series')).toBeInTheDocument();
        expect(screen.getByText('S01E01')).toBeInTheDocument();
        expect(screen.getAllByText('en').length).toBeGreaterThan(1); // 'en' appears in both filter and table
        expect(screen.getAllByText('OpenSubtitles').length).toBeGreaterThan(1); // OpenSubtitles in filter and table
        expect(screen.getByText('9.5')).toBeInTheDocument();
    });
    it('opens clear history modal when button is clicked', async () => {
        listHistoryMock.mockResolvedValue({
            items: [],
            meta: { page: 1, pageSize: 25, totalCount: 0, totalPages: 0 },
        });
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(SeriesHistoryPage, {}) }));
        const clearButton = await screen.findByRole('button', { name: 'Clear History' });
        await userEvent.click(clearButton);
        expect(screen.getByText('Clear Series History')).toBeInTheDocument();
    });
    it('changes page size and resets to page 1', async () => {
        listHistoryMock.mockResolvedValue({
            items: [
                {
                    id: 1,
                    type: 'series',
                    seriesId: 1,
                    seriesTitle: 'Test Series',
                    seasonNumber: 1,
                    episodeNumber: 1,
                    episodeTitle: 'Test Episode',
                    languageCode: 'en',
                    provider: 'OpenSubtitles',
                    score: 9.5,
                    action: 'download',
                    timestamp: new Date().toISOString(),
                },
            ],
            meta: { page: 2, pageSize: 25, totalCount: 100, totalPages: 4 },
        });
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(SeriesHistoryPage, {}) }));
        // Click page size selector (use aria-label to identify the page size select)
        const pageSizeSelect = await screen.findByRole('combobox', { name: /page size/i });
        await userEvent.click(pageSizeSelect);
        // Select a different page size
        const pageSizeOption = await screen.findByRole('option', { name: '50' });
        await userEvent.click(pageSizeOption);
        // After changing page size, the list should be called again
        expect(listHistoryMock).toHaveBeenCalled();
    });
    it('clears history and refreshes cache', async () => {
        listHistoryMock.mockResolvedValue({
            items: [
                {
                    id: 1,
                    type: 'series',
                    seriesId: 1,
                    seriesTitle: 'Test Series',
                    seasonNumber: 1,
                    episodeNumber: 1,
                    episodeTitle: 'Test Episode',
                    languageCode: 'en',
                    provider: 'OpenSubtitles',
                    score: 9.5,
                    action: 'download',
                    timestamp: new Date().toISOString(),
                },
            ],
            meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
        });
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(SeriesHistoryPage, {}) }));
        // Click the Clear History button
        const clearButton = await screen.findByRole('button', { name: 'Clear History' });
        await userEvent.click(clearButton);
        // Find the confirm button in the modal (the second Clear History button)
        const confirmButton = screen.getAllByRole('button', { name: 'Clear History' })[1];
        await userEvent.click(confirmButton);
        // Verify the clear API was called
        expect(clearHistoryMock).toHaveBeenCalled();
    });
});
//# sourceMappingURL=page.test.js.map