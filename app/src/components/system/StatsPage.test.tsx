import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { StatsPage } from './StatsPage';

const mockLibraryStats = {
  library: { totalMovies: 100, totalSeries: 20, totalEpisodes: 500, monitoredMovies: 90, monitoredSeries: 18, monitoredEpisodes: 480 },
  files: { totalFiles: 320, totalSizeBytes: 1_500_000_000_000, movieFiles: 100, movieSizeBytes: 800_000_000_000, episodeFiles: 220, episodeSizeBytes: 700_000_000_000 },
  quality: {
    movies: { uhd4k: 20, hd1080p: 60, hd720p: 15, sd: 5, unknown: 0 },
    episodes: { uhd4k: 5, hd1080p: 150, hd720p: 60, sd: 5, unknown: 0 },
  },
  missing: { movies: 10, episodes: 20 },
  activity: { downloadsThisWeek: 5, downloadsThisMonth: 15, searchesThisWeek: 30, subtitlesThisWeek: 8 },
};

const mockDownloadStats = {
  totalTorrents: 50,
  activeDownloads: 5,
  completedDownloads: 40,
  failedDownloads: 5,
  totalDownloadedBytes: 100_000_000_000,
  totalUploadedBytes: 50_000_000_000,
  averageDownloadSpeed: 1_000_000,
};

const mockSystemStats = {
  dbSizeBytes: 50_000_000,
  uptimeSeconds: 86400,
  diskSpace: [
    { path: '/movies', freeBytes: 500_000_000_000, totalBytes: 1_000_000_000_000, usedPercent: 50 },
  ],
};

const mockGetStats = vi.fn();
const mockGetDownloadStats = vi.fn();
const mockGetSystemStats = vi.fn();

vi.mock('@/lib/api/client', () => ({
  getApiClients: () => ({
    statsApi: {
      getStats: mockGetStats,
      getDownloadStats: mockGetDownloadStats,
      getSystemStats: mockGetSystemStats,
    },
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
    mockGetStats.mockResolvedValue(mockLibraryStats);
    mockGetDownloadStats.mockResolvedValue(mockDownloadStats);
    mockGetSystemStats.mockResolvedValue(mockSystemStats);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    renderPage();
    expect(screen.getByText('Loading statistics…')).toBeInTheDocument();
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

  it('renders download statistics section', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Download Statistics')).toBeInTheDocument());
    expect(screen.getByText('Total Torrents')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders system health section', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('System Health')).toBeInTheDocument());
    expect(screen.getByText('Uptime')).toBeInTheDocument();
    expect(screen.getByText('DB Size')).toBeInTheDocument();
  });

  it('shows export button when data is loaded', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Export')).toBeInTheDocument());
  });

  it('opens export dropdown when clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText('Export')).toBeInTheDocument());
    
    await user.click(screen.getByText('Export'));
    expect(screen.getByText('Export as JSON')).toBeInTheDocument();
    expect(screen.getByText('Export as CSV')).toBeInTheDocument();
  });

  it('handles partial API failures gracefully', async () => {
    mockGetStats.mockResolvedValue(mockLibraryStats);
    mockGetDownloadStats.mockRejectedValue(new Error('Download API error'));
    mockGetSystemStats.mockRejectedValue(new Error('System API error'));
    
    renderPage();
    await waitFor(() => expect(screen.getByText('Library Overview')).toBeInTheDocument());
    
    // Library stats should still render
    expect(screen.getByText('Movies')).toBeInTheDocument();
    
    // Download and system sections should not appear
    expect(screen.queryByText('Download Statistics')).not.toBeInTheDocument();
    expect(screen.queryByText('System Health')).not.toBeInTheDocument();
  });
});
