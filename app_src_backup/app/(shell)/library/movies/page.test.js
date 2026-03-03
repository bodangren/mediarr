import { jsx as _jsx } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useOptimisticMutation } from '@/lib/query/useOptimisticMutation';
import MoviesLibraryPage from './page';
vi.mock('@/lib/api/client', () => ({
    getApiClients: vi.fn(),
}));
vi.mock('@/lib/query/useApiQuery', () => ({
    useApiQuery: vi.fn(),
}));
vi.mock('@/lib/query/useOptimisticMutation', () => ({
    useOptimisticMutation: vi.fn(),
}));
const mockedGetApiClients = vi.mocked(getApiClients);
const mockedUseApiQuery = vi.mocked(useApiQuery);
const mockedUseOptimisticMutation = vi.mocked(useOptimisticMutation);
const monitoredMutateMock = vi.fn();
function renderPage() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(ToastProvider, { children: _jsx(MoviesLibraryPage, {}) }) }));
}
beforeEach(() => {
    vi.clearAllMocks();
    mockedGetApiClients.mockReturnValue({
        mediaApi: {
            deleteMovie: vi.fn().mockResolvedValue({ deleted: true, id: 1 }),
            setMovieMonitored: vi.fn().mockResolvedValue({ id: 1, monitored: false }),
        },
    });
    mockedUseApiQuery.mockReturnValue({
        data: {
            items: [
                {
                    id: 1,
                    title: 'Wanted State',
                    year: 2021,
                    status: 'active',
                    monitored: true,
                    fileVariants: [],
                },
                {
                    id: 2,
                    title: 'Importing State',
                    year: 2020,
                    status: 'active',
                    monitored: true,
                    fileVariants: [{ path: null }],
                },
                {
                    id: 3,
                    title: 'Completed State',
                    year: 2019,
                    status: 'active',
                    monitored: true,
                    fileVariants: [{ path: '/data/movies/completed.mkv' }],
                },
            ],
            meta: {
                page: 1,
                pageSize: 25,
                totalCount: 3,
                totalPages: 3,
            },
        },
        isPending: false,
        isError: false,
        isResolvedEmpty: false,
        error: null,
        refetch: vi.fn(),
    });
    mockedUseOptimisticMutation.mockReturnValue({
        mutate: monitoredMutateMock,
    });
});
describe('movie library page', () => {
    it('renders file-status indicators and table controls', async () => {
        renderPage();
        const wantedRow = (await screen.findByText('Wanted State')).closest('tr');
        const importingRow = screen.getByText('Importing State').closest('tr');
        const completedRow = screen.getByText('Completed State').closest('tr');
        expect(within(wantedRow).getByText('wanted')).toBeInTheDocument();
        expect(within(importingRow).getByText('downloading')).toBeInTheDocument();
        expect(within(completedRow).getByText('completed')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Sort by Year' }));
        fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
        fireEvent.change(screen.getByPlaceholderText('Search movies...'), { target: { value: 'dune' } });
        await waitFor(() => {
            expect(mockedUseApiQuery.mock.calls.length).toBeGreaterThan(1);
        });
    });
    it('routes monitored toggle actions through optimistic mutation', async () => {
        renderPage();
        const row = (await screen.findByText('Wanted State')).closest('tr');
        const checkbox = within(row).getByRole('checkbox');
        fireEvent.click(checkbox);
        expect(monitoredMutateMock).toHaveBeenCalledWith({ id: 1, monitored: false });
        expect(mockedUseOptimisticMutation).toHaveBeenCalled();
    });
});
//# sourceMappingURL=page.test.js.map