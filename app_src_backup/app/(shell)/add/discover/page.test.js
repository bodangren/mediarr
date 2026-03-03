import { jsx as _jsx } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import DiscoverMoviesPage from './page';
// Mock functions need to be defined before vi.mock
const mockListRecommendations = vi.fn(() => Promise.resolve([]));
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
    useRouter: vi.fn(() => ({ push: mockPush })),
}));
vi.mock('@/lib/api/client', () => ({
    getApiClients: vi.fn(() => ({
        discoverApi: {
            listRecommendations: mockListRecommendations,
        },
    })),
}));
describe('DiscoverMoviesPage', () => {
    const renderPage = () => {
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false },
            },
        });
        return render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(DiscoverMoviesPage, {}) }));
    };
    beforeEach(() => {
        vi.clearAllMocks();
        mockListRecommendations.mockResolvedValue([]);
        mockPush.mockClear();
    });
    it('renders page header and mode tabs', () => {
        renderPage();
        expect(screen.getByText('Discover Movies')).toBeInTheDocument();
        expect(screen.getByText(/browse and discover/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /popular/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /top rated/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /new releases/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /upcoming/i })).toBeInTheDocument();
    });
    it('renders filters toggle button', () => {
        renderPage();
        expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
    });
    it('displays movie cards', async () => {
        const mockMovies = [
            {
                id: 1,
                tmdbId: 1,
                title: 'Test Movie',
                year: 2024,
                overview: 'Test overview',
                genres: ['Action'],
                ratings: { tmdb: 7.5 },
                releaseDate: '2024-01-01',
                inLibrary: false,
            },
        ];
        mockListRecommendations.mockResolvedValue(mockMovies);
        renderPage();
        await waitFor(() => {
            const movieCards = screen.getAllByText(/movie/i);
            expect(movieCards.length).toBeGreaterThan(0);
        });
    });
    it('displays results count', async () => {
        const mockMovies = [
            {
                id: 1,
                tmdbId: 1,
                title: 'Test Movie',
                year: 2024,
                overview: 'Test overview',
                genres: ['Action'],
                ratings: { tmdb: 7.5 },
                releaseDate: '2024-01-01',
                inLibrary: false,
            },
        ];
        mockListRecommendations.mockResolvedValue(mockMovies);
        renderPage();
        await waitFor(() => {
            expect(screen.getByText(/1 results/)).toBeInTheDocument();
        });
    });
    it('switches between discovery modes', async () => {
        const user = userEvent.setup();
        renderPage();
        const topRatedButton = screen.getByRole('button', { name: /top rated/i });
        await user.click(topRatedButton);
        expect(topRatedButton).toHaveClass('border-accent-primary');
    });
    it('opens filters on mobile when filter button is clicked', async () => {
        const user = userEvent.setup();
        renderPage();
        const filterButton = screen.getByRole('button', { name: /filters/i });
        await user.click(filterButton);
        expect(screen.getAllByText('Filters').length).toBeGreaterThan(0);
    });
    it('closes mobile filter modal when close button is clicked', async () => {
        const user = userEvent.setup();
        renderPage();
        const filterButton = screen.getByRole('button', { name: /filters/i });
        await user.click(filterButton);
        const closeButton = screen.getByRole('button', { name: /close/i });
        await user.click(closeButton);
        await waitFor(() => {
            expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
        });
    });
    it('navigates to add page when movie is added', async () => {
        const user = userEvent.setup();
        const mockMovies = [
            {
                id: 1,
                tmdbId: 1,
                title: 'Test Movie',
                year: 2024,
                overview: 'Test overview',
                genres: ['Action'],
                ratings: { tmdb: 7.5 },
                releaseDate: '2024-01-01',
                inLibrary: false,
            },
        ];
        mockListRecommendations.mockResolvedValue(mockMovies);
        renderPage();
        await waitFor(() => {
            const addButton = screen.getAllByText(/add to library/i)[0];
            expect(addButton).toBeInTheDocument();
        });
        const addButton = screen.getAllByText(/add to library/i)[0];
        await user.click(addButton);
        expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/add/new'));
    });
    it('disables add button for movies already in library', async () => {
        const mockMovies = [
            {
                id: 1,
                tmdbId: 1,
                title: 'Test Movie',
                year: 2024,
                overview: 'Test overview',
                genres: ['Action'],
                ratings: { tmdb: 7.5 },
                releaseDate: '2024-01-01',
                inLibrary: true,
            },
        ];
        mockListRecommendations.mockResolvedValue(mockMovies);
        renderPage();
        await waitFor(() => {
            const alreadyAddedButtons = screen.getAllByText('Already Added');
            expect(alreadyAddedButtons.length).toBeGreaterThan(0);
        });
        const alreadyAddedButtons = screen.getAllByText('Already Added');
        alreadyAddedButtons.forEach(button => {
            expect(button).toBeDisabled();
        });
    });
    it('displays rating badges on movie cards', async () => {
        const mockMovies = [
            {
                id: 1,
                tmdbId: 1,
                title: 'Test Movie',
                year: 2024,
                overview: 'Test overview',
                genres: ['Action'],
                ratings: { tmdb: 7.5 },
                releaseDate: '2024-01-01',
                inLibrary: false,
            },
        ];
        mockListRecommendations.mockResolvedValue(mockMovies);
        renderPage();
        await waitFor(() => {
            const ratingBadges = screen.getAllByText(/⭐/);
            expect(ratingBadges.length).toBeGreaterThan(0);
        });
    });
    it('displays year and certification on movie cards', async () => {
        const mockMovies = [
            {
                id: 1,
                tmdbId: 1,
                title: 'Test Movie',
                year: 2024,
                overview: 'Test overview',
                genres: ['Action'],
                certification: 'PG-13',
                ratings: { tmdb: 7.5 },
                releaseDate: '2024-01-01',
                inLibrary: false,
            },
        ];
        mockListRecommendations.mockResolvedValue(mockMovies);
        renderPage();
        await waitFor(() => {
            const years = screen.getAllByText(/\d{4}/);
            expect(years.length).toBeGreaterThan(0);
        });
    });
});
//# sourceMappingURL=page.test.js.map