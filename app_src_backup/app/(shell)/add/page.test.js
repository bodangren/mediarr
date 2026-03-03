import { jsx as _jsx } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/errors';
import AddMediaPage from './page';
const pushMock = vi.fn();
const searchParamState = {
    q: null,
};
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: pushMock }),
    useSearchParams: () => ({
        get: (key) => {
            if (key === 'q') {
                return searchParamState.q;
            }
            return null;
        },
    }),
}));
vi.mock('@/lib/api/client', () => ({
    getApiClients: vi.fn(),
}));
const searchMetadataMock = vi.fn();
const listMoviesMock = vi.fn();
const listSeriesMock = vi.fn();
const addMediaMock = vi.fn();
const listQualityProfilesMock = vi.fn();
const mockedGetApiClients = vi.mocked(getApiClients);
function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                staleTime: 0,
            },
            mutations: {
                retry: false,
            },
        },
    });
}
function renderPage(queryClient) {
    return render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(ToastProvider, { children: _jsx(AddMediaPage, {}) }) }));
}
beforeEach(() => {
    vi.clearAllMocks();
    searchParamState.q = null;
    searchMetadataMock.mockResolvedValue([]);
    listMoviesMock.mockResolvedValue({
        items: [],
        meta: { page: 1, pageSize: 100, totalCount: 0, totalPages: 0 },
    });
    listSeriesMock.mockResolvedValue({
        items: [],
        meta: { page: 1, pageSize: 100, totalCount: 0, totalPages: 0 },
    });
    addMediaMock.mockResolvedValue({ id: 99, title: 'Added title' });
    listQualityProfilesMock.mockResolvedValue([
        { id: 1, name: 'HD-1080p', cutoffId: 1, qualities: [] },
        { id: 2, name: 'UltraHD', cutoffId: 2, qualities: [] },
    ]);
    mockedGetApiClients.mockReturnValue({
        mediaApi: {
            searchMetadata: searchMetadataMock,
            listMovies: listMoviesMock,
            listSeries: listSeriesMock,
            addMedia: addMediaMock,
        },
        qualityProfileApi: {
            list: listQualityProfilesMock,
        },
    });
});
afterEach(() => {
    vi.useRealTimers();
});
describe('add media page', () => {
    describe('basic functionality', () => {
        it('debounces search input and supports movie/series tab switching with empty state', async () => {
            const queryClient = createTestQueryClient();
            renderPage(queryClient);
            fireEvent.change(screen.getByPlaceholderText('Search for a series...'), { target: { value: 'st' } });
            expect(searchMetadataMock).not.toHaveBeenCalled();
            await waitFor(() => {
                expect(searchMetadataMock).toHaveBeenCalledWith({ term: 'st', mediaType: 'TV' });
            }, { timeout: 1500 });
            expect(await screen.findByText('No results')).toBeInTheDocument();
            fireEvent.click(screen.getByRole('button', { name: 'Movies' }));
            await waitFor(() => {
                expect(searchMetadataMock).toHaveBeenCalledWith({ term: 'st', mediaType: 'MOVIE' });
            });
        });
        it('shows loading state while search query is pending', async () => {
            searchMetadataMock.mockImplementation(() => new Promise(() => { }));
            const queryClient = createTestQueryClient();
            renderPage(queryClient);
            fireEvent.change(screen.getByPlaceholderText('Search for a series...'), { target: { value: 'arrival' } });
            expect(await screen.findByLabelText('loading heading')).toBeInTheDocument();
        });
        it('renders query error state when metadata search fails', async () => {
            searchMetadataMock.mockRejectedValueOnce(new Error('metadata backend unavailable'));
            const queryClient = createTestQueryClient();
            renderPage(queryClient);
            fireEvent.change(screen.getByPlaceholderText('Search for a series...'), { target: { value: 'dune' } });
            expect(await screen.findByText('Could not load data')).toBeInTheDocument();
            expect(await screen.findByText('metadata backend unavailable')).toBeInTheDocument();
        });
    });
    describe('enhanced search results display', () => {
        it('shows poster images in search results', async () => {
            searchMetadataMock.mockResolvedValue([
                {
                    mediaType: 'TV',
                    title: 'Test Series',
                    year: 2022,
                    posterUrl: '/test-poster.jpg',
                    overview: 'A test series.',
                },
            ]);
            const queryClient = createTestQueryClient();
            renderPage(queryClient);
            fireEvent.change(screen.getByPlaceholderText('Search for a series...'), { target: { value: 'test' } });
            const img = await screen.findByAltText('Test Series');
            expect(img.src).toContain('/test-poster.jpg');
        });
        it('shows network and status badges in search results', async () => {
            searchMetadataMock.mockResolvedValue([
                {
                    mediaType: 'TV',
                    title: 'Test Series',
                    year: 2022,
                    network: 'HBO',
                    status: 'continuing',
                    overview: 'A test series.',
                },
            ]);
            const queryClient = createTestQueryClient();
            renderPage(queryClient);
            fireEvent.change(screen.getByPlaceholderText('Search for a series...'), { target: { value: 'test' } });
            expect(await screen.findByText('HBO')).toBeInTheDocument();
            expect(await screen.findByText('continuing')).toBeInTheDocument();
        });
        it('shows already-in-library indicator', async () => {
            searchMetadataMock.mockResolvedValue([
                {
                    mediaType: 'TV',
                    title: 'Existing Series',
                    year: 2022,
                    tvdbId: 12345,
                    overview: 'Already in library.',
                },
            ]);
            listSeriesMock.mockResolvedValue({
                items: [
                    {
                        id: 1,
                        title: 'Existing Series',
                        tvdbId: 12345,
                        monitored: true,
                    },
                ],
                meta: { page: 1, pageSize: 100, totalCount: 1, totalPages: 1 },
            });
            const queryClient = createTestQueryClient();
            renderPage(queryClient);
            fireEvent.change(screen.getByPlaceholderText('Search for a series...'), { target: { value: 'existing' } });
            expect(await screen.findByText('monitored')).toBeInTheDocument();
            expect(await screen.findByRole('button', { name: 'Review Config' })).toBeInTheDocument();
        });
    });
    describe('quality profile selection', () => {
        it('fetches quality profiles dynamically from API', async () => {
            const queryClient = createTestQueryClient();
            renderPage(queryClient);
            await waitFor(() => {
                expect(listQualityProfilesMock).toHaveBeenCalled();
            });
        });
        it('displays quality profiles in dropdown', async () => {
            const queryClient = createTestQueryClient();
            renderPage(queryClient);
            // Select a series to show the config panel
            searchMetadataMock.mockResolvedValue([
                {
                    mediaType: 'TV',
                    title: 'Test Series',
                    year: 2022,
                    tvdbId: 123,
                },
            ]);
            fireEvent.change(screen.getByPlaceholderText('Search for a series...'), { target: { value: 'test' } });
            await screen.findByText('Test Series');
            fireEvent.click(screen.getByRole('button', { name: 'Select' }));
            await waitFor(() => {
                expect(screen.getByLabelText('Quality Profile')).toBeInTheDocument();
            });
            const select = screen.getByLabelText('Quality Profile');
            expect(select).toBeInTheDocument();
            expect(select.querySelector('option[value="1"]')).toBeInTheDocument();
            expect(select.querySelector('option[value="2"]')).toBeInTheDocument();
        });
    });
    describe('series configuration options', () => {
        beforeEach(async () => {
            searchMetadataMock.mockResolvedValue([
                {
                    mediaType: 'TV',
                    title: 'Test Series',
                    year: 2022,
                    tvdbId: 123,
                    overview: 'A test series.',
                },
            ]);
        });
        it('shows root folder input field', async () => {
            const queryClient = createTestQueryClient();
            renderPage(queryClient);
            fireEvent.change(screen.getByPlaceholderText('Search for a series...'), { target: { value: 'test' } });
            await screen.findByText('Test Series');
            fireEvent.click(screen.getByRole('button', { name: 'Select' }));
            // Check for root folder label and input
            await waitFor(() => {
                expect(screen.getByText('Root Folder')).toBeInTheDocument();
            });
            const rootFolderInput = document.querySelector('input[placeholder="/path/to/media"]');
            expect(rootFolderInput).toBeInTheDocument();
        });
        it('shows monitoring options popover for TV series', async () => {
            const queryClient = createTestQueryClient();
            renderPage(queryClient);
            fireEvent.change(screen.getByPlaceholderText('Search for a series...'), { target: { value: 'test' } });
            await screen.findByText('Test Series');
            fireEvent.click(screen.getByRole('button', { name: 'Select' }));
            await waitFor(() => {
                expect(screen.getByLabelText('Monitor')).toBeInTheDocument();
            });
        });
        it('allows changing monitoring option', async () => {
            const queryClient = createTestQueryClient();
            renderPage(queryClient);
            fireEvent.change(screen.getByPlaceholderText('Search for a series...'), { target: { value: 'test' } });
            await screen.findByText('Test Series');
            fireEvent.click(screen.getByRole('button', { name: 'Select' }));
            await waitFor(() => {
                expect(screen.getByText('All Episodes')).toBeInTheDocument();
            });
            // Open popover and select a different option
            fireEvent.click(screen.getByText('All Episodes'));
            await waitFor(() => {
                expect(screen.getByText('Future Episodes')).toBeInTheDocument();
            });
            fireEvent.click(screen.getByRole('option', { name: /future episodes/i }));
            // Verify selection changed
            await waitFor(() => {
                expect(screen.getByText('Future Episodes')).toBeInTheDocument();
            });
        });
        it('shows series type popover for TV series', async () => {
            const queryClient = createTestQueryClient();
            renderPage(queryClient);
            fireEvent.change(screen.getByPlaceholderText('Search for a series...'), { target: { value: 'test' } });
            await screen.findByText('Test Series');
            fireEvent.click(screen.getByRole('button', { name: 'Select' }));
            await waitFor(() => {
                expect(screen.getByText('Series Type')).toBeInTheDocument();
            });
        });
        it('allows changing series type', async () => {
            const queryClient = createTestQueryClient();
            renderPage(queryClient);
            fireEvent.change(screen.getByPlaceholderText('Search for a series...'), { target: { value: 'test' } });
            await screen.findByText('Test Series');
            fireEvent.click(screen.getByRole('button', { name: 'Select' }));
            await waitFor(() => {
                expect(screen.getByText('Standard')).toBeInTheDocument();
            });
            // Open popover and select a different option
            fireEvent.click(screen.getByText('Standard'));
            await waitFor(() => {
                expect(screen.getByText('Anime')).toBeInTheDocument();
            });
            fireEvent.click(screen.getByRole('option', { name: /anime/i }));
            // Verify selection changed
            await waitFor(() => {
                expect(screen.getByText('Anime')).toBeInTheDocument();
            });
        });
        it('shows season folder toggle for TV series', async () => {
            const queryClient = createTestQueryClient();
            renderPage(queryClient);
            fireEvent.change(screen.getByPlaceholderText('Search for a series...'), { target: { value: 'test' } });
            await screen.findByText('Test Series');
            fireEvent.click(screen.getByRole('button', { name: 'Select' }));
            await waitFor(() => {
                expect(screen.getByText('Use season folders')).toBeInTheDocument();
            });
        });
        it('does not show TV-specific options for movies', async () => {
            searchMetadataMock.mockResolvedValue([
                {
                    mediaType: 'MOVIE',
                    title: 'Test Movie',
                    year: 2022,
                    tmdbId: 456,
                    overview: 'A test movie.',
                },
            ]);
            const queryClient = createTestQueryClient();
            renderPage(queryClient);
            // Switch to Movies tab
            fireEvent.click(screen.getByRole('button', { name: 'Movies' }));
            fireEvent.change(screen.getByPlaceholderText('Search for a movie...'), { target: { value: 'test' } });
            await screen.findByText('Test Movie');
            fireEvent.click(screen.getByRole('button', { name: 'Select' }));
            // Wait for config panel to appear
            await waitFor(() => {
                expect(screen.getByText('Root Folder')).toBeInTheDocument();
            });
            // TV-specific options should not be present
            expect(screen.queryByText('Monitor')).not.toBeInTheDocument();
            expect(screen.queryByText('Series Type')).not.toBeInTheDocument();
            expect(screen.queryByText('Use season folders')).not.toBeInTheDocument();
        });
    });
    describe('add media with new configuration options', () => {
        it('includes all configuration options in add request for TV series', async () => {
            searchMetadataMock.mockResolvedValue([
                {
                    mediaType: 'TV',
                    title: 'Test Series',
                    year: 2022,
                    tvdbId: 123,
                    overview: 'A test series.',
                },
            ]);
            const queryClient = createTestQueryClient();
            renderPage(queryClient);
            fireEvent.change(screen.getByPlaceholderText('Search for a series...'), { target: { value: 'test' } });
            await screen.findByText('Test Series');
            fireEvent.click(screen.getByRole('button', { name: 'Select' }));
            // Wait for config panel
            await waitFor(() => {
                expect(screen.getByText('Root Folder')).toBeInTheDocument();
            });
            // Change root folder
            const rootFolderInput = document.querySelector('input[placeholder="/path/to/media"]');
            fireEvent.change(rootFolderInput, { target: { value: '/custom/path' } });
            // Open monitoring popover and select "missing"
            await waitFor(() => {
                expect(screen.getByText('All Episodes')).toBeInTheDocument();
            });
            const allEpisodesButtons = screen.getAllByText('All Episodes');
            // Click the one in the popover button (the first one that's a direct child of button)
            const popoverButton = allEpisodesButtons[0].closest('button');
            fireEvent.click(popoverButton);
            await waitFor(() => {
                expect(screen.getByRole('option', { name: /missing episodes/i })).toBeInTheDocument();
            });
            fireEvent.click(screen.getByRole('option', { name: /missing episodes/i }));
            // Wait for selection to update
            await waitFor(() => {
                expect(screen.getByText('Missing Episodes')).toBeInTheDocument();
            });
            // Open series type popover and select "anime"
            const seriesTypeLabels = screen.getAllByText('Series Type');
            const seriesTypeLabel = seriesTypeLabels[0].closest('label');
            const seriesTypeButton = seriesTypeLabel?.querySelector('button');
            fireEvent.click(seriesTypeButton);
            await waitFor(() => {
                expect(screen.getByRole('option', { name: /anime/i })).toBeInTheDocument();
            });
            fireEvent.click(screen.getByRole('option', { name: /anime/i }));
            // Toggle season folder
            const seasonFolderLabel = screen.getByText('Use season folders').closest('label');
            const seasonFolderCheckbox = seasonFolderLabel?.querySelector('input[type="checkbox"]');
            fireEvent.click(seasonFolderCheckbox);
            // Click add button
            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Add Series' })).toBeInTheDocument();
            });
            fireEvent.click(screen.getByRole('button', { name: 'Add Series' }));
            await waitFor(() => {
                expect(addMediaMock).toHaveBeenCalledWith(expect.objectContaining({
                    mediaType: 'TV',
                    rootFolder: '/custom/path',
                    monitor: 'missing',
                    seriesType: 'anime',
                    seasonFolder: false,
                }));
            });
        });
        it('navigates to series detail after successful add', async () => {
            searchMetadataMock.mockResolvedValue([
                {
                    mediaType: 'TV',
                    title: 'Test Series',
                    year: 2022,
                    tvdbId: 123,
                },
            ]);
            const queryClient = createTestQueryClient();
            renderPage(queryClient);
            fireEvent.change(screen.getByPlaceholderText('Search for a series...'), { target: { value: 'test' } });
            await screen.findByText('Test Series');
            fireEvent.click(screen.getByRole('button', { name: 'Select' }));
            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Add Series' })).toBeInTheDocument();
            });
            fireEvent.click(screen.getByRole('button', { name: 'Add Series' }));
            await waitFor(() => {
                expect(pushMock).toHaveBeenCalledWith('/library/series/99');
            });
        });
    });
    describe('conflict handling', () => {
        it('shows duplicate conflict actions and routes to existing media', async () => {
            searchMetadataMock.mockResolvedValue([
                {
                    mediaType: 'TV',
                    title: 'Existing Series',
                    year: 2022,
                    tvdbId: 789,
                },
            ]);
            addMediaMock.mockRejectedValueOnce(new ApiClientError({
                code: 'CONFLICT',
                message: 'Series already exists in library.',
                status: 409,
                retryable: false,
                details: { existingId: 42 },
            }));
            const queryClient = createTestQueryClient();
            renderPage(queryClient);
            fireEvent.change(screen.getByPlaceholderText('Search for a series...'), { target: { value: 'existing' } });
            fireEvent.click(await screen.findByRole('button', { name: 'Select' }));
            fireEvent.click(screen.getByRole('button', { name: 'Add Series' }));
            expect(await screen.findByText('Duplicate found')).toBeInTheDocument();
            expect((await screen.findAllByText('Series already exists in library.')).length).toBeGreaterThan(0);
            fireEvent.click(screen.getByRole('button', { name: 'Go to existing' }));
            expect(pushMock).toHaveBeenCalledWith('/library/series/42');
            fireEvent.click(screen.getByRole('button', { name: 'Add anyway' }));
            expect(await screen.findByText('Force add unavailable')).toBeInTheDocument();
        });
    });
});
//# sourceMappingURL=page.test.js.map