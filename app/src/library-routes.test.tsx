/**
 * Integration tests for library list and detail routes.
 * Covers: /library/movies, /library/tv, /library/tv/:id, /library/series/:id alias.
 * Verifies API wiring, rendering, monitoring toggles, delete, error states.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/providers/ToastProvider';

const mockApi = vi.hoisted(() => ({
  mediaApi: {
    listMovies: vi.fn(),
    setMovieMonitored: vi.fn(),
    deleteMovie: vi.fn(),
    listSeries: vi.fn(),
    setSeriesMonitored: vi.fn(),
    deleteSeries: vi.fn(),
  },
  movieApi: {
    getById: vi.fn(),
    getRootFolders: vi.fn(),
    searchReleases: vi.fn(),
    getTmdbCollection: vi.fn().mockResolvedValue({ collection: null }),
  },
  seriesApi: {
    getSeriesWithEpisodes: vi.fn(),
    getRootFolders: vi.fn(),
    searchReleases: vi.fn(),
  },
  releaseApi: { grabRelease: vi.fn() },
  indexerApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  downloadClientApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  qualityProfileApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  customFormatApi: { list: vi.fn(), create: vi.fn(), delete: vi.fn() },
  subtitleProvidersApi: { listProviders: vi.fn() },
  notificationsApi: { list: vi.fn() },
  settingsApi: { get: vi.fn(), update: vi.fn() },
  mediaManagementApi: { get: vi.fn(), save: vi.fn() },
}));

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => mockApi),
}));

vi.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { pathname: string; children: ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}));

vi.mock('@/components/movie/MovieInteractiveSearchModal', () => ({
  MovieInteractiveSearchModal: () => null,
}));

vi.mock('@/components/search/InteractiveSearchModal', () => ({
  InteractiveSearchModal: () => null,
}));

// Lightweight stubs that expose the item list length so we can assert API wiring
vi.mock('@/components/views', () => ({
  MovieOverviewView: ({
    items,
    onToggleMonitored,
    onDelete,
  }: {
    items: Array<{ id: number; title: string }>;
    isLoading?: boolean;
    onToggleMonitored?: (id: number, monitored: boolean) => void;
    onDelete?: (id: number) => void;
    onSearch?: (id: number) => void;
  }) => (
    <div>
      <span data-testid="movie-count">Movies View {items.length}</span>
      {items.map(m => (
        <div key={m.id} data-testid={`movie-${m.id}`}>
          <span>{m.title}</span>
          <button onClick={() => onToggleMonitored?.(m.id, false)}>Toggle {m.id}</button>
          <button onClick={() => onDelete?.(m.id)}>Delete {m.id}</button>
        </div>
      ))}
    </div>
  ),
  SeriesOverviewView: ({
    items,
    onToggleMonitored,
    onDelete,
  }: {
    items: Array<{ id: number; title: string }>;
    onToggleMonitored?: (id: number, monitored: boolean) => void;
    onDelete?: (id: number) => void;
    onRefresh?: () => void;
  }) => (
    <div>
      <span data-testid="series-count">Series View {items.length}</span>
      {items.map(s => (
        <div key={s.id} data-testid={`series-${s.id}`}>
          <span>{s.title}</span>
          <button onClick={() => onToggleMonitored?.(s.id, false)}>Toggle {s.id}</button>
          <button onClick={() => onDelete?.(s.id)}>Delete {s.id}</button>
        </div>
      ))}
    </div>
  ),
}));

import App from './App';

const baseSettings = {
  torrentLimits: { maxActiveDownloads: 3, maxActiveSeeds: 5, globalDownloadLimitKbps: null, globalUploadLimitKbps: null },
  schedulerIntervals: { rssSyncMinutes: 15, availabilityCheckMinutes: 30, torrentMonitoringSeconds: 60 },
  pathVisibility: { showDownloadPath: false, showMediaPath: false },
  apiKeys: { tmdbApiKey: null, openSubtitlesApiKey: null },
  host: { port: 3000, bindAddress: '0.0.0.0', urlBase: null, sslPort: null, enableSsl: false, sslCertPath: null, sslKeyPath: null },
  security: { apiKey: null, authenticationMethod: 'none' as const, authenticationRequired: false },
  logging: { logLevel: 'info' as const, logSizeLimit: 20, logRetentionDays: 7 },
  update: { branch: 'master' as const, autoUpdateEnabled: false, mechanicsEnabled: false, updateScriptPath: null },
};

function renderApp(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </MemoryRouter>,
  );
}

const mockMovies = [
  { id: 1, title: 'The Matrix', year: 1999, monitored: true },
  { id: 2, title: 'Inception', year: 2010, monitored: false },
];

const mockSeries = [
  { id: 10, title: 'Breaking Bad', year: 2008, monitored: true },
  { id: 11, title: 'The Wire', year: 2002, monitored: true },
];

describe('Library list and detail route integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockApi.mediaApi.listMovies.mockResolvedValue({
      items: mockMovies,
      meta: { page: 1, pageSize: 200, totalCount: 2, totalPages: 1 },
    });
    mockApi.mediaApi.listSeries.mockResolvedValue({
      items: mockSeries,
      meta: { page: 1, pageSize: 200, totalCount: 2, totalPages: 1 },
    });
    mockApi.mediaApi.setMovieMonitored.mockResolvedValue(mockMovies[0]);
    mockApi.mediaApi.deleteMovie.mockResolvedValue({ deleted: true, id: 1 });
    mockApi.mediaApi.setSeriesMonitored.mockResolvedValue(mockSeries[0]);
    mockApi.mediaApi.deleteSeries.mockResolvedValue({ deleted: true, id: 10 });
    mockApi.movieApi.getById.mockResolvedValue({
      id: 7, title: 'Test Movie', year: 2024, monitored: true,
      qualityProfileId: 1, added: '2026-02-27T00:00:00.000Z',
      status: 'released', overview: 'Movie overview', tmdbId: 100, imdbId: 'tt0123456',
    });
    mockApi.seriesApi.getSeriesWithEpisodes.mockResolvedValue({
      id: 42, title: 'Test Series', tvdbId: 12345,
      seasons: [{ id: 1, seasonNumber: 1, episodes: [{ id: 1001, episodeNumber: 1, title: 'Pilot' }] }],
    });
    mockApi.indexerApi.list.mockResolvedValue([]);
    mockApi.downloadClientApi.list.mockResolvedValue([]);
    mockApi.notificationsApi.list.mockResolvedValue([]);
    mockApi.qualityProfileApi.list.mockResolvedValue([]);
    mockApi.customFormatApi.list.mockResolvedValue([]);
    mockApi.subtitleProvidersApi.listProviders.mockResolvedValue([]);
    mockApi.settingsApi.get.mockResolvedValue(baseSettings);
    mockApi.mediaManagementApi.get.mockResolvedValue({ movieRootFolder: '/movies', tvRootFolder: '/tv' });
  });

  // ── Movie list (/library/movies) ────────────────────────────────────────────

  describe('/library/movies', () => {
    it('calls listMovies with correct pagination params', async () => {
      renderApp('/library/movies');

      await waitFor(() => {
        expect(mockApi.mediaApi.listMovies).toHaveBeenCalledWith({ page: 1, pageSize: 10000 });
      });
    });

    it('renders the Movies page title', async () => {
      renderApp('/library/movies');

      expect(await screen.findByText('Movies')).toBeInTheDocument();
    });

    it('passes fetched movies to the view component', async () => {
      renderApp('/library/movies');

      const count = await screen.findByTestId('movie-count');
      expect(count).toHaveTextContent('Movies View 2');
      expect(screen.getByText('The Matrix')).toBeInTheDocument();
      expect(screen.getByText('Inception')).toBeInTheDocument();
    });

    it('shows empty list when API returns no movies', async () => {
      mockApi.mediaApi.listMovies.mockResolvedValue({
        items: [],
        meta: { page: 1, pageSize: 200, totalCount: 0, totalPages: 0 },
      });

      renderApp('/library/movies');

      const count = await screen.findByTestId('movie-count');
      expect(count).toHaveTextContent('Movies View 0');
    });

    it('shows error message when listMovies API fails', async () => {
      mockApi.mediaApi.listMovies.mockRejectedValue(new Error('Network error'));

      renderApp('/library/movies');

      expect(await screen.findByText('Network error')).toBeInTheDocument();
    });

    it('calls setMovieMonitored when monitoring is toggled', async () => {
      renderApp('/library/movies');

      await screen.findByTestId('movie-1');
      fireEvent.click(screen.getByRole('button', { name: 'Toggle 1' }));

      await waitFor(() => {
        expect(mockApi.mediaApi.setMovieMonitored).toHaveBeenCalledWith(1, false);
      });
    });

    it('reloads movies after monitoring toggle', async () => {
      mockApi.mediaApi.setMovieMonitored.mockResolvedValue(mockMovies[0]);

      renderApp('/library/movies');

      await screen.findByTestId('movie-1');
      fireEvent.click(screen.getByRole('button', { name: 'Toggle 1' }));

      await waitFor(() => {
        expect(mockApi.mediaApi.listMovies).toHaveBeenCalledTimes(2);
      });
    });

    it('calls deleteMovie when delete is triggered', async () => {
      window.confirm = vi.fn(() => true);
      renderApp('/library/movies');

      await screen.findByTestId('movie-1');
      fireEvent.click(screen.getByRole('button', { name: 'Delete 1' }));

      await waitFor(() => {
        expect(mockApi.mediaApi.deleteMovie).toHaveBeenCalledWith(1, true);
      });
    });

    it('reloads movies after delete', async () => {
      window.confirm = vi.fn(() => true);
      renderApp('/library/movies');

      await screen.findByTestId('movie-1');
      fireEvent.click(screen.getByRole('button', { name: 'Delete 1' }));

      await waitFor(() => {
        expect(mockApi.mediaApi.listMovies).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ── Series list (/library/tv) ───────────────────────────────────────────────

  describe('/library/tv', () => {
    it('calls listSeries with correct pagination params', async () => {
      renderApp('/library/tv');

      await waitFor(() => {
        expect(mockApi.mediaApi.listSeries).toHaveBeenCalledWith({ page: 1, pageSize: 10000 });
      });
    });

    it('renders the TV Shows page title', async () => {
      renderApp('/library/tv');

      expect(await screen.findByText('TV Shows')).toBeInTheDocument();
    });

    it('passes fetched series to the view component', async () => {
      renderApp('/library/tv');

      const count = await screen.findByTestId('series-count');
      expect(count).toHaveTextContent('Series View 2');
      expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
      expect(screen.getByText('The Wire')).toBeInTheDocument();
    });

    it('shows empty list when API returns no series', async () => {
      mockApi.mediaApi.listSeries.mockResolvedValue({
        items: [],
        meta: { page: 1, pageSize: 200, totalCount: 0, totalPages: 0 },
      });

      renderApp('/library/tv');

      const count = await screen.findByTestId('series-count');
      expect(count).toHaveTextContent('Series View 0');
    });

    it('shows error message when listSeries API fails', async () => {
      mockApi.mediaApi.listSeries.mockRejectedValue(new Error('Connection refused'));

      renderApp('/library/tv');

      expect(await screen.findByText('Connection refused')).toBeInTheDocument();
    });

    it('calls setSeriesMonitored when monitoring is toggled', async () => {
      renderApp('/library/tv');

      await screen.findByTestId('series-10');
      fireEvent.click(screen.getByRole('button', { name: 'Toggle 10' }));

      await waitFor(() => {
        expect(mockApi.mediaApi.setSeriesMonitored).toHaveBeenCalledWith(10, false);
      });
    });

    it('reloads series after monitoring toggle', async () => {
      renderApp('/library/tv');

      await screen.findByTestId('series-10');
      fireEvent.click(screen.getByRole('button', { name: 'Toggle 10' }));

      await waitFor(() => {
        expect(mockApi.mediaApi.listSeries).toHaveBeenCalledTimes(2);
      });
    });

    it('calls deleteSeries when delete is triggered', async () => {
      window.confirm = vi.fn(() => true);
      renderApp('/library/tv');

      await screen.findByTestId('series-10');
      fireEvent.click(screen.getByRole('button', { name: 'Delete 10' }));

      await waitFor(() => {
        expect(mockApi.mediaApi.deleteSeries).toHaveBeenCalledWith(10, true);
      });
    });

    it('reloads series after delete', async () => {
      window.confirm = vi.fn(() => true);
      renderApp('/library/tv');

      await screen.findByTestId('series-10');
      fireEvent.click(screen.getByRole('button', { name: 'Delete 10' }));

      await waitFor(() => {
        expect(mockApi.mediaApi.listSeries).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ── Movie detail (/library/movies/:id) ─────────────────────────────────────

  describe('/library/movies/:id', () => {
    it('fetches movie by numeric id from route param', async () => {
      renderApp('/library/movies/7');

      await waitFor(() => {
        expect(mockApi.movieApi.getById).toHaveBeenCalledWith(7);
      });
    });

    it('renders Movie Details title and movie data', async () => {
      renderApp('/library/movies/7');

      expect(await screen.findByText('Movie Details')).toBeInTheDocument();
      expect(await screen.findByText('Test Movie')).toBeInTheDocument();
    });

    it('shows year, status and monitored state', async () => {
      renderApp('/library/movies/7');

      expect(await screen.findByText('2024')).toBeInTheDocument();
      expect(screen.getByText(/released/i)).toBeInTheDocument();
      // The monitored state is indicated by the checkbox being checked
      const toggle = screen.getByRole('checkbox', { name: /Monitored/i });
      expect(toggle).toBeChecked();
    });

    it('shows movie overview text', async () => {
      renderApp('/library/movies/7');

      expect(await screen.findByText('Movie overview')).toBeInTheDocument();
    });

    it('shows error when getById API fails', async () => {
      mockApi.movieApi.getById.mockRejectedValue(new Error('Movie not found'));

      renderApp('/library/movies/7');

      expect(await screen.findByText('Movie not found')).toBeInTheDocument();
    });

    it('shows error for a non-numeric route id', async () => {
      renderApp('/library/movies/not-a-number');

      expect(await screen.findByText('Invalid movie id')).toBeInTheDocument();
      expect(mockApi.movieApi.getById).not.toHaveBeenCalled();
    });

    it('renders Interactive Search button when movie is loaded', async () => {
      renderApp('/library/movies/7');

      expect(await screen.findByRole('button', { name: 'Interactive Search' })).toBeInTheDocument();
    });
  });

  // ── Series detail (/library/tv/:id) ────────────────────────────────────────

  describe('/library/tv/:id', () => {
    it('fetches series by numeric id from route param', async () => {
      renderApp('/library/tv/42');

      await waitFor(() => {
        expect(mockApi.seriesApi.getSeriesWithEpisodes).toHaveBeenCalledWith(42);
      });
    });

    it('renders Series Details title and series data', async () => {
      renderApp('/library/tv/42');

      expect(await screen.findByText('Series Details')).toBeInTheDocument();
      expect(await screen.findByText('Test Series')).toBeInTheDocument();
    });

    it('shows season and episode counts', async () => {
      renderApp('/library/tv/42');

      expect(await screen.findByText(/Season 1/)).toBeInTheDocument();
      expect(screen.getByText(/1 episodes/i)).toBeInTheDocument();
    });

    it('shows error when getSeriesWithEpisodes API fails', async () => {
      mockApi.seriesApi.getSeriesWithEpisodes.mockRejectedValue(new Error('Series not found'));

      renderApp('/library/tv/42');

      expect(await screen.findByText('Series not found')).toBeInTheDocument();
    });

    it('shows error for a non-numeric route id', async () => {
      renderApp('/library/tv/bad-id');

      expect(await screen.findByText('Invalid series id')).toBeInTheDocument();
      expect(mockApi.seriesApi.getSeriesWithEpisodes).not.toHaveBeenCalled();
    });

    it('renders Interactive Search button when series is loaded', async () => {
      renderApp('/library/tv/42');

      expect(await screen.findByRole('button', { name: 'Search' })).toBeInTheDocument();
    });
  });

  // ── Legacy route alias (/library/series/:id → /library/tv/:id) ─────────────

  describe('/library/series/:id alias', () => {
    it('fetches series by id via the legacy /library/series/:id alias', async () => {
      renderApp('/library/series/42');

      await waitFor(() => {
        expect(mockApi.seriesApi.getSeriesWithEpisodes).toHaveBeenCalledWith(42);
      });
    });

    it('renders series details via legacy alias', async () => {
      renderApp('/library/series/42');

      expect(await screen.findByText('Series Details')).toBeInTheDocument();
      expect(await screen.findByText('Test Series')).toBeInTheDocument();
    });
  });
});
