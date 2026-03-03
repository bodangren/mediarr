import { jsx as _jsx } from "react/jsx-runtime";
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MovieSubtitlesListPage from './page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Mock the API clients
vi.mock('@/lib/api/client', () => ({
    getApiClients: vi.fn(() => ({
        mediaApi: {
            listMovies: vi.fn().mockResolvedValue({
                items: [
                    {
                        id: 1,
                        title: 'Test Movie 1',
                        year: 2024,
                        monitored: true,
                    },
                    {
                        id: 2,
                        title: 'Test Movie 2',
                        year: 2023,
                        monitored: false,
                    },
                ],
                total: 2,
                page: 1,
                pageSize: 100,
            }),
        },
    })),
}));
function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    return function Wrapper({ children }) {
        return _jsx(QueryClientProvider, { client: queryClient, children: children });
    };
}
describe('MovieSubtitlesListPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('renders movies list', async () => {
        const wrapper = createWrapper();
        render(_jsx(MovieSubtitlesListPage, {}), { wrapper });
        // Wait for table to appear (shows the data has loaded)
        await waitFor(() => {
            const table = screen.getByRole('table');
            expect(table).toBeInTheDocument();
        });
        // Now check for movie data
        expect(screen.getByText('Test Movie 1')).toBeInTheDocument();
        expect(screen.getByText('Test Movie 2')).toBeInTheDocument();
    });
    it('shows unavailable for audio languages when not provided', async () => {
        const wrapper = createWrapper();
        render(_jsx(MovieSubtitlesListPage, {}), { wrapper });
        await waitFor(() => {
            expect(screen.getByText('Test Movie 1')).toBeInTheDocument();
        });
        // Should show "Unavailable" for audio languages (each row has one)
        const unavailableTexts = screen.getAllByText('Unavailable');
        // We have 2 movies, each with Audio Languages and Language Profile columns = 4 instances
        expect(unavailableTexts.length).toBeGreaterThanOrEqual(2);
    });
    it('shows unavailable for language profile when not provided', async () => {
        const wrapper = createWrapper();
        render(_jsx(MovieSubtitlesListPage, {}), { wrapper });
        await waitFor(() => {
            expect(screen.getByText('Test Movie 1')).toBeInTheDocument();
        });
        // Should show "Unavailable" for language profile (each row has one)
        const unavailableTexts = screen.getAllByText('Unavailable');
        // We have 2 movies, each with Language Profile column showing "Unavailable"
        expect(unavailableTexts.length).toBeGreaterThanOrEqual(2);
    });
    it('shows none for missing subtitles when empty', async () => {
        const wrapper = createWrapper();
        render(_jsx(MovieSubtitlesListPage, {}), { wrapper });
        await waitFor(() => {
            expect(screen.getByText('Test Movie 1')).toBeInTheDocument();
        });
        // Each movie has a "None" text for missing subtitles (2 total)
        const noneTexts = screen.getAllByText('None');
        expect(noneTexts.length).toBe(2);
    });
    it('shows year when available', async () => {
        const wrapper = createWrapper();
        render(_jsx(MovieSubtitlesListPage, {}), { wrapper });
        await waitFor(() => {
            expect(screen.getByText('Test Movie 1')).toBeInTheDocument();
        });
        expect(screen.getByText('2024')).toBeInTheDocument();
        expect(screen.getByText('2023')).toBeInTheDocument();
    });
    it('shows mass edit link', async () => {
        const wrapper = createWrapper();
        render(_jsx(MovieSubtitlesListPage, {}), { wrapper });
        await waitFor(() => {
            expect(screen.getByText('Mass Edit')).toBeInTheDocument();
        });
        // Find the link element by href attribute
        const massEditLink = screen.getByRole('link', { name: /Mass Edit/i });
        expect(massEditLink).toHaveAttribute('href', '/subtitles/movies/edit');
    });
});
//# sourceMappingURL=page.test.js.map