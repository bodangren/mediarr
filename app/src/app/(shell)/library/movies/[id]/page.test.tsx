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
        <MovieDetailPage params={{ id: '7' }} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  searchCandidatesMock.mockResolvedValue([{ title: 'Candidate A' }, { title: 'Candidate B' }]);
  deleteMovieMock.mockResolvedValue({ deleted: true, id: 7 });
  setMovieMonitoredMock.mockResolvedValue({ id: 7, title: 'Test Movie', monitored: true });

  mockedGetApiClients.mockReturnValue({
    httpClient: {} as any,
    releaseApi: {
      searchCandidates: searchCandidatesMock,
    },
    mediaApi: {
      deleteMovie: deleteMovieMock,
      setMovieMonitored: setMovieMonitoredMock,
    },
  } as any);

  mockedUseApiQuery.mockReturnValue({
    data: {
      id: 7,
      title: 'Blade Runner 2049',
      year: 2017,
      overview: 'Test movie overview',
      runtime: 118,
      certification: 'R',
      posterUrl: '',
      backdropUrl: '',
      status: 'downloaded',
      monitored: true,
      qualityProfileId: 1,
      qualityProfileName: 'HD - 1080p',
      sizeOnDisk: 2_147_483_648,
      path: '/Movies/Blade Runner 2049 (2017)',
      genres: ['Action', 'Drama', 'Sci-Fi'],
      studio: 'Warner Bros.',
      ratings: {
        tmdb: 7.1,
        imdb: 8.0,
      },
      files: [
        {
          id: 1,
          path: '/Movies/Blade Runner 2049 (2017)/Blade.Runner.2049.2017.1080p.BluRay.x264.mkv',
          quality: 'Bluray-1080p',
          size: 2_147_483_648,
          language: 'English',
        },
      ],
      cast: [
        {
          id: 1,
          name: 'Ryan Gosling',
          character: 'K',
          profileUrl: '',
        },
      ],
      crew: [],
      alternateTitles: [],
    },
    isPending: false,
    isLoading: false,
    isError: false,
    isResolvedEmpty: false,
    error: null,
    refetch: vi.fn(),
  } as any);
});

describe('movie detail page', () => {
  it('renders movie header with information', async () => {
    renderPage();

    expect(await screen.findByText('Blade Runner 2049')).toBeInTheDocument();
    expect(screen.getByText('2017')).toBeInTheDocument();
    expect(screen.getByText(/Monitored/i)).toBeInTheDocument();
  });

  it('supports search and delete action buttons', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();

    const searchButton = await screen.findByRole('button', { name: /Search Movie/i });
    expect(searchButton).toBeInTheDocument();
    fireEvent.click(searchButton);
    await waitFor(() => {
      expect(searchCandidatesMock).toHaveBeenCalled();
    });

    const deleteButton = screen.getByRole('button', { name: /Delete Movie/i });
    expect(deleteButton).toBeInTheDocument();
    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(deleteMovieMock).toHaveBeenCalled();
    });

    confirmSpy.mockRestore();
  });
});
