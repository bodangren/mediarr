/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WantedPage } from './WantedPage';
import { getApiClients } from '@/lib/api/client';
import { BrowserRouter } from 'react-router-dom';

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

const mockMovies = [
  {
    id: 1,
    movieId: 101,
    title: 'Dune: Part Two',
    year: 2024,
    posterUrl: 'https://example.com/poster1.jpg',
    status: 'released' as const,
    monitored: true,
    cinemaDate: '2024-03-01',
    digitalRelease: '2024-05-14',
    physicalRelease: '2024-06-18',
    qualityProfileId: 1,
    qualityProfileName: 'HD-1080p',
    runtime: 166,
    certification: 'PG-13',
    genres: ['Action', 'Adventure'],
  },
  {
    id: 2,
    movieId: 102,
    title: 'Poor Things',
    year: 2023,
    posterUrl: undefined,
    status: 'missing' as const,
    monitored: false,
    qualityProfileId: 2,
    qualityProfileName: '4K',
    runtime: 141,
    certification: 'R',
    genres: ['Comedy', 'Drama'],
  },
];

const mockEpisodes = [
  {
    id: 10,
    seriesId: 1001,
    seriesTitle: 'Severance',
    seasonNumber: 2,
    episodeNumber: 1,
    episodeTitle: 'Hello, Ms. Cobel',
    airDate: '2025-01-17',
    status: 'missing' as const,
    monitored: true,
  },
  {
    id: 11,
    seriesId: 1001,
    seriesTitle: 'Severance',
    seasonNumber: 2,
    episodeNumber: 2,
    episodeTitle: 'Goodbye, Mrs. Selvig',
    airDate: '2025-01-24',
    status: 'unaired' as const,
    monitored: false,
  },
];

