import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { useApiQuery } from '@/lib/query/useApiQuery';
import WantedPage from './page';
import type { MissingEpisode, CutoffUnmetEpisode } from '@/types/wanted';

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

const grabReleaseMock = vi.fn();

function renderPage(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <WantedPage />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Clear localStorage to reset tab state
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
  grabReleaseMock.mockResolvedValue({ queued: true });

  mockedGetApiClients.mockReturnValue({
    releaseApi: {
      grabRelease: grabReleaseMock,
      searchCandidates: vi.fn().mockResolvedValue([
        {
          indexer: 'Indexer 1',
          title: 'Andor S01E04 1080p WEB-DL',
          size: 8_589_934_592,
          seeders: 145,
          quality: '1080p WEB-DL',
          age: 9,
        },
      ]),
    },
    mediaApi: {
      listMissingEpisodes: vi.fn().mockResolvedValue({
        items: [
          {
            id: 21,
            seriesId: 1,
            seriesTitle: 'Andor',
            seasonNumber: 1,
            episodeNumber: 4,
            episodeTitle: 'Aldhani',
            airDate: '2022-09-21',
            status: 'missing',
            monitored: true,
          },
          {
            id: 22,
            seriesId: 2,
            seriesTitle: 'The Mandalorian',
            seasonNumber: 3,
            episodeNumber: 1,
            episodeTitle: 'Chapter 17',
            airDate: '2023-03-01',
            status: 'missing',
            monitored: true,
          },
        ],
        meta: { page: 1, pageSize: 25, totalCount: 2, totalPages: 1 },
      }),
      listCutoffUnmetEpisodes: vi.fn().mockResolvedValue({
        items: [
          {
            id: 31,
            seriesId: 3,
            seriesTitle: 'Breaking Bad',
            seasonNumber: 5,
            episodeNumber: 1,
            episodeTitle: 'Live Free or Die',
            currentQuality: '720p',
            cutoffQuality: '1080p',
            airDate: '2012-07-15',
          },
        ],
        meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
      }),
      listWanted: vi.fn(),
      listSeries: vi.fn(),
      getSeries: vi.fn(),
      setSeriesMonitored: vi.fn(),
      setEpisodeMonitored: vi.fn(),
      deleteSeries: vi.fn(),
      listMovies: vi.fn(),
      getMovie: vi.fn(),
      setMovieMonitored: vi.fn(),
      deleteMovie: vi.fn(),
      searchMetadata: vi.fn(),
      addMedia: vi.fn(),
    },
    httpClient: {},
    torrentApi: {
      list: vi.fn(),
    },
    indexerApi: {},
    applicationsApi: {},
    subtitleApi: {},
    activityApi: {},
    blocklistApi: {},
    systemApi: {},
    notificationsApi: {},
    tagsApi: {},
    eventsApi: {
      connectionState: 'idle',
      onStateChange: vi.fn(() => () => {}),
    },
  } as unknown as ReturnType<typeof getApiClients>);

  mockedUseApiQuery.mockImplementation((options) => {
    const [domain, feature] = options.queryKey;

    if (domain === 'episodes' && feature === 'missing') {
      return {
        data: {
          items: [
            {
              id: 21,
              seriesId: 1,
              seriesTitle: 'Andor',
              seasonNumber: 1,
              episodeNumber: 4,
              episodeTitle: 'Aldhani',
              airDate: '2022-09-21',
              status: 'missing',
              monitored: true,
            },
            {
              id: 22,
              seriesId: 2,
              seriesTitle: 'The Mandalorian',
              seasonNumber: 3,
              episodeNumber: 1,
              episodeTitle: 'Chapter 17',
              airDate: '2023-03-01',
              status: 'missing',
              monitored: true,
            },
          ],
          meta: { page: 1, pageSize: 25, totalCount: 2, totalPages: 1 },
        },
        isPending: false,
        isError: false,
        isSuccess: true,
        isResolvedEmpty: false,
        error: null,
        isLoading: false,
        isLoadingError: false,
        isRefetchError: false,
        isFetching: false,
        isPlaceholderData: false,
        isFetched: true,
        isFetchedAfterMount: true,
        fetchStatus: 'idle',
        status: 'success',
        dataUpdatedAt: 0,
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        errorUpdateCount: 0,
        refetch: vi.fn(),
        remove: vi.fn(),
        cancel: vi.fn(),
      };
    }

    if (domain === 'episodes' && feature === 'cutoff-unmet') {
      return {
        data: {
          items: [
            {
              id: 31,
              seriesId: 3,
              seriesTitle: 'Breaking Bad',
              seasonNumber: 5,
              episodeNumber: 1,
              episodeTitle: 'Live Free or Die',
              currentQuality: '720p',
              cutoffQuality: '1080p',
              airDate: '2012-07-15',
            },
          ],
          meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
        },
        isPending: false,
        isError: false,
        isSuccess: true,
        isResolvedEmpty: false,
        error: null,
        isLoading: false,
        isLoadingError: false,
        isRefetchError: false,
        isFetching: false,
        isPlaceholderData: false,
        isFetched: true,
        isFetchedAfterMount: true,
        fetchStatus: 'idle',
        status: 'success',
        dataUpdatedAt: 0,
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        errorUpdateCount: 0,
        refetch: vi.fn(),
        remove: vi.fn(),
        cancel: vi.fn(),
      };
    }

    return {
      data: undefined,
      isPending: false,
      isError: false,
      isSuccess: false,
      isResolvedEmpty: true,
      error: null,
      isLoading: false,
      isLoadingError: false,
      isRefetchError: false,
      isFetching: false,
      isPlaceholderData: false,
      isFetched: true,
      isFetchedAfterMount: true,
      fetchStatus: 'idle',
      status: 'success',
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      refetch: vi.fn(),
      remove: vi.fn(),
      cancel: vi.fn(),
    };
  });
});

