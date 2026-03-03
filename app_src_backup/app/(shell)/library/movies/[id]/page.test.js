import { jsx as _jsx } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { useApiQuery } from '@/lib/query/useApiQuery';
import MovieDetailPage from './page';
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: pushMock }),
}));
vi.mock('@/lib/api/client', () => ({
    getApiClients: vi.fn(),
}));
vi.mock('@/lib/query/useApiQuery', () => ({
    useApiQuery: vi.fn(),
}));
const mockedGetApiClients = vi.mocked(getApiClients);
const mockedUseApiQuery = vi.mocked(useApiQuery);
const searchCandidatesMock = vi.fn();
const deleteMovieMock = vi.fn();
const setMovieMonitoredMock = vi.fn();
const refreshMovieMock = vi.fn();
const deleteFileMock = vi.fn();
function renderPage() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(ToastProvider, { children: _jsx(MovieDetailPage, { params: { id: '7' } }) }) }));
}
beforeEach(() => {
    vi.clearAllMocks();
    searchCandidatesMock.mockResolvedValue([{ title: 'Candidate A' }, { title: 'Candidate B' }]);
    deleteMovieMock.mockResolvedValue({ deleted: true, id: 7 });
    setMovieMonitoredMock.mockResolvedValue({ id: 7, title: 'Test Movie', monitored: true });
    refreshMovieMock.mockResolvedValue({ id: 7, refreshed: true });
    deleteFileMock.mockResolvedValue({ deleted: true });
    mockedGetApiClients.mockReturnValue({
        httpClient: {},
        releaseApi: {
            searchCandidates: searchCandidatesMock,
        },
        mediaApi: {
            deleteMovie: deleteMovieMock,
            setMovieMonitored: setMovieMonitoredMock,
        },
        movieApi: {
            getById: vi.fn(),
            refresh: refreshMovieMock,
            update: vi.fn(),
            deleteFile: deleteFileMock,
        },
    });
    mockedUseApiQuery.mockReturnValue({
        data: {
            id: 7,
            title: 'Blade Runner 2049',
            year: 2017,
            overview: 'Test movie overview',
            runtime: 118,
            certification: 'R',
            posterUrl: '',
            status: 'downloaded',
            monitored: true,
            qualityProfileId: 1,
            sizeOnDisk: 2_147_483_648,
            path: '/Movies/Blade Runner 2049 (2017)',
            genres: ['Action', 'Drama', 'Sci-Fi'],
            studio: 'Warner Bros.',
        },
        isPending: false,
        isLoading: false,
        isError: false,
        isResolvedEmpty: false,
        error: null,
        refetch: vi.fn(),
    });
});
describe('movie detail page', () => {
    it('renders movie header with information', async () => {
        renderPage();
        expect(await screen.findByText('Blade Runner 2049')).toBeInTheDocument();
        expect(screen.getByText('2017')).toBeInTheDocument();
        expect(screen.getByText(/Monitored/i)).toBeInTheDocument();
    });
    it('supports refresh action button', async () => {
        renderPage();
        const refreshButton = await screen.findByRole('button', { name: /Refresh/i });
        expect(refreshButton).toBeInTheDocument();
        fireEvent.click(refreshButton);
        await waitFor(() => {
            expect(refreshMovieMock).toHaveBeenCalled();
        });
    });
    it('supports search action button', async () => {
        renderPage();
        const searchButton = await screen.findByRole('button', { name: /Search Movie/i });
        expect(searchButton).toBeInTheDocument();
        fireEvent.click(searchButton);
        await waitFor(() => {
            expect(searchCandidatesMock).toHaveBeenCalled();
        });
    });
    it('supports interactive search action button', async () => {
        renderPage();
        const interactiveSearchButton = await screen.findByRole('button', { name: /Interactive Search/i });
        expect(interactiveSearchButton).toBeInTheDocument();
        fireEvent.click(interactiveSearchButton);
        // Modal should open (check by some UI change)
    });
    it('supports edit movie action button', async () => {
        renderPage();
        const editButton = await screen.findByRole('button', { name: /Edit Movie/i });
        expect(editButton).toBeInTheDocument();
        fireEvent.click(editButton);
        // Modal should open (check by some UI change)
    });
    it('supports delete movie action button', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        renderPage();
        const deleteButton = await screen.findByRole('button', { name: /Delete Movie/i });
        expect(deleteButton).toBeInTheDocument();
        fireEvent.click(deleteButton);
        await waitFor(() => {
            expect(deleteMovieMock).toHaveBeenCalled();
        });
        confirmSpy.mockRestore();
    });
    it('shows empty state when no files present', async () => {
        renderPage();
        // Should show empty state alert with full message
        await waitFor(() => {
            expect(screen.getByText(/Click "Search Movie" to find releases/)).toBeInTheDocument();
        });
    });
});
//# sourceMappingURL=page.test.js.map