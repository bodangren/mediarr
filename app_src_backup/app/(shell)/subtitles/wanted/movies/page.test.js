import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WantedMoviesPage from './page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
// Mock dependencies
vi.mock('@/lib/api/client', () => ({
    getApiClients: vi.fn(() => ({
        subtitleWantedApi: {
            listWantedMovies: vi.fn(),
            searchAllMovies: vi.fn(),
            searchMovieItem: vi.fn(),
            getWantedCount: vi.fn(),
        },
    })),
}));
vi.mock('@/components/providers/ToastProvider', () => ({
    useToast: vi.fn(() => ({
        pushToast: vi.fn(),
    })),
}));
vi.mock('@/components/subtitles/LanguageBadge', () => ({
    LanguageBadge: ({ languageCode, variant, onClick }) => (_jsx("button", { type: "button", onClick: onClick, "data-testid": `language-badge-${languageCode}`, className: `language-badge language-badge-${variant}`, children: languageCode })),
}));
vi.mock('@/components/subtitles/SearchProgressIndicator', () => ({
    SearchProgressIndicator: ({ isSearching }) => isSearching ? _jsx("div", { "data-testid": "search-progress", children: "Searching..." }) : null,
}));
vi.mock('@/components/subtitles/WantedCountBadge', () => ({
    WantedCountBadge: () => _jsx("span", { "data-testid": "wanted-count", children: "3" }),
}));
function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
}
function renderWithProviders(ui) {
    const queryClient = createTestQueryClient();
    return render(_jsx(QueryClientProvider, { client: queryClient, children: ui }));
}
describe('WantedMoviesPage', () => {
    it('should render page header', () => {
        renderWithProviders(_jsx(WantedMoviesPage, {}));
        expect(screen.getByText('Wanted Movies')).toBeInTheDocument();
        expect(screen.getByText('Movies with missing subtitle tracks')).toBeInTheDocument();
        expect(screen.getByText('Search All')).toBeInTheDocument();
    });
    it('should show wanted count badge', () => {
        renderWithProviders(_jsx(WantedMoviesPage, {}));
        expect(screen.getByTestId('wanted-count')).toBeInTheDocument();
    });
    it('should render search input and language filter', () => {
        renderWithProviders(_jsx(WantedMoviesPage, {}));
        expect(screen.getByPlaceholderText('Search movie title...')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('e.g. en, es, fr')).toBeInTheDocument();
    });
    it('should handle search input change', async () => {
        renderWithProviders(_jsx(WantedMoviesPage, {}));
        const searchInput = screen.getByPlaceholderText('Search movie title...');
        fireEvent.change(searchInput, { target: { value: 'test movie' } });
        await waitFor(() => {
            expect(searchInput).toHaveValue('test movie');
        });
    });
    it('should handle language filter change', async () => {
        renderWithProviders(_jsx(WantedMoviesPage, {}));
        const languageInput = screen.getByPlaceholderText('e.g. en, es, fr');
        fireEvent.change(languageInput, { target: { value: 'en' } });
        await waitFor(() => {
            expect(languageInput).toHaveValue('en');
        });
    });
    it('should render language badges', async () => {
        const { getApiClients } = await import('@/lib/api/client');
        const mockListWantedMovies = vi.fn().mockResolvedValue({
            items: [
                {
                    movieId: 1,
                    movieTitle: 'Test Movie',
                    year: 2024,
                    missingLanguages: ['en', 'fr'],
                },
            ],
            meta: { totalCount: 1 },
        });
        getApiClients().subtitleWantedApi.listWantedMovies = mockListWantedMovies;
        renderWithProviders(_jsx(WantedMoviesPage, {}));
        await waitFor(() => {
            expect(screen.getByTestId('language-badge-en')).toBeInTheDocument();
            expect(screen.getByTestId('language-badge-fr')).toBeInTheDocument();
        });
    });
    it('should show empty state when no results', () => {
        const { getApiClients } = require('@/lib/api/client');
        getApiClients().subtitleWantedApi.listWantedMovies = vi.fn().mockResolvedValue({
            items: [],
            meta: { totalCount: 0 },
        });
        renderWithProviders(_jsx(WantedMoviesPage, {}));
        expect(screen.getByText('No missing subtitles')).toBeInTheDocument();
    });
    it('should display movie year', async () => {
        const { getApiClients } = await import('@/lib/api/client');
        const mockListWantedMovies = vi.fn().mockResolvedValue({
            items: [
                {
                    movieId: 1,
                    movieTitle: 'Test Movie',
                    year: 2024,
                    missingLanguages: ['en'],
                },
            ],
            meta: { totalCount: 1 },
        });
        getApiClients().subtitleWantedApi.listWantedMovies = mockListWantedMovies;
        renderWithProviders(_jsx(WantedMoviesPage, {}));
        await waitFor(() => {
            expect(screen.getByText('2024')).toBeInTheDocument();
        });
    });
});
//# sourceMappingURL=page.test.js.map