describe('Wanted page with tabs', () => {
  beforeEach(() => {
    // Reset tab state to 'missing' before each test
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('mediarr.wanted.state', JSON.stringify({ activeTab: 'missing' }));
    }
  });

  it('renders tab navigation and switches between Missing and Cutoff Unmet tabs', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    renderPage(queryClient);

    // Should show tab navigation
    expect(screen.getByRole('button', { name: 'Missing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cutoff Unmet' })).toBeInTheDocument();

    // Should start on Missing tab
    expect(screen.getByText('Missing Episodes')).toBeInTheDocument();
    expect(screen.getByText('Episodes that have aired but don\'t have files yet.')).toBeInTheDocument();

    // Should show missing episodes
    expect(await screen.findByText('Andor')).toBeInTheDocument();
    expect(screen.getByText('The Mandalorian')).toBeInTheDocument();
    expect(screen.getByText('Aldhani')).toBeInTheDocument();

    // Switch to Cutoff Unmet tab
    fireEvent.click(screen.getByRole('button', { name: 'Cutoff Unmet' }));

    await waitFor(() => {
      expect(screen.getByText('Cutoff Unmet Episodes')).toBeInTheDocument();
      expect(screen.getByText('Episodes that have files but don\'t meet the quality cutoff.')).toBeInTheDocument();
      expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
      expect(screen.getByText('Live Free or Die')).toBeInTheDocument();
      expect(screen.getByText('720p')).toBeInTheDocument();
      expect(screen.getByText('1080p')).toBeInTheDocument();
    });
  });

  it('renders Missing tab with episode list and search functionality', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    renderPage(queryClient);

    expect(await screen.findByText('Andor')).toBeInTheDocument();
    expect(screen.getByText('S01E04')).toBeInTheDocument();
    expect(screen.getByText('Aldhani')).toBeInTheDocument();
    // Date format may vary by locale, so just check that a date is rendered
    expect(screen.getByText(/2022/)).toBeInTheDocument();

    // Click search button for first episode
    const searchButtons = screen.getAllByRole('button', { name: 'Search' });
    fireEvent.click(searchButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Release Candidates')).toBeInTheDocument();
    });
  });

  it('renders Cutoff Unmet tab with quality comparison', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    renderPage(queryClient);

    // Switch to Cutoff Unmet tab
    fireEvent.click(screen.getByRole('button', { name: 'Cutoff Unmet' }));

    await waitFor(() => {
      expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
      expect(screen.getByText('S05E01')).toBeInTheDocument();
      expect(screen.getByText('Live Free or Die')).toBeInTheDocument();
      expect(screen.getByText('720p')).toBeInTheDocument();
      expect(screen.getByText('1080p')).toBeInTheDocument();
    });
  });

  it('allows bulk search selection in Missing tab', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    renderPage(queryClient);

    // Select first episode checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);

    fireEvent.click(checkboxes[0]);

    // Should show bulk search button with count
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Search 1 selected/i })).toBeInTheDocument();
    });
  });

  it('handles search and release grab workflow', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    renderPage(queryClient);

    const searchButtons = screen.getAllByRole('button', { name: 'Search' });
    fireEvent.click(searchButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Release Candidates')).toBeInTheDocument();
    });

    // Should show episode info in release candidates panel
    expect(screen.getByText('Andor · S01E04')).toBeInTheDocument();
  });
});