describe('WantedPage', () => {
  let mockApi: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = {
      wantedApi: {
        listMissingMovies: vi.fn().mockResolvedValue({
          items: mockMovies,
          meta: { page: 1, pageSize: 25, totalCount: 2, totalPages: 1 },
        }),
      },
      mediaApi: {
        listMissingEpisodes: vi.fn().mockResolvedValue({
          items: mockEpisodes,
          meta: { page: 1, pageSize: 25, totalCount: 2, totalPages: 1 },
        }),
        triggerAutoSearch: vi.fn().mockResolvedValue({ success: true }),
        setMovieMonitored: vi.fn().mockResolvedValue({ id: 101, monitored: false }),
        setEpisodeMonitored: vi.fn().mockResolvedValue({ id: 10, monitored: false }),
      },
    };
    (getApiClients as any).mockReturnValue(mockApi);
  });

  const renderPage = () =>
    render(
      <BrowserRouter>
        <WantedPage />
      </BrowserRouter>,
    );

  it('renders tabs for Movies and Episodes', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Movies' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Episodes' })).toBeInTheDocument();
  });

  it('loads and displays missing movies on mount', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Dune: Part Two')).toBeInTheDocument();
      expect(screen.getByText('Poor Things')).toBeInTheDocument();
    });

    expect(mockApi.wantedApi.listMissingMovies).toHaveBeenCalledWith({ page: 1, pageSize: 25 });
  });

  it('shows loading state while fetching movies', () => {
    mockApi.wantedApi.listMissingMovies.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows empty state when no missing movies', async () => {
    mockApi.wantedApi.listMissingMovies.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 25, totalCount: 0, totalPages: 0 },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('No missing movies')).toBeInTheDocument();
    });
  });

  it('shows error state when movies API fails', async () => {
    mockApi.wantedApi.listMissingMovies.mockRejectedValue(new Error('Network error'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('switches to Episodes tab and loads episodes', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('Dune: Part Two'));

    await user.click(screen.getByRole('button', { name: 'Episodes' }));

    // Wait for episodes table header to confirm tab switch
    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: 'Series' })).toBeInTheDocument();
    });

    // Use getAllByText because multiple episodes share the same series title
    await waitFor(() => {
      expect(screen.getAllByText('Severance').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText('S2E1 - Hello, Ms. Cobel')).toBeInTheDocument();
    expect(screen.getByText('S2E2 - Goodbye, Mrs. Selvig')).toBeInTheDocument();

    expect(mockApi.mediaApi.listMissingEpisodes).toHaveBeenCalledWith({ page: 1, pageSize: 25 });
  });

  it('shows empty state when no missing episodes', async () => {
    const user = userEvent.setup();
    mockApi.mediaApi.listMissingEpisodes.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 25, totalCount: 0, totalPages: 0 },
    });
    renderPage();

    await waitFor(() => screen.getByText('Dune: Part Two'));
    await user.click(screen.getByRole('button', { name: 'Episodes' }));

    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: 'Series' })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('No missing episodes')).toBeInTheDocument();
    });
  });

  it('calls triggerAutoSearch when movie Search button is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('Dune: Part Two'));

    const row = screen.getByText('Dune: Part Two').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(mockApi.mediaApi.triggerAutoSearch).toHaveBeenCalledWith(101, 'movie');
    });
  });

  it('calls triggerAutoSearch when episode Search button is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('Dune: Part Two'));
    await user.click(screen.getByRole('button', { name: 'Episodes' }));

    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: 'Series' })).toBeInTheDocument();
    });

    const row = screen.getAllByText('Severance')[0].closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(mockApi.mediaApi.triggerAutoSearch).toHaveBeenCalledWith(10, 'episode');
    });
  });

  it('calls setMovieMonitored when monitored toggle is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('Dune: Part Two'));

    const row = screen.getByText('Dune: Part Two').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'Monitored' }));

    await waitFor(() => {
      expect(mockApi.mediaApi.setMovieMonitored).toHaveBeenCalledWith(101, false);
    });
  });

  it('paginates movies', async () => {
    const user = userEvent.setup();
    mockApi.wantedApi.listMissingMovies.mockResolvedValue({
      items: mockMovies,
      meta: { page: 1, pageSize: 25, totalCount: 60, totalPages: 3 },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(mockApi.wantedApi.listMissingMovies).toHaveBeenLastCalledWith({ page: 2, pageSize: 25 });
    });
  });

  it('paginates episodes', async () => {
    const user = userEvent.setup();
    mockApi.mediaApi.listMissingEpisodes.mockResolvedValue({
      items: mockEpisodes,
      meta: { page: 1, pageSize: 25, totalCount: 50, totalPages: 2 },
    });
    renderPage();

    await waitFor(() => screen.getByText('Dune: Part Two'));
    await user.click(screen.getByRole('button', { name: 'Episodes' }));

    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: 'Series' })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(mockApi.mediaApi.listMissingEpisodes).toHaveBeenLastCalledWith({ page: 2, pageSize: 25 });
    });
  });

  it('disables Previous button on first page', async () => {
    mockApi.wantedApi.listMissingMovies.mockResolvedValue({
      items: mockMovies,
      meta: { page: 1, pageSize: 25, totalCount: 60, totalPages: 3 },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled();
  });

  it('disables Next button on last page', async () => {
    const user = userEvent.setup();
    mockApi.wantedApi.listMissingMovies.mockResolvedValue({
      items: mockMovies,
      meta: { page: 1, pageSize: 25, totalCount: 60, totalPages: 3 },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
    });

    // Navigate to page 2
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
    });

    // Navigate to page 3 (last page)
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => {
      expect(screen.getByText(/Page 3 of 3/)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Previous' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('resets to page 1 when switching tabs', async () => {
    const user = userEvent.setup();
    mockApi.wantedApi.listMissingMovies.mockResolvedValue({
      items: mockMovies,
      meta: { page: 1, pageSize: 25, totalCount: 60, totalPages: 3 },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(mockApi.wantedApi.listMissingMovies).toHaveBeenLastCalledWith({ page: 2, pageSize: 25 });
    });

    await user.click(screen.getByRole('button', { name: 'Episodes' }));

    await waitFor(() => {
      expect(mockApi.mediaApi.listMissingEpisodes).toHaveBeenLastCalledWith({ page: 1, pageSize: 25 });
    });
  });
});
