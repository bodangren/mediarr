/**
 * Phase 3: Tests for movie and series detail pages.
 * Covers:
 *  - Phase 3 Task 1: navigable library cards (routes already registered; confirm they load)
 *  - Phase 3 Task 2: MovieDetailPage with poster, metadata, monitored toggle, quality profile dropdown, remove
 *  - Phase 3 Task 3: SeriesDetailPage with season list, episode list, monitored toggles, remove
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
    setSeasonMonitored: vi.fn(),
    setEpisodeMonitored: vi.fn(),
    deleteSeries: vi.fn(),
    searchMetadata: vi.fn(),
    addToWanted: vi.fn(),
  },
  movieApi: {
    getById: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    getRootFolders: vi.fn(),
    searchReleases: vi.fn(),
    getTmdbCollection: vi.fn().mockResolvedValue({ collection: null }),
  },
  seriesApi: {
    getSeriesWithEpisodes: vi.fn(),
    bulkUpdate: vi.fn(),
    getRootFolders: vi.fn(),
    searchReleases: vi.fn(),
  },
  subtitleApi: {
    listMovieVariants: vi.fn(),
    listSeriesVariants: vi.fn(),
  },
  subtitleWantedApi: {
    getWantedCount: vi.fn(),
  },
  releaseApi: {
    grabRelease: vi.fn(),
  },
  indexerApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  downloadClientApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  qualityProfileApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  customFormatApi: {
    list: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  subtitleProvidersApi: {
    listProviders: vi.fn(),
  },
  notificationsApi: {
    list: vi.fn(),
  },
  settingsApi: {
    get: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => mockApi),
}));

vi.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { pathname: string; children: ReactNode }) => <div data-testid="app-shell">{children}</div>,
}));

vi.mock('@/components/movie/MovieInteractiveSearchModal', () => ({
  MovieInteractiveSearchModal: () => null,
}));

vi.mock('@/components/search/InteractiveSearchModal', () => ({
  InteractiveSearchModal: () => null,
}));

vi.mock('@/components/series/SeriesInteractiveSearchModal', () => ({
  SeriesInteractiveSearchModal: ({ isOpen, initialLevel, initialSeason, initialEpisode, onClose }: {
    isOpen: boolean;
    initialLevel?: string;
    initialSeason?: number;
    initialEpisode?: number;
    onClose: () => void;
  }) => isOpen ? (
    <div data-testid="series-search-modal">
      <span data-testid="modal-level">{initialLevel ?? 'series'}</span>
      {initialSeason !== undefined && <span data-testid="modal-season">{initialSeason}</span>}
      {initialEpisode !== undefined && <span data-testid="modal-episode">{initialEpisode}</span>}
      <button onClick={onClose}>Close Modal</button>
    </div>
  ) : null,
}));

vi.mock('@/components/subtitles/ManualSearchModal', () => ({
  ManualSearchModal: () => null,
}));

vi.mock('@/components/views', () => ({
  MovieOverviewView: ({ items }: { items: unknown[] }) => <div>Movies View {items.length}</div>,
  SeriesOverviewView: ({ items }: { items: unknown[] }) => <div>Series View {items.length}</div>,
}));

import App from './App';

const mockMovie = {
  id: 7,
  title: 'Inception',
  year: 2010,
  monitored: true,
  qualityProfileId: 1,
  added: '2026-02-27T00:00:00.000Z',
  status: 'released',
  overview: 'A thief who steals corporate secrets.',
  tmdbId: 27205,
  imdbId: 'tt1375666',
  posterUrl: 'https://image.tmdb.org/t/p/w500/inception.jpg',
  genres: ['Action', 'Sci-Fi'],
  qualityProfile: { id: 1, name: 'HD-1080p' },
};

const mockSeries = {
  id: 42,
  title: 'Breaking Bad',
  year: 2008,
  monitored: true,
  qualityProfileId: 1,
  added: '2026-02-27T00:00:00.000Z',
  status: 'ended',
  overview: 'A high school chemistry teacher turns to manufacturing meth.',
  tvdbId: 81189,
  network: 'AMC',
  posterUrl: 'https://thetvdb.com/banners/series/81189.jpg',
  qualityProfile: { id: 1, name: 'HD-1080p' },
  seasons: [
    {
      id: 10,
      seasonNumber: 1,
      monitored: true,
      episodes: [
        { id: 1001, seasonNumber: 1, episodeNumber: 1, title: 'Pilot', airDateUtc: '2008-01-20T00:00:00Z', monitored: true },
        { id: 1002, seasonNumber: 1, episodeNumber: 2, title: 'Cat\'s in the Bag', airDateUtc: '2008-01-27T00:00:00Z', monitored: true },
      ],
    },
    {
      id: 11,
      seasonNumber: 2,
      monitored: false,
      episodes: [
        { id: 2001, seasonNumber: 2, episodeNumber: 1, title: 'Seven Thirty-Seven', airDateUtc: '2009-03-08T00:00:00Z', monitored: false },
      ],
    },
  ],
};

const qualityProfiles = [
  { id: 1, name: 'HD-1080p', cutoff: 100, items: [], languageProfileId: null },
  { id: 2, name: '4K', cutoff: 200, items: [], languageProfileId: null },
];

function renderApp(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('Phase 3 — Detail Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.mediaApi.listMovies.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
    });
    mockApi.mediaApi.listSeries.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
    });
    mockApi.movieApi.getById.mockResolvedValue(mockMovie);
    mockApi.seriesApi.getSeriesWithEpisodes.mockResolvedValue(mockSeries);
    mockApi.indexerApi.list.mockResolvedValue([]);
    mockApi.downloadClientApi.list.mockResolvedValue([]);
    mockApi.notificationsApi.list.mockResolvedValue([]);
    mockApi.qualityProfileApi.list.mockResolvedValue(qualityProfiles);
    mockApi.customFormatApi.list.mockResolvedValue([]);
    mockApi.subtitleProvidersApi.listProviders.mockResolvedValue([]);
    mockApi.subtitleApi.listMovieVariants.mockResolvedValue([]);
    mockApi.subtitleApi.listSeriesVariants.mockResolvedValue([]);
    mockApi.subtitleWantedApi.getWantedCount.mockResolvedValue({ seriesCount: 0, moviesCount: 0, totalCount: 0 });
    mockApi.settingsApi.get.mockResolvedValue({
      torrentLimits: { maxActiveDownloads: 3, maxActiveSeeds: 5, globalDownloadLimitKbps: null, globalUploadLimitKbps: null },
      schedulerIntervals: { rssSyncMinutes: 15, availabilityCheckMinutes: 30, torrentMonitoringSeconds: 60 },
      pathVisibility: { showDownloadPath: false, showMediaPath: false },
      apiKeys: { tmdbApiKey: null, openSubtitlesApiKey: null, assrtApiToken: null, subdlApiKey: null },
      wantedLanguages: [],
      host: { port: 3000, bindAddress: '0.0.0.0', urlBase: null, sslPort: null, enableSsl: false, sslCertPath: null, sslKeyPath: null },
      security: { apiKey: null, authenticationMethod: 'none', authenticationRequired: false },
      logging: { logLevel: 'info', logSizeLimit: 20, logRetentionDays: 7 },
      update: { branch: 'master', autoUpdateEnabled: false, mechanicsEnabled: false, updateScriptPath: null },
    });
  });

  // ── Phase 3 Task 1: navigable cards ──────────────────────────────────────
  describe('Navigable library cards', () => {
    it('the /library/movies/:id route loads MovieDetailPage', async () => {
      renderApp('/library/movies/7');
      await waitFor(() => {
        expect(mockApi.movieApi.getById).toHaveBeenCalledWith(7);
      });
      expect(screen.getByText('Inception')).toBeInTheDocument();
    });

    it('the /library/tv/:id route loads SeriesDetailPage', async () => {
      renderApp('/library/tv/42');
      await waitFor(() => {
        expect(mockApi.seriesApi.getSeriesWithEpisodes).toHaveBeenCalledWith(42);
      });
      expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
    });
  });

  // ── Phase 3 Task 2: Movie detail page ───────────────────────────────────
  describe('MovieDetailPage', () => {
    it('renders title, year, overview and status', async () => {
      renderApp('/library/movies/7');
      await waitFor(() => expect(screen.getByText('Inception')).toBeInTheDocument());
      expect(screen.getByText('2010')).toBeInTheDocument();
      expect(screen.getByText(/A thief who steals corporate secrets/)).toBeInTheDocument();
      expect(screen.getByText('released')).toBeInTheDocument();
    });

    it('renders poster image', async () => {
      renderApp('/library/movies/7');
      await waitFor(() => expect(screen.getByText('Inception')).toBeInTheDocument());
      const img = document.querySelector('img[alt="Inception"]') as HTMLImageElement;
      expect(img).toBeTruthy();
      expect(img.src).toContain('inception.jpg');
    });

    it('renders monitored toggle and toggles monitored state', async () => {
      mockApi.mediaApi.setMovieMonitored.mockResolvedValue({ ...mockMovie, monitored: false });
      renderApp('/library/movies/7');

      await waitFor(() => expect(screen.getByText('Inception')).toBeInTheDocument());

      const toggle = screen.getByRole('checkbox', { name: /monitored/i });
      expect(toggle).toBeChecked();
      fireEvent.click(toggle);

      await waitFor(() => {
        expect(mockApi.mediaApi.setMovieMonitored).toHaveBeenCalledWith(7, false);
      });
    });

    it('renders quality profile dropdown and updates quality profile', async () => {
      mockApi.movieApi.update.mockResolvedValue({ ...mockMovie, qualityProfileId: 2 });
      renderApp('/library/movies/7');

      await waitFor(() => expect(screen.getByText('Inception')).toBeInTheDocument());

      // The dropdown should show quality profiles
      const dropdown = screen.getByRole('combobox', { name: /quality profile/i });
      expect(dropdown).toBeInTheDocument();
      expect(dropdown).toHaveValue('1');

      fireEvent.change(dropdown, { target: { value: '2' } });

      await waitFor(() => {
        expect(mockApi.movieApi.update).toHaveBeenCalledWith(7, expect.objectContaining({ qualityProfileId: 2 }));
      });
    });

    it('shows Remove from Library button and navigates after confirming removal', async () => {
      window.confirm = vi.fn(() => true);
      mockApi.mediaApi.deleteMovie.mockResolvedValue({ deleted: true, id: 7 });
      renderApp('/library/movies/7');

      await waitFor(() => expect(screen.getByText('Inception')).toBeInTheDocument());

      const removeButton = screen.getByRole('button', { name: /remove from library/i });
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockApi.mediaApi.deleteMovie).toHaveBeenCalledWith(7, true);
      });
    });

    it('renders genres when available', async () => {
      renderApp('/library/movies/7');
      await waitFor(() => expect(screen.getByText('Inception')).toBeInTheDocument());
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
    });

    it('shows loading state while fetching', () => {
      // Don't resolve the mock - just check loading state immediately
      mockApi.movieApi.getById.mockReturnValue(new Promise(() => {}));
      renderApp('/library/movies/7');
      expect(screen.getByText(/loading movie/i)).toBeInTheDocument();
    });
  });

  // ── Phase 3 Task 3: Series detail page ──────────────────────────────────
  describe('SeriesDetailPage', () => {
    it('renders title, year, overview, network and status', async () => {
      renderApp('/library/tv/42');
      await waitFor(() => expect(screen.getByText('Breaking Bad')).toBeInTheDocument());
      expect(screen.getByText('2008')).toBeInTheDocument();
      expect(screen.getByText(/A high school chemistry teacher/)).toBeInTheDocument();
      expect(screen.getByText('AMC')).toBeInTheDocument();
      expect(screen.getByText('ended')).toBeInTheDocument();
    });

    it('renders poster image', async () => {
      renderApp('/library/tv/42');
      await waitFor(() => expect(screen.getByText('Breaking Bad')).toBeInTheDocument());
      const img = document.querySelector('img[alt="Breaking Bad"]') as HTMLImageElement;
      expect(img).toBeTruthy();
      expect(img.src).toContain('81189');
    });

    it('renders series-level monitored toggle', async () => {
      mockApi.mediaApi.setSeriesMonitored.mockResolvedValue({ ...mockSeries, monitored: false });
      renderApp('/library/tv/42');

      await waitFor(() => expect(screen.getByText('Breaking Bad')).toBeInTheDocument());

      const seriesMonitoredToggle = screen.getByRole('checkbox', { name: /series monitored/i });
      expect(seriesMonitoredToggle).toBeChecked();
      fireEvent.click(seriesMonitoredToggle);

      await waitFor(() => {
        expect(mockApi.mediaApi.setSeriesMonitored).toHaveBeenCalledWith(42, false);
      });
    });

    it('renders season list with season numbers', async () => {
      renderApp('/library/tv/42');
      await waitFor(() => expect(screen.getByText('Breaking Bad')).toBeInTheDocument());
      expect(screen.getByText(/Season 1/)).toBeInTheDocument();
      expect(screen.getByText(/Season 2/)).toBeInTheDocument();
    });

    it('renders per-season monitored toggles', async () => {
      mockApi.mediaApi.setSeasonMonitored.mockResolvedValue({ monitored: false });
      renderApp('/library/tv/42');

      await waitFor(() => expect(screen.getByText(/Season 1/)).toBeInTheDocument());

      const seasonToggle = screen.getByRole('checkbox', { name: /season 1 monitored/i });
      expect(seasonToggle).toBeChecked();
      fireEvent.click(seasonToggle);

      await waitFor(() => {
        expect(mockApi.mediaApi.setSeasonMonitored).toHaveBeenCalledWith(42, 1, false);
      });
    });

    it('shows episodes immediately without needing to expand season', async () => {
      renderApp('/library/tv/42');
      await waitFor(() => expect(screen.getByText(/Season 1/)).toBeInTheDocument());

      // Episodes should be visible initially
      expect(screen.getByText('Pilot')).toBeInTheDocument();
      expect(screen.getByText("Cat's in the Bag")).toBeInTheDocument();
    });

    it('renders per-episode monitored toggles', async () => {
      mockApi.mediaApi.setEpisodeMonitored.mockResolvedValue({ id: 1001, monitored: false });
      renderApp('/library/tv/42');

      await waitFor(() => expect(screen.getByText(/Season 1/)).toBeInTheDocument());
      await waitFor(() => expect(screen.getByText('Pilot')).toBeInTheDocument());

      const episodeToggle = screen.getByRole('checkbox', { name: /S01E01.*monitored/i });
      expect(episodeToggle).toBeChecked();
      fireEvent.click(episodeToggle);

      await waitFor(() => {
        expect(mockApi.mediaApi.setEpisodeMonitored).toHaveBeenCalledWith(1001, false);
      });
    });

    it('renders quality profile dropdown', async () => {
      renderApp('/library/tv/42');
      await waitFor(() => expect(screen.getByText('Breaking Bad')).toBeInTheDocument());

      const dropdown = screen.getByRole('combobox', { name: /quality profile/i });
      expect(dropdown).toBeInTheDocument();
      expect(dropdown).toHaveValue('1');
    });

    it('shows Remove from Library button', async () => {
      window.confirm = vi.fn(() => true);
      mockApi.mediaApi.deleteSeries.mockResolvedValue({ deleted: true, id: 42 });
      renderApp('/library/tv/42');

      await waitFor(() => expect(screen.getByText('Breaking Bad')).toBeInTheDocument());

      const removeButton = screen.getByRole('button', { name: /remove from library/i });
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockApi.mediaApi.deleteSeries).toHaveBeenCalledWith(42, true);
      });
    });

    it('shows loading state while fetching', () => {
      mockApi.seriesApi.getSeriesWithEpisodes.mockReturnValue(new Promise(() => {}));
      renderApp('/library/tv/42');
      expect(screen.getByText(/loading series/i)).toBeInTheDocument();
    });

    it('toolbar Search button renders and opens SeriesInteractiveSearchModal at Series level', async () => {
      renderApp('/library/tv/42');
      await waitFor(() => expect(screen.getByText('Breaking Bad')).toBeInTheDocument());

      expect(screen.queryByTestId('series-search-modal')).not.toBeInTheDocument();

      const searchButton = screen.getByRole('button', { name: /^search$/i });
      fireEvent.click(searchButton);

      expect(screen.getByTestId('series-search-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-level').textContent).toBe('series');
    });

    it('Search Season button opens SeriesInteractiveSearchModal at Season level', async () => {
      renderApp('/library/tv/42');
      await waitFor(() => expect(screen.getByText(/Season 1/)).toBeInTheDocument());

      const searchSeasonBtn = screen.getByRole('button', { name: /search season 1/i });
      fireEvent.click(searchSeasonBtn);

      expect(screen.getByTestId('series-search-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-level').textContent).toBe('season');
      expect(screen.getByTestId('modal-season').textContent).toBe('1');
    });

    it('Search Episode button opens SeriesInteractiveSearchModal at Episode level', async () => {
      renderApp('/library/tv/42');
      await waitFor(() => expect(screen.getByText(/Season 1/)).toBeInTheDocument());
      await waitFor(() => expect(screen.getByText('Pilot')).toBeInTheDocument());

      const searchEpisodeBtn = screen.getByRole('button', { name: /search S01E01/i });
      fireEvent.click(searchEpisodeBtn);

      expect(screen.getByTestId('series-search-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-level').textContent).toBe('episode');
      expect(screen.getByTestId('modal-season').textContent).toBe('1');
      expect(screen.getByTestId('modal-episode').textContent).toBe('1');
    });
  });
});
