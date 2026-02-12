import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { useApiQuery } from '@/lib/query/useApiQuery';
import MovieDetailPage from './page';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '7' }),
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
        <MovieDetailPage />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  searchCandidatesMock.mockResolvedValue([{ title: 'Candidate A' }, { title: 'Candidate B' }]);
  deleteMovieMock.mockResolvedValue({ deleted: true, id: 7 });

  mockedGetApiClients.mockReturnValue({
    releaseApi: {
      searchCandidates: searchCandidatesMock,
    },
    mediaApi: {
      deleteMovie: deleteMovieMock,
    },
  } as ReturnType<typeof getApiClients>);

  mockedUseApiQuery.mockReturnValue({
    data: {
      id: 7,
      title: 'Blade Runner 2049',
      year: 2017,
      status: 'released',
      monitored: true,
      tmdbId: 335984,
      fileVariants: [{ id: 1, path: '/data/movies/blade-runner-2049.mkv' }],
    },
    isPending: false,
    isError: false,
    isResolvedEmpty: false,
    error: null,
    refetch: vi.fn(),
  } as ReturnType<typeof useApiQuery>);
});

describe('movie detail page', () => {
  it('renders file/metadata status panel', async () => {
    renderPage();

    expect(await screen.findByText('Blade Runner 2049')).toBeInTheDocument();
    expect(screen.getByText('Metadata')).toBeInTheDocument();
    expect(screen.getByText('released')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('/data/movies/blade-runner-2049.mkv')).toBeInTheDocument();
  });

  it('supports search and delete action buttons', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Search Releases' }));
    await waitFor(() => {
      expect(searchCandidatesMock).toHaveBeenCalledWith({
        movieId: 7,
        title: 'Blade Runner 2049',
      });
    });
    expect(await screen.findByText('Latest search found 2 candidates.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Movie' }));
    await waitFor(() => {
      expect(deleteMovieMock).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith('/library/movies');
    });

    confirmSpy.mockRestore();
  });
});
