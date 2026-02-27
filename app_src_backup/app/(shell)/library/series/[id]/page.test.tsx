import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { useApiQuery } from '@/lib/query/useApiQuery';
import SeriesDetailPage from './page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '42' }),
}));

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

vi.mock('@/lib/query/useApiQuery', () => ({
  useApiQuery: vi.fn(),
}));

const mockedGetApiClients = vi.mocked(getApiClients);
const mockedUseApiQuery = vi.mocked(useApiQuery);

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
        <SeriesDetailPage />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const setEpisodeMonitoredMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  mockedGetApiClients.mockReturnValue({
    mediaApi: {
      getSeries: vi.fn(),
      setEpisodeMonitored: setEpisodeMonitoredMock.mockResolvedValue({ id: 1002, monitored: true }),
    },
  } as ReturnType<typeof getApiClients>);

  mockedUseApiQuery.mockReturnValue({
    data: {
      id: 42,
      title: 'Foundation',
      year: 2021,
      status: 'continuing',
      seasons: [
        {
          seasonNumber: 1,
          episodes: [
            {
              id: 1001,
              episodeNumber: 1,
              title: 'The Emperor’s Peace',
              monitored: true,
              path: '/data/tv/foundation.s01e01.mkv',
            },
            {
              id: 1002,
              episodeNumber: 2,
              title: 'Preparing to Live',
              monitored: false,
              path: null,
            },
          ],
        },
      ],
    },
    isPending: false,
    isError: false,
    isResolvedEmpty: false,
    error: null,
    refetch: vi.fn(),
  } as ReturnType<typeof useApiQuery>);
});

describe('series detail page', () => {
  it('renders season accordion, episode grid, and per-episode file status', async () => {
    renderPage();

    expect(await screen.findByText('Foundation')).toBeInTheDocument();
    expect(screen.getByText('Season 1')).toBeInTheDocument();
    expect(screen.getByText(/E1: The Emperor’s Peace/)).toBeInTheDocument();
    expect(screen.getByText('/data/tv/foundation.s01e01.mkv')).toBeInTheDocument();
    expect(screen.getByText(/E2: Preparing to Live/)).toBeInTheDocument();
    expect(screen.getByText('File missing')).toBeInTheDocument();

    const episodeOneRow = screen.getByText(/E1: The Emperor’s Peace/).closest('div.grid');
    const episodeTwoRow = screen.getByText(/E2: Preparing to Live/).closest('div.grid');
    expect(within(episodeOneRow as HTMLElement).getByText('completed')).toBeInTheDocument();
    expect(within(episodeTwoRow as HTMLElement).getByText('wanted')).toBeInTheDocument();
  });

  it('supports episode monitored toggles', async () => {
    renderPage();

    const episodeTwoRow = screen.getByText(/E2: Preparing to Live/).closest('div.grid');
    const monitoredCheckbox = within(episodeTwoRow as HTMLElement).getByRole('checkbox');
    expect(monitoredCheckbox).not.toBeChecked();

    fireEvent.click(monitoredCheckbox);

    await waitFor(() => {
      expect(setEpisodeMonitoredMock).toHaveBeenCalledWith(1002, true);
    });
  });
});
