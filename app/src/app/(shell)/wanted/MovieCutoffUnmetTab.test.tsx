import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MovieCutoffUnmetTab } from './MovieCutoffUnmetTab';
import type { CutoffUnmetMovie } from '@/types/wanted';

const mockOnSearchMovie = vi.fn();
const mockOnBulkSearch = vi.fn();
const mockPush = vi.fn();

// Mock the router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({
    wantedApi: {
      listCutoffUnmetMovies: vi.fn(() =>
        Promise.resolve({
          items: [
            {
              id: 1,
              movieId: 201,
              title: 'The Matrix',
              year: 1999,
              posterUrl: 'https://image.tmdb.org/t/p/w200/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
              monitored: true,
              currentQuality: 'Bluray-720p',
              cutoffQuality: 'Bluray-1080p',
              qualityProfileId: 1,
              qualityProfileName: 'HD-1080p',
              fileId: 1001,
              filePath: '/movies/The Matrix (1999)/The.Matrix.1999.720p.BluRay.x264.mkv',
              fileSize: 4_500_000_000,
            },
            {
              id: 2,
              movieId: 202,
              title: 'Pulp Fiction',
              year: 1994,
              posterUrl: 'https://image.tmdb.org/t/p/w200/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
              monitored: true,
              currentQuality: 'DVD',
              cutoffQuality: 'Bluray-1080p',
              qualityProfileId: 1,
              qualityProfileName: 'HD-1080p',
              fileId: 1002,
              filePath: '/movies/Pulp Fiction (1994)/Pulp.Fiction.1994.DVD.x264.mkv',
              fileSize: 2_100_000_000,
            },
            {
              id: 3,
              movieId: 203,
              title: 'The Dark Knight',
              year: 2008,
              posterUrl: 'https://image.tmdb.org/t/p/w200/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
              monitored: true,
              currentQuality: 'Bluray-1080p',
              cutoffQuality: 'Bluray-2160p',
              qualityProfileId: 2,
              qualityProfileName: 'UHD-2160p',
              fileId: 1003,
              filePath: '/movies/The Dark Knight (2008)/The.Dark.Knight.2008.1080p.BluRay.x264.mkv',
              fileSize: 8_700_000_000,
            },
            {
              id: 4,
              movieId: 204,
              title: 'Inception',
              year: 2010,
              posterUrl: 'https://image.tmdb.org/t/p/w200/9gk7admal4zl67YrxIo2AO08qX8.jpg',
              monitored: true,
              currentQuality: 'WEB-DL-1080p',
              cutoffQuality: 'Bluray-2160p',
              qualityProfileId: 2,
              qualityProfileName: 'UHD-2160p',
              fileId: 1004,
              filePath: '/movies/Inception (2010)/Inception.2010.1080p.WEB-DL.x264.mkv',
              fileSize: 6_200_000_000,
            },
            {
              id: 5,
              movieId: 205,
              title: 'Interstellar',
              year: 2014,
              posterUrl: 'https://image.tmdb.org/t/p/w200/gEU2QniL6E77AAjQtaSxQ3eF8bN.jpg',
              monitored: false,
              currentQuality: 'Bluray-720p',
              cutoffQuality: 'Bluray-1080p',
              qualityProfileId: 1,
              qualityProfileName: 'HD-1080p',
              fileId: 1005,
              filePath: '/movies/Interstellar (2014)/Interstellar.2014.720p.BluRay.x264.mkv',
              fileSize: 7_800_000_000,
            },
          ],
          meta: { page: 1, pageSize: 25, totalCount: 5, totalPages: 1 },
        }),
      ),
    },
    movieApi: {
      update: vi.fn(() => Promise.resolve({ id: 1, title: 'The Matrix', year: 1999, monitored: false, qualityProfileId: 1, added: '2024-01-01' })),
    },
  })),
}));

describe('MovieCutoffUnmetTab', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    mockOnSearchMovie.mockClear();
    mockOnBulkSearch.mockClear();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
  };

  it('renders cutoff unmet movies table', () => {
    renderWithQueryClient(
      <MovieCutoffUnmetTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    expect(screen.getByText('Cutoff Unmet Movies')).toBeInTheDocument();
    expect(screen.getByText('Movies that have files but don\'t meet the quality cutoff.')).toBeInTheDocument();
  });

  it('renders movie data including titles and years', async () => {
    renderWithQueryClient(
      <MovieCutoffUnmetTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('The Matrix')).toBeInTheDocument();
      expect(screen.getByText('1999')).toBeInTheDocument();
      expect(screen.getByText('Pulp Fiction')).toBeInTheDocument();
    });
  });

  it('shows quality comparison for movies', async () => {
    renderWithQueryClient(
      <MovieCutoffUnmetTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Bluray-720p')).toHaveLength(2);
      expect(screen.getAllByText('Bluray-1080p')).toHaveLength(4);
      expect(screen.getAllByText('Bluray-2160p')).toHaveLength(2);
    });
  });

  it('shows quality profile information', async () => {
    renderWithQueryClient(
      <MovieCutoffUnmetTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText('HD-1080p')).toHaveLength(3);
      expect(screen.getAllByText('UHD-2160p')).toHaveLength(2);
    });
  });

  it('shows file size information', async () => {
    renderWithQueryClient(
      <MovieCutoffUnmetTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/4\.2 GB/i)).toBeInTheDocument();
      expect(screen.getByText(/2 GB/i)).toBeInTheDocument();
      expect(screen.getByText(/8\.1 GB/i)).toBeInTheDocument();
    });
  });

  it('calls onSearchMovie when Search button is clicked', async () => {
    renderWithQueryClient(
      <MovieCutoffUnmetTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    await waitFor(() => {
      const searchButtons = screen.getAllByRole('button', { name: 'Search' });
      expect(searchButtons.length).toBeGreaterThan(0);
    });

    const searchButtons = screen.getAllByRole('button', { name: 'Search' });
    fireEvent.click(searchButtons[0]);

    await waitFor(() => {
      expect(mockOnSearchMovie).toHaveBeenCalledTimes(1);
    });
  });

  it('shows bulk search button when items are selected', async () => {
    renderWithQueryClient(
      <MovieCutoffUnmetTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    // Initially no bulk search button
    expect(screen.queryByText(/Search for upgrades \(\d+\)/i)).not.toBeInTheDocument();

    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
      fireEvent.click(checkboxes[0]);
    });

    // Should show bulk search button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Search for upgrades \(1\)/i })).toBeInTheDocument();
    });
  });

  it('calls onBulkSearch when bulk search button is clicked', async () => {
    renderWithQueryClient(
      <MovieCutoffUnmetTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
    });

    const bulkSearchButton = await screen.findByRole('button', { name: /Search for upgrades \(2\)/i });
    expect(bulkSearchButton).toBeInTheDocument();

    fireEvent.click(bulkSearchButton);

    await waitFor(() => {
      expect(mockOnBulkSearch).toHaveBeenCalledTimes(1);
    });
  });

  it('shows monitored status for movies', async () => {
    renderWithQueryClient(
      <MovieCutoffUnmetTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Monitored').length).toBeGreaterThan(0);
      expect(screen.getByText('Unmonitored')).toBeInTheDocument();
    });
  });

  it('navigates to movie detail page when Edit button is clicked', async () => {
    renderWithQueryClient(
      <MovieCutoffUnmetTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    await waitFor(() => {
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      expect(editButtons.length).toBeGreaterThan(0);
    });

    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    fireEvent.click(editButtons[0]);

    expect(mockPush).toHaveBeenCalledWith('/library/movies/201');
  });
});
