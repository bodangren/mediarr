import { jsx as _jsx } from "react/jsx-runtime";
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MovieSubtitleDetailPage from './page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/providers/ToastProvider';
// Mock the router
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
    useParams: () => ({ id: '123' }),
    useRouter: () => ({
        push: pushMock,
    }),
}));
// Mock the API clients
const mockSyncMovie = vi.fn().mockResolvedValue({
    success: true,
    message: 'Synced 1 items',
    episodesUpdated: 1,
});
const mockScanMovieDisk = vi.fn().mockResolvedValue({
    success: true,
    message: 'Scan complete',
    subtitlesFound: 1,
    newSubtitles: 0,
});
const mockSearchMovieSubtitles = vi.fn().mockResolvedValue({
    success: true,
    message: 'Search complete',
    episodesSearched: 1,
    subtitlesDownloaded: 0,
});
vi.mock('@/lib/api/client', () => ({
    getApiClients: vi.fn(() => ({
        mediaApi: {
            getMovie: vi.fn().mockResolvedValue({
                id: 123,
                title: 'Test Movie',
                year: 2024,
                monitored: true,
            }),
        },
        subtitleApi: {
            listMovieVariants: vi.fn().mockResolvedValue([
                {
                    variantId: 1,
                    path: '/path/to/movie.mkv',
                    subtitleTracks: [
                        {
                            languageCode: 'en',
                            isForced: false,
                            isHi: false,
                            path: '/path/to/movie.en.srt',
                            provider: 'OpenSubtitles',
                        },
                    ],
                    missingSubtitles: ['es', 'fr'],
                },
            ]),
            syncMovie: mockSyncMovie,
            scanMovieDisk: mockScanMovieDisk,
            searchMovieSubtitles: mockSearchMovieSubtitles,
            manualSearch: vi.fn().mockResolvedValue([
                {
                    languageCode: 'es',
                    isForced: false,
                    isHi: false,
                    provider: 'OpenSubtitles',
                    score: 95,
                    extension: 'srt',
                },
            ]),
            manualDownload: vi.fn().mockResolvedValue({
                storedPath: '/path/to/subtitle.es.srt',
            }),
        },
    })),
}));
// Mock the Icon component
vi.mock('@/components/primitives/Icon', () => ({
    Icon: ({ name, size, className }) => (_jsx("div", { "data-testid": `icon-${name}`, className: className, style: { fontSize: size }, children: name })),
}));
function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
            mutations: {
                retry: false,
            },
        },
    });
    return function Wrapper({ children }) {
        return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(ToastProvider, { children: children }) }));
    };
}
describe('MovieSubtitleDetailPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('renders movie details when data loads', async () => {
        const wrapper = createWrapper();
        render(_jsx(MovieSubtitleDetailPage, { params: { id: '123' } }), { wrapper });
        await waitFor(() => {
            expect(screen.getByText('Test Movie')).toBeInTheDocument();
            expect(screen.getByText('(2024)')).toBeInTheDocument();
        });
        // StatusBadge renders the status text in lowercase
        expect(screen.getByText('monitored')).toBeInTheDocument();
    });
    it('renders subtitle tracks', async () => {
        const wrapper = createWrapper();
        render(_jsx(MovieSubtitleDetailPage, { params: { id: '123' } }), { wrapper });
        // Wait for subtitle data to load (wait for the file path to appear)
        await waitFor(() => {
            expect(screen.getByText('/path/to/movie.mkv')).toBeInTheDocument();
        });
        expect(screen.getByText('en')).toBeInTheDocument();
        expect(screen.getByText('OpenSubtitles')).toBeInTheDocument();
    });
    it('renders missing languages', async () => {
        const wrapper = createWrapper();
        render(_jsx(MovieSubtitleDetailPage, { params: { id: '123' } }), { wrapper });
        // Wait for subtitle data to load
        await waitFor(() => {
            expect(screen.getByText('/path/to/movie.mkv')).toBeInTheDocument();
        });
        expect(screen.getByText('es')).toBeInTheDocument();
        expect(screen.getByText('fr')).toBeInTheDocument();
    });
    it('opens manual search modal when button is clicked', async () => {
        const user = userEvent.setup();
        const wrapper = createWrapper();
        render(_jsx(MovieSubtitleDetailPage, { params: { id: '123' } }), { wrapper });
        await waitFor(() => {
            expect(screen.getByText('Manual Search')).toBeInTheDocument();
        });
        const manualSearchButton = screen.getByText('Manual Search');
        await user.click(manualSearchButton);
        await waitFor(() => {
            expect(screen.getByText('Manual Subtitle Search')).toBeInTheDocument();
        });
    });
    it('does not render delete button for subtitle tracks (delete feature not available)', async () => {
        const wrapper = createWrapper();
        render(_jsx(MovieSubtitleDetailPage, { params: { id: '123' } }), { wrapper });
        await waitFor(() => {
            expect(screen.getByText('Subtitle Files')).toBeInTheDocument();
        });
        // Verify that delete buttons are not rendered
        const deleteButtons = screen.queryAllByLabelText(/Delete subtitle for/);
        expect(deleteButtons.length).toBe(0);
    });
    it('calls sync API when sync button is clicked', async () => {
        const user = userEvent.setup();
        const wrapper = createWrapper();
        render(_jsx(MovieSubtitleDetailPage, { params: { id: '123' } }), { wrapper });
        await waitFor(() => {
            expect(screen.getByText('Sync')).toBeInTheDocument();
        });
        const syncButton = screen.getByText('Sync');
        await user.click(syncButton);
        await waitFor(() => {
            expect(mockSyncMovie).toHaveBeenCalledWith(123);
        });
    });
    it('calls scan API when scan button is clicked', async () => {
        const user = userEvent.setup();
        const wrapper = createWrapper();
        render(_jsx(MovieSubtitleDetailPage, { params: { id: '123' } }), { wrapper });
        await waitFor(() => {
            expect(screen.getByText('Scan Disk')).toBeInTheDocument();
        });
        const scanButton = screen.getByText('Scan Disk');
        await user.click(scanButton);
        await waitFor(() => {
            expect(mockScanMovieDisk).toHaveBeenCalledWith(123);
        });
    });
    it('calls search API when search button is clicked', async () => {
        const user = userEvent.setup();
        const wrapper = createWrapper();
        render(_jsx(MovieSubtitleDetailPage, { params: { id: '123' } }), { wrapper });
        await waitFor(() => {
            expect(screen.getByText('Search All')).toBeInTheDocument();
        });
        const searchButton = screen.getByText('Search All');
        await user.click(searchButton);
        await waitFor(() => {
            expect(mockSearchMovieSubtitles).toHaveBeenCalledWith(123);
        });
    });
    it('opens upload modal when upload button is clicked', async () => {
        const user = userEvent.setup();
        const wrapper = createWrapper();
        render(_jsx(MovieSubtitleDetailPage, { params: { id: '123' } }), { wrapper });
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Upload subtitles/i })).toBeInTheDocument();
        });
        const uploadButton = screen.getByRole('button', { name: /Upload subtitles/i });
        await user.click(uploadButton);
        await waitFor(() => {
            expect(screen.getByText(/Upload Subtitles/i)).toBeInTheDocument();
        });
    });
    it('navigates to history page when history button is clicked', async () => {
        const user = userEvent.setup();
        const wrapper = createWrapper();
        render(_jsx(MovieSubtitleDetailPage, { params: { id: '123' } }), { wrapper });
        await waitFor(() => {
            // More button should be present
            expect(screen.getByLabelText('More actions')).toBeInTheDocument();
        });
        // Click More to open the menu
        const moreButton = screen.getByLabelText('More actions');
        await user.click(moreButton);
        // Wait for History to appear in the menu
        await waitFor(() => {
            expect(screen.getByText('History')).toBeInTheDocument();
        });
        const historyButton = screen.getByText('History');
        await user.click(historyButton);
        expect(pushMock).toHaveBeenCalledWith('/subtitles/history/movies');
    });
    it('shows file path and variant ID for each variant', async () => {
        const wrapper = createWrapper();
        render(_jsx(MovieSubtitleDetailPage, { params: { id: '123' } }), { wrapper });
        // Wait for the subtitle file data to load
        await waitFor(() => {
            expect(screen.getByText('/path/to/movie.mkv')).toBeInTheDocument();
        });
        expect(screen.getByText('File Variant #1')).toBeInTheDocument();
    });
    it('shows unavailable when language profile is not provided', async () => {
        const wrapper = createWrapper();
        render(_jsx(MovieSubtitleDetailPage, { params: { id: '123' } }), { wrapper });
        await waitFor(() => {
            expect(screen.getByText('Test Movie')).toBeInTheDocument();
        });
        expect(screen.getByText('Language Profile:')).toBeInTheDocument();
        expect(screen.getByText('Unavailable')).toBeInTheDocument();
    });
});
//# sourceMappingURL=page.test.js.map