import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockApi = vi.hoisted(() => ({
  mediaApi: {
    listMovies: vi.fn(),
    setMovieMonitored: vi.fn(),
    deleteMovie: vi.fn(),
    listSeries: vi.fn(),
    setSeriesMonitored: vi.fn(),
    deleteSeries: vi.fn(),
    searchMetadata: vi.fn(),
    addToWanted: vi.fn(),
  },
  movieApi: {
    getById: vi.fn(),
    getTmdbCollection: vi.fn(),
    getRootFolders: vi.fn(),
    searchReleases: vi.fn(),
  },
  seriesApi: {
    getSeriesWithEpisodes: vi.fn(),
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
  mediaManagementApi: {
    get: vi.fn(),
    save: vi.fn(),
  },
}));

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => mockApi),
}));

vi.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { pathname: string; children: ReactNode }) => <div data-testid="app-shell">{children}</div>,
}));

vi.mock('@/components/providers/ToastProvider', () => ({
  ToastProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useToast: () => ({ pushToast: vi.fn() }),
}));

vi.mock('@/components/movie/MovieInteractiveSearchModal', () => ({
  MovieInteractiveSearchModal: () => null,
}));

vi.mock('@/components/search/InteractiveSearchModal', () => ({
  InteractiveSearchModal: () => null,
}));

vi.mock('@/components/subtitles/ManualSearchModal', () => ({
  ManualSearchModal: () => null,
}));

vi.mock('@/components/views', () => ({
  MovieOverviewView: ({ items }: { items: unknown[] }) => <div>Movies View {items.length}</div>,
  SeriesOverviewView: ({ items }: { items: unknown[] }) => <div>Series View {items.length}</div>,
}));

import App from './App';

const baseSettings = {
  torrentLimits: {
    maxActiveDownloads: 3,
    maxActiveSeeds: 5,
    globalDownloadLimitKbps: null,
    globalUploadLimitKbps: null,
  },
  schedulerIntervals: {
    rssSyncMinutes: 15,
    availabilityCheckMinutes: 30,
    torrentMonitoringSeconds: 60,
  },
  pathVisibility: {
    showDownloadPath: false,
    showMediaPath: false,
  },
  apiKeys: {
    tmdbApiKey: null,
    openSubtitlesApiKey: null,
    assrtApiToken: null,
    subdlApiKey: null,
  },
  wantedLanguages: [],
  host: {
    port: 3000,
    bindAddress: '0.0.0.0',
    urlBase: null,
    sslPort: null,
    enableSsl: false,
    sslCertPath: null,
    sslKeyPath: null,
  },
  security: {
    apiKey: null,
    authenticationMethod: 'none' as const,
    authenticationRequired: false,
  },
  logging: {
    logLevel: 'info' as const,
    logSizeLimit: 20,
    logRetentionDays: 7,
  },
  update: {
    branch: 'master' as const,
    autoUpdateEnabled: false,
    mechanicsEnabled: false,
    updateScriptPath: null,
  },
};

