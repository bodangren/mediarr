import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StatsPage } from './StatsPage';

const mockStats = {
  library: { totalMovies: 100, totalSeries: 20, totalEpisodes: 500, monitoredMovies: 90, monitoredSeries: 18, monitoredEpisodes: 480 },
  files: { totalFiles: 320, totalSizeBytes: 1_500_000_000_000, movieFiles: 100, movieSizeBytes: 800_000_000_000, episodeFiles: 220, episodeSizeBytes: 700_000_000_000 },
  quality: {
    movies: { uhd4k: 20, hd1080p: 60, hd720p: 15, sd: 5, unknown: 0 },
    episodes: { uhd4k: 5, hd1080p: 150, hd720p: 60, sd: 5, unknown: 0 },
  },
  missing: { movies: 10, episodes: 20 },
  activity: { downloadsThisWeek: 5, downloadsThisMonth: 15, searchesThisWeek: 30, subtitlesThisWeek: 8 },
};

const mockGetStats = vi.fn();

vi.mock('@/lib/api/client', () => ({
  getApiClients: () => ({
    statsApi: { getStats: mockGetStats },
  }),
}));

vi.mock('@/lib/format', () => ({
  formatBytes: (bytes: number) => `${Math.round(bytes / 1e9)}GB`,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <StatsPage />
    </MemoryRouter>,
  );
}

describe('StatsPage', () => {
  beforeEach(() => {
    mockGetStats.mockResolvedValue(mockStats);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    renderPage();
    expect(screen.getByText('Loading statistics\u2026')).toBeInTheDocument();
  });

  it('renders library counts after load', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('100')).toBeInTheDocument());
    expect(screen.getByText('Movies')).toBeInTheDocument();
    expect(screen.getAllByText('20').length).toBeGreaterThan(0);
    expect(screen.getByText('TV Shows')).toBeInTheDocument();
  });

  it('renders missing media section', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Missing Movies')).toBeInTheDocument());
    expect(screen.getByText('Missing Episodes')).toBeInTheDocument();
  });

  it('renders activity metrics', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Downloads (7d)')).toBeInTheDocument());
    expect(screen.getByText('Downloads (30d)')).toBeInTheDocument();
    expect(screen.getByText('Searches (7d)')).toBeInTheDocument();
  });

  it('shows error state on API failure', async () => {
    mockGetStats.mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });

  it('renders quality distribution section', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Movie Quality')).toBeInTheDocument());
    expect(screen.getByText('Episode Quality')).toBeInTheDocument();
  });
});
