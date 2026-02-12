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

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <SeriesLibraryPage />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();

  mockedGetApiClients.mockReturnValue({
    mediaApi: {
      deleteSeries: vi.fn().mockResolvedValue({ deleted: true, id: 1 }),
      setSeriesMonitored: vi.fn().mockResolvedValue({ id: 1, monitored: false }),
    },
  } as ReturnType<typeof getApiClients>);

  mockedUseApiQuery.mockReturnValue({
    data: {
      items: [
        {
          id: 1,
          title: 'No Episodes Yet',
          year: 2022,
          status: 'active',
          monitored: true,
          seasons: [],
        },
        {
          id: 2,
          title: 'Missing Files',
          year: 2021,
          status: 'active',
          monitored: true,
          seasons: [{ episodes: [{ path: null }] }],
        },
        {
          id: 3,
          title: 'Has Files',
          year: 2020,
          status: 'active',
          monitored: true,
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
  } as ReturnType<typeof useApiQuery>);

  mockedUseOptimisticMutation.mockReturnValue({
    mutate: monitoredMutateMock,
  } as ReturnType<typeof useOptimisticMutation>);
});

describe('series library page', () => {
  it('renders file-status indicators and table controls', async () => {
    renderPage();

    const noEpisodesRow = (await screen.findByText('No Episodes Yet')).closest('tr');
    const missingFilesRow = screen.getByText('Missing Files').closest('tr');
    const hasFilesRow = screen.getByText('Has Files').closest('tr');
    expect(within(noEpisodesRow as HTMLElement).getByText('missing')).toBeInTheDocument();
    expect(within(missingFilesRow as HTMLElement).getByText('wanted')).toBeInTheDocument();
    expect(within(hasFilesRow as HTMLElement).getByText('completed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sort by Year' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    fireEvent.change(screen.getByPlaceholderText('Search series...'), { target: { value: 'arc' } });

    await waitFor(() => {
      expect(mockedUseApiQuery.mock.calls.length).toBeGreaterThan(1);
    });
  });

  it('routes monitored toggle actions through optimistic mutation', async () => {
    renderPage();

    const row = (await screen.findByText('No Episodes Yet')).closest('tr');
    const checkbox = within(row as HTMLElement).getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(monitoredMutateMock).toHaveBeenCalledWith({ id: 1, monitored: false });
    expect(mockedUseOptimisticMutation).toHaveBeenCalled();
  });
});
