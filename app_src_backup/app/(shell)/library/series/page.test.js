import { jsx as _jsx } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useOptimisticMutation } from '@/lib/query/useOptimisticMutation';
import SeriesLibraryPage from './page';
vi.mock('@/lib/api/client', () => ({
    getApiClients: vi.fn(),
}));
vi.mock('@/lib/query/useApiQuery', () => ({
    useApiQuery: vi.fn(),
}));
vi.mock('@/lib/query/useOptimisticMutation', () => ({
    useOptimisticMutation: vi.fn(),
}));
vi.mock('@/lib/hooks/useSeriesOptions', () => ({
    useSeriesViewMode: vi.fn(() => ['table', vi.fn()]),
}));
const mockedGetApiClients = vi.mocked(getApiClients);
const mockedUseApiQuery = vi.mocked(useApiQuery);
const mockedUseOptimisticMutation = vi.mocked(useOptimisticMutation);
const seriesListResult = {
    data: {
        items: [
            {
                id: 1,
                title: 'No Episodes Yet',
                year: 2022,
                status: 'active',
                monitored: true,
                network: 'HBO',
                seasons: [],
            },
            {
                id: 2,
                title: 'Missing Files',
                year: 2021,
                status: 'active',
                monitored: true,
                network: 'Netflix',
                seasons: [{ episodes: [{ path: null }] }],
            },
            {
                id: 3,
                title: 'Has Files',
                year: 2020,
                status: 'active',
                monitored: true,
                network: 'BBC',
                seasons: [{ episodes: [{ path: '/data/tv/has-files.mkv' }] }],
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
};
const filtersListResult = {
    data: [
        {
            id: 7,
            name: 'Monitored',
            type: 'series',
            conditions: {
                operator: 'and',
                conditions: [{ field: 'monitored', operator: 'equals', value: true }],
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
    ],
    isPending: false,
    isError: false,
    isResolvedEmpty: false,
    error: null,
    refetch: vi.fn(),
};
// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] ?? null,
        setItem: (key, value) => {
            store[key] = value;
        },
        clear: () => {
            store = {};
        },
    };
})();
Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
});
const monitoredMutateMock = vi.fn();
function renderPage() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(ToastProvider, { children: _jsx(SeriesLibraryPage, {}) }) }));
}
beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockedGetApiClients.mockReturnValue({
        mediaApi: {
            deleteSeries: vi.fn().mockResolvedValue({ deleted: true, id: 1 }),
            setSeriesMonitored: vi.fn().mockResolvedValue({ id: 1, monitored: false }),
            listSeries: vi.fn(),
        },
        filtersApi: {
            list: vi.fn().mockResolvedValue([]),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
    });
    mockedUseApiQuery.mockImplementation((options) => {
        if (Array.isArray(options.queryKey) && options.queryKey[0] === 'filters') {
            return filtersListResult;
        }
        return seriesListResult;
    });
    mockedUseOptimisticMutation.mockReturnValue({
        mutate: monitoredMutateMock,
    });
    // Mock view mode hook to return 'table' by default
    vi.doMock('@/lib/hooks/useSeriesOptions', () => ({
        useSeriesViewMode: vi.fn(() => ['table', vi.fn()]),
    }));
});
describe('series library page - table view', () => {
    it('renders file-status indicators and table controls', async () => {
        renderPage();
        const noEpisodesRow = (await screen.findByText('No Episodes Yet')).closest('tr');
        const missingFilesRow = screen.getByText('Missing Files').closest('tr');
        const hasFilesRow = screen.getByText('Has Files').closest('tr');
        expect(within(noEpisodesRow).getByText('File: missing')).toBeInTheDocument();
        expect(within(missingFilesRow).getByText('File: wanted')).toBeInTheDocument();
        expect(within(hasFilesRow).getByText('File: completed')).toBeInTheDocument();
        fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), { target: { value: 'year' } });
        fireEvent.click(screen.getAllByRole('button', { name: 'Next' })[0]);
        fireEvent.change(screen.getByPlaceholderText('Search series...'), { target: { value: 'arc' } });
        await waitFor(() => {
            expect(mockedUseApiQuery.mock.calls.length).toBeGreaterThan(1);
        });
    });
    it('routes monitored toggle actions through optimistic mutation', async () => {
        renderPage();
        const row = (await screen.findByText('No Episodes Yet')).closest('tr');
        const checkbox = within(row).getByLabelText('Monitored');
        fireEvent.click(checkbox);
        expect(monitoredMutateMock).toHaveBeenCalledWith({ id: 1, monitored: false });
        expect(mockedUseOptimisticMutation).toHaveBeenCalled();
    });
});
describe('series library page - view modes', () => {
    it('renders view mode toggle buttons', async () => {
        renderPage();
        expect(screen.getByRole('button', { name: 'Table view', pressed: true })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Poster view' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Overview view' })).toBeInTheDocument();
    });
    it('renders filter dropdown and jump bar actions', async () => {
        renderPage();
        expect(screen.getByRole('combobox', { name: 'Saved Filter' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'M' }));
        await waitFor(() => {
            expect(mockedUseApiQuery).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=page.test.js.map