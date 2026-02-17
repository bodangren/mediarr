import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MovieMissingTab } from './MovieMissingTab';
import { getApiClients } from '@/lib/api/client';
import { useApiQuery } from '@/lib/query/useApiQuery';
import type { MissingMovie } from '@/lib/api/wantedApi';

const mockOnSearchMovie = vi.fn();
const mockOnBulkSearch = vi.fn();
const mockPush = vi.fn();

// Mock the router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

vi.mock('@/lib/query/useApiQuery', () => ({
  useApiQuery: vi.fn(),
}));

const mockedGetApiClients = vi.mocked(getApiClients);
const mockedUseApiQuery = vi.mocked(useApiQuery);

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

function renderComponent(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MovieMissingTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />
    </QueryClientProvider>,
  );
}

const mockMissingMovies: MissingMovie[] = [
  {
    id: 1,
    movieId: 101,
    title: 'Dune: Part Two',
    year: 2024,
    posterUrl: 'https://example.com/poster1.jpg',
    status: 'missing',
    monitored: true,
    cinemaDate: '2024-03-01',
    digitalRelease: '2024-05-14',
    physicalRelease: '2024-06-18',
    qualityProfileId: 1,
    qualityProfileName: 'HD-1080p',
    runtime: 166,
  },
  {
    id: 2,
    movieId: 102,
    title: 'Godzilla x Kong: The New Empire',
    year: 2024,
    posterUrl: 'https://example.com/poster2.jpg',
    status: 'missing',
    monitored: true,
    cinemaDate: '2024-03-29',
    digitalRelease: '2024-05-14',
    physicalRelease: '2024-06-11',
    qualityProfileId: 1,
    qualityProfileName: 'HD-1080p',
    runtime: 115,
  },
];

describe('MovieMissingTab', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    mockOnSearchMovie.mockClear();
    mockOnBulkSearch.mockClear();
    mockPush.mockClear();

    mockedGetApiClients.mockReturnValue({
      wantedApi: {
        listMissingMovies: vi.fn().mockResolvedValue({
          items: mockMissingMovies,
          meta: { page: 1, pageSize: 25, totalCount: 2, totalPages: 1 },
        }),
      },
      movieApi: {
        update: vi.fn().mockResolvedValue({ id: 1, title: 'Dune: Part Two', year: 2024, monitored: false, qualityProfileId: 1, added: '2024-01-01' }),
        remove: vi.fn().mockResolvedValue({ id: 1 }),
      },
    } as unknown as ReturnType<typeof getApiClients>);

    mockedUseApiQuery.mockReturnValue({
      data: {
        items: mockMissingMovies,
        meta: { page: 1, pageSize: 25, totalCount: 2, totalPages: 1 },
      },
      isPending: false,
      isError: false,
      error: null,
      isResolvedEmpty: false,
      isFetching: false,
      isLoading: false,
      isSuccess: true,
      dataUpdatedAt: Date.now(),
      fetchStatus: 'idle',
      refetch: vi.fn(),
      cancel: vi.fn(),
      reset: vi.fn(),
    } as any);
  });

  it('renders missing movies table', () => {
    renderComponent(queryClient);

    expect(screen.getByText('Missing Movies')).toBeInTheDocument();
    expect(screen.getByText('Monitored movies that are not yet downloaded.')).toBeInTheDocument();
  });

  it('renders movie data including posters and titles', () => {
    renderComponent(queryClient);

    expect(screen.getByText('Dune: Part Two')).toBeInTheDocument();
    expect(screen.getAllByText('2024')).toHaveLength(2);
    expect(screen.getByText('Godzilla x Kong: The New Empire')).toBeInTheDocument();
  });

  it('shows release dates for movies', () => {
    renderComponent(queryClient);

    expect(screen.getAllByText(/Cinema:/i)).toHaveLength(2);
    expect(screen.getAllByText(/Digital:/i)).toHaveLength(2);
    expect(screen.getAllByText(/Physical:/i)).toHaveLength(2);
  });

  it('shows quality profile information', () => {
    renderComponent(queryClient);

    expect(screen.getAllByText('HD-1080p')).toHaveLength(2);
  });

  it('shows runtime information', () => {
    renderComponent(queryClient);

    expect(screen.getByText('166 min')).toBeInTheDocument();
    expect(screen.getByText('115 min')).toBeInTheDocument();
  });

  it('calls onSearchMovie when Search button is clicked', () => {
    renderComponent(queryClient);

    const searchButtons = screen.getAllByRole('button', { name: 'Search' });
    expect(searchButtons.length).toBeGreaterThan(0);

    fireEvent.click(searchButtons[0]);
    expect(mockOnSearchMovie).toHaveBeenCalledTimes(1);
  });

  it('shows bulk search button when items are selected', () => {
    renderComponent(queryClient);

    // Initially no bulk search button
    expect(screen.queryByText(/Search \d+ selected/i)).not.toBeInTheDocument();

    // Select first checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);

    fireEvent.click(checkboxes[0]);

    // Should show bulk search button
    expect(screen.getByRole('button', { name: /Search 1 selected/i })).toBeInTheDocument();
  });

  it('calls onBulkSearch when bulk search button is clicked', () => {
    renderComponent(queryClient);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    const bulkSearchButton = screen.getByRole('button', { name: /Search 2 selected/i });
    expect(bulkSearchButton).toBeInTheDocument();

    fireEvent.click(bulkSearchButton);

    expect(mockOnBulkSearch).toHaveBeenCalledTimes(1);
  });

  it('shows monitored status for movies', () => {
    renderComponent(queryClient);

    expect(screen.getAllByText('Monitored').length).toBeGreaterThan(0);
  });

  it('navigates to movie detail page when Edit button is clicked', () => {
    renderComponent(queryClient);

    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    expect(editButtons.length).toBeGreaterThan(0);

    fireEvent.click(editButtons[0]);

    expect(mockPush).toHaveBeenCalledWith('/library/movies/101');
  });

  it('shows delete confirmation modal when Delete button is clicked', () => {
    renderComponent(queryClient);

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    expect(deleteButtons.length).toBeGreaterThan(0);

    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Delete Movie')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
    expect(screen.getByText('Dune: Part Two (2024)')).toBeInTheDocument();
  });

  it('closes delete confirmation modal when Cancel is clicked', () => {
    renderComponent(queryClient);

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Delete Movie')).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(screen.queryByText('Delete Movie')).not.toBeInTheDocument();
  });
});