function renderApp(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App route and settings parity', () => {
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
    mockApi.movieApi.getById.mockResolvedValue({
      id: 7,
      title: 'Test Movie',
      year: 2024,
      monitored: true,
      qualityProfileId: 1,
      added: '2026-02-27T00:00:00.000Z',
      status: 'released',
      overview: 'Movie overview',
      tmdbId: 100,
      imdbId: 'tt0123456',
    });
    mockApi.movieApi.getTmdbCollection.mockResolvedValue({ collection: null });
    mockApi.seriesApi.getSeriesWithEpisodes.mockResolvedValue({
      id: 42,
      title: 'Test Series',
      seasons: [{ id: 1, seasonNumber: 1, episodes: [{ id: 1001, episodeNumber: 1, title: 'Pilot' }] }],
      tvdbId: 12345,
    });
    mockApi.subtitleApi.listMovieVariants.mockResolvedValue([]);
    mockApi.subtitleApi.listSeriesVariants.mockResolvedValue([]);
    mockApi.subtitleWantedApi.getWantedCount.mockResolvedValue({ seriesCount: 0, moviesCount: 0, totalCount: 0 });
    mockApi.indexerApi.list.mockResolvedValue([]);
    mockApi.downloadClientApi.list.mockResolvedValue([]);
    mockApi.notificationsApi.list.mockResolvedValue([]);
    mockApi.qualityProfileApi.list.mockResolvedValue([
      {
        id: 1,
        name: 'Default',
        cutoff: 100,
        items: [{ quality: { id: 100, name: 'WEBDL-1080p', source: 'WEBDL', resolution: 1080 }, allowed: true }],
        languageProfileId: null,
      },
    ]);
    mockApi.customFormatApi.list.mockResolvedValue([]);
    mockApi.subtitleProvidersApi.listProviders.mockResolvedValue([]);
    mockApi.settingsApi.get.mockResolvedValue(baseSettings);
    mockApi.settingsApi.update.mockImplementation(async (input: any) => ({
      ...baseSettings,
      ...input,
      torrentLimits: { ...baseSettings.torrentLimits, ...(input?.torrentLimits ?? {}) },
      schedulerIntervals: { ...baseSettings.schedulerIntervals, ...(input?.schedulerIntervals ?? {}) },
      pathVisibility: { ...baseSettings.pathVisibility, ...(input?.pathVisibility ?? {}) },
      apiKeys: { ...baseSettings.apiKeys, ...(input?.apiKeys ?? {}) },
    }));
    mockApi.qualityProfileApi.create.mockResolvedValue({
      id: 2,
      name: 'New Profile',
      cutoff: 100,
      items: [{ quality: { id: 100, name: 'WEBDL-1080p', source: 'WEBDL', resolution: 1080 }, allowed: true }],
      languageProfileId: null,
    });
    mockApi.qualityProfileApi.update.mockResolvedValue({
      id: 1,
      name: 'Updated Profile',
      cutoff: 100,
      items: [{ quality: { id: 100, name: 'WEBDL-1080p', source: 'WEBDL', resolution: 1080 }, allowed: true }],
      languageProfileId: null,
    });
    mockApi.qualityProfileApi.delete.mockResolvedValue({ id: 1 });
    mockApi.customFormatApi.create.mockResolvedValue({
      id: 1,
      name: 'Format',
      includeCustomFormatWhenRenaming: false,
      conditions: [],
      scores: [],
    });
    mockApi.customFormatApi.delete.mockResolvedValue({ id: 1 });
    mockApi.mediaManagementApi.get.mockResolvedValue({
      movieRootFolder: '/movies',
      tvRootFolder: '/tv',
    });
  });

  it('loads movie detail route and fetches movie by id', async () => {
    renderApp('/library/movies/7');

    await waitFor(() => {
      expect(mockApi.movieApi.getById).toHaveBeenCalledWith(7);
    });
    expect(screen.getByText('Movie Details')).toBeInTheDocument();
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
  });

  it('loads series detail route alias and fetches series by id', async () => {
    renderApp('/library/series/42');

    await waitFor(() => {
      expect(mockApi.seriesApi.getSeriesWithEpisodes).toHaveBeenCalledWith(42);
    });
    expect(screen.getByText('Series Details')).toBeInTheDocument();
    expect(screen.getByText('Test Series')).toBeInTheDocument();
  });

  it('saves general settings through settings API', async () => {
    renderApp('/settings/general');

    const rssInput = await screen.findByLabelText('RSS Sync Interval (minutes)');
    fireEvent.change(rssInput, { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Max Active Downloads'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Max Active Seeds'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save General Settings' }));

    await waitFor(() => {
      expect(mockApi.settingsApi.update).toHaveBeenCalledWith(expect.objectContaining({
        schedulerIntervals: expect.objectContaining({ rssSyncMinutes: 30 }),
        torrentLimits: expect.objectContaining({ maxActiveDownloads: 8, maxActiveSeeds: 9 }),
      }));
    });
    expect(await screen.findByText('General settings saved.')).toBeInTheDocument();
  });

  it('keeps subtitles settings operable even when provider status endpoint fails', async () => {
    mockApi.subtitleProvidersApi.listProviders.mockRejectedValue(new Error('Provider status endpoint unavailable'));
    renderApp('/settings/subtitles');

    expect(await screen.findByText('Provider status endpoint unavailable')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('OpenSubtitles API Key'), { target: { value: 'abc-key' } });
    fireEvent.click(screen.getByLabelText('Show download paths in subtitle-related views'));
    fireEvent.click(screen.getByRole('button', { name: 'Save Subtitle Settings' }));

    await waitFor(() => {
      expect(mockApi.settingsApi.update).toHaveBeenCalledWith({
        apiKeys: {
          openSubtitlesApiKey: 'abc-key',
          assrtApiToken: null,
          subdlApiKey: null,
        },
        wantedLanguages: [],
        pathVisibility: {
          showDownloadPath: true,
          showMediaPath: false,
        },
      });
    });
    expect(await screen.findByText('Subtitle settings saved.')).toBeInTheDocument();
  });

  it('searches for media and adds a result to wanted', async () => {
    mockApi.mediaApi.searchMetadata.mockResolvedValue([
      {
        mediaType: 'MOVIE',
        tmdbId: 13,
        title: 'Forrest Gump',
        year: 1994,
        overview: 'Life is like a box of chocolates',
        images: [{ coverType: 'poster', url: 'http://image.tmdb.org/t/p/w500/abc.jpg' }],
      },
    ]);
    mockApi.mediaApi.addToWanted.mockResolvedValue({ id: 10 });

    renderApp('/search');

    const input = screen.getByPlaceholderText('Search by title...');
    fireEvent.change(input, { target: { value: 'Forrest' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(mockApi.mediaApi.searchMetadata).toHaveBeenCalledWith({ term: 'Forrest' });
    });

    expect(await screen.findByText('Forrest Gump')).toBeInTheDocument();
    expect(screen.getByText('1994')).toBeInTheDocument();
    expect(screen.getByText('MOVIE')).toBeInTheDocument();

    const addButton = screen.getByRole('button', { name: 'Add to Wanted' });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockApi.mediaApi.addToWanted).toHaveBeenCalledWith(expect.objectContaining({
        mediaType: 'MOVIE',
        tmdbId: 13,
        title: 'Forrest Gump',
      }));
    });
  });
});
