import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/errors';
import AddMediaPage from './page';

const pushMock = vi.fn();
const searchParamState = {
  q: null as string | null,
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({
    get: (key: string) => {
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

interface MetadataItem {
  mediaType: 'MOVIE' | 'TV';
  title: string;
  year?: number;
  overview?: string;
  tmdbId?: number;
  tvdbId?: number;
}

const searchMetadataMock = vi.fn();
const listMoviesMock = vi.fn();
const listSeriesMock = vi.fn();
const addMediaMock = vi.fn();

const mockedGetApiClients = vi.mocked(getApiClients);

function createTestQueryClient(): QueryClient {
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

function renderPage(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AddMediaPage />
      </ToastProvider>
    </QueryClientProvider>,
  );
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

  mockedGetApiClients.mockReturnValue({
    mediaApi: {
      searchMetadata: searchMetadataMock,
      listMovies: listMoviesMock,
      listSeries: listSeriesMock,
      addMedia: addMediaMock,
    },
  } as ReturnType<typeof getApiClients>);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('add media page', () => {
  it('debounces search input and supports movie/series tab switching with empty state', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    fireEvent.change(screen.getByPlaceholderText('Search title...'), { target: { value: 'st' } });
    expect(searchMetadataMock).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(searchMetadataMock).toHaveBeenCalledWith({ term: 'st', mediaType: 'MOVIE' });
    }, { timeout: 1500 });
    expect(await screen.findByText('No results')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Series' }));
    await waitFor(() => {
      expect(searchMetadataMock).toHaveBeenCalledWith({ term: 'st', mediaType: 'TV' });
    });
  });

  it('shows loading state while search query is pending', async () => {
    searchMetadataMock.mockImplementation(() => new Promise<MetadataItem[]>(() => {}));

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    fireEvent.change(screen.getByPlaceholderText('Search title...'), { target: { value: 'arrival' } });

    expect(await screen.findByLabelText('loading heading')).toBeInTheDocument();
  });

  it('renders query error state when metadata search fails', async () => {
    searchMetadataMock.mockRejectedValueOnce(new Error('metadata backend unavailable'));

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    fireEvent.change(screen.getByPlaceholderText('Search title...'), { target: { value: 'dune' } });

    expect(await screen.findByText('Could not load data')).toBeInTheDocument();
    expect(await screen.findByText('metadata backend unavailable')).toBeInTheDocument();
  });

  it('shows already-added indicator badges for matching existing results', async () => {
    searchMetadataMock.mockResolvedValue([
      {
        mediaType: 'MOVIE',
        title: 'Inception',
        year: 2010,
        overview: 'A dream-heist thriller.',
        tmdbId: 27205,
      },
    ]);
    listMoviesMock.mockResolvedValue({
      items: [
        {
          id: 14,
          title: 'Inception',
          tmdbId: 27205,
          monitored: true,
        },
      ],
      meta: { page: 1, pageSize: 100, totalCount: 1, totalPages: 1 },
    });

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    fireEvent.change(screen.getByPlaceholderText('Search title...'), { target: { value: 'inc' } });

    expect(await screen.findByText('monitored')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Review Add Config' })).toBeInTheDocument();
  });

  it('uses quality/monitor/search settings in add payload', async () => {
    searchMetadataMock.mockResolvedValue([
      {
        mediaType: 'MOVIE',
        title: 'Arrival',
        year: 2016,
        overview: 'Linguistics meets first contact.',
        tmdbId: 329865,
        imdbId: 'tt2543164',
      },
    ]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    fireEvent.change(screen.getByPlaceholderText('Search title...'), { target: { value: 'arrival' } });
    const selectButton = await screen.findByRole('button', { name: 'Select' });
    fireEvent.click(selectButton);

    fireEvent.change(screen.getByLabelText('Quality Profile'), { target: { value: '2' } });
    fireEvent.click(screen.getByLabelText('Monitored'));
    fireEvent.click(screen.getByLabelText('Search on add'));
    fireEvent.click(screen.getByRole('button', { name: 'Add media' }));

    await waitFor(() => {
      expect(addMediaMock).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaType: 'MOVIE',
          qualityProfileId: 2,
          monitored: false,
          searchNow: false,
          title: 'Arrival',
          year: 2016,
          tmdbId: 329865,
          imdbId: 'tt2543164',
        }),
      );
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/library/movies/99');
    });
  });

  it('shows duplicate conflict actions and routes to existing media', async () => {
    searchMetadataMock.mockResolvedValue([
      {
        mediaType: 'MOVIE',
        title: 'Blade Runner',
        year: 1982,
        overview: 'Replicants and neon.',
        tmdbId: 78,
      },
    ]);
    addMediaMock.mockRejectedValueOnce(
      new ApiClientError({
        code: 'CONFLICT',
        message: 'Movie already exists in library.',
        status: 409,
        retryable: false,
        details: { existingId: 42 },
      }),
    );

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    fireEvent.change(screen.getByPlaceholderText('Search title...'), { target: { value: 'blade' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Select' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add media' }));

    expect(await screen.findByText('Duplicate found')).toBeInTheDocument();
    expect((await screen.findAllByText('Movie already exists in library.')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Go to existing' }));
    expect(pushMock).toHaveBeenCalledWith('/library/movies/42');

    fireEvent.click(screen.getByRole('button', { name: 'Add anyway' }));
    expect(await screen.findByText('Force add unavailable')).toBeInTheDocument();
  });
});
