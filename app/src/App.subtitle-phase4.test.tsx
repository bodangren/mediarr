import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockManualSearchModal = vi.hoisted(() => vi.fn());

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
    triggerAutoSearch: vi.fn().mockResolvedValue({ success: true }),
  },
  mediaManagementApi: {
    get: vi.fn().mockResolvedValue({ movieRootFolder: '/movies', tvRootFolder: '/tv' }),
    save: vi.fn(),
  },
  movieApi: {
    getById: vi.fn(),
    update: vi.fn(),
    getRootFolders: vi.fn(),
    searchReleases: vi.fn(),
  },
  seriesApi: {
    getSeriesWithEpisodes: vi.fn(),
    bulkUpdate: vi.fn().mockResolvedValue({ updated: 1, failed: 0 }),
    getRootFolders: vi.fn(),
    searchReleases: vi.fn(),
    rescan: vi.fn().mockResolvedValue({ rescanned: true, id: 1, episodeCount: 2, filesLinked: 0 }),
  },
  subtitleApi: {
    listMovieVariants: vi.fn(),
    listSeriesVariants: vi.fn(),
  },
  subtitleWantedApi: {
    getWantedCount: vi.fn().mockResolvedValue({ seriesCount: 0, moviesCount: 0, totalCount: 0 }),
  },
  releaseApi: {
    grabRelease: vi.fn(),
  },
  indexerApi: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  downloadClientApi: {
    list: vi.fn().mockResolvedValue([]),
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
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    delete: vi.fn(),
  },
  subtitleProvidersApi: {
    listProviders: vi.fn(),
  },
  notificationsApi: {
    list: vi.fn().mockResolvedValue([]),
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

vi.mock('@/components/providers/ToastProvider', () => ({
  ToastProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useToast: () => ({ pushToast: vi.fn() }),
}));

vi.mock('@/components/movie/MovieInteractiveSearchModal', () => ({
  MovieInteractiveSearchModal: () => null,
}));

vi.mock('@/components/series/SeriesInteractiveSearchModal', () => ({
  SeriesInteractiveSearchModal: () => null,
}));

vi.mock('@/components/search/InteractiveSearchModal', () => ({
  InteractiveSearchModal: () => null,
}));

vi.mock('@/components/subtitles/ManualSearchModal', () => ({
  ManualSearchModal: (props: any) => mockManualSearchModal(props),
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
  wantedLanguages: ['en'],
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

describe('App subtitle phase 4 integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockManualSearchModal.mockImplementation(({ isOpen, movieId, episodeId }) =>
      isOpen ? <div data-testid="manual-subtitle-modal">{movieId ? `movie:${movieId}` : `episode:${episodeId}`}</div> : null,
    );

    mockApi.settingsApi.get.mockResolvedValue(baseSettings);
    mockApi.settingsApi.update.mockResolvedValue(baseSettings);
    mockApi.subtitleProvidersApi.listProviders.mockResolvedValue([
      { id: 'opensubtitles', name: 'OpenSubtitles', status: 'active' },
      { id: 'assrt', name: 'ASSRT', status: 'disabled' },
    ]);
    mockApi.qualityProfileApi.list.mockResolvedValue([
      { id: 1, name: 'Default', cutoff: 100, items: [], languageProfileId: null },
    ]);
    mockApi.mediaApi.listMovies.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
    });
    mockApi.mediaApi.listSeries.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
    });
  });

  it('saves subtitle settings with wantedLanguages and all provider credentials', async () => {
    renderApp('/settings/subtitles');

    await screen.findByText('OpenSubtitles - active');

    fireEvent.change(screen.getByLabelText('OpenSubtitles API Key'), { target: { value: 'os-key' } });
    fireEvent.change(screen.getByLabelText('ASSRT API Token'), { target: { value: 'assrt-token' } });
    fireEvent.change(screen.getByLabelText('SubDL API Key'), { target: { value: 'subdl-key' } });
    fireEvent.click(screen.getByLabelText('Wanted language th'));
    fireEvent.click(screen.getByRole('button', { name: 'Save Subtitle Settings' }));

    await waitFor(() => {
      expect(mockApi.settingsApi.update).toHaveBeenCalledWith({
        apiKeys: {
          openSubtitlesApiKey: 'os-key',
          assrtApiToken: 'assrt-token',
          subdlApiKey: 'subdl-key',
        },
        wantedLanguages: ['en', 'th'],
        pathVisibility: {
          showDownloadPath: false,
          showMediaPath: false,
        },
      });
    });
  });

  it('renders movie subtitle status badges from subtitle inventory summary', async () => {
    mockApi.movieApi.getById.mockResolvedValue({
      id: 7,
      title: 'Movie X',
      year: 2024,
      monitored: true,
      qualityProfileId: 1,
    });
    mockApi.subtitleApi.listMovieVariants.mockResolvedValue([
      {
        variantId: 1,
        subtitleTracks: [{ languageCode: 'en' }],
        missingSubtitles: [{ languageCode: 'th' }],
      },
    ]);

    renderApp('/library/movies/7');

    expect(await screen.findByText('Subtitles Partial')).toBeInTheDocument();
    expect(screen.getByText('en')).toBeInTheDocument();
    expect(screen.getByText('th')).toBeInTheDocument();
  });

  it('opens movie manual subtitle modal from movie detail controls', async () => {
    mockApi.movieApi.getById.mockResolvedValue({
      id: 7,
      title: 'Movie X',
      year: 2024,
      monitored: true,
      qualityProfileId: 1,
    });
    mockApi.subtitleApi.listMovieVariants.mockResolvedValue([]);

    renderApp('/library/movies/7');

    await screen.findByText('Movie X');
    fireEvent.click(screen.getByRole('button', { name: 'Manual Subtitles' }));

    expect(await screen.findByTestId('manual-subtitle-modal')).toHaveTextContent('movie:7');
  });

  it('shows season subtitle aggregate and opens episode manual subtitle modal', async () => {
    mockApi.seriesApi.getSeriesWithEpisodes.mockResolvedValue({
      id: 42,
      title: 'Series X',
      monitored: true,
      qualityProfileId: 1,
      seasons: [
        {
          id: 11,
          seasonNumber: 1,
          monitored: true,
          episodes: [{ id: 101, seasonNumber: 1, episodeNumber: 1, title: 'Pilot', monitored: true }],
        },
      ],
    });
    mockApi.subtitleApi.listSeriesVariants.mockResolvedValue([
      {
        seriesId: 42,
        seasonNumber: 1,
        episodes: [
          {
            episodeId: 101,
            seasonNumber: 1,
            episodeNumber: 1,
            subtitleTracks: [{ languageCode: 'en', isForced: false, isHi: false, path: '/subs/pilot.en.srt', provider: 'opensubtitles' }],
            missingSubtitles: [],
          },
        ],
      },
    ]);

    renderApp('/library/tv/42');

    await screen.findByText('Series X');
    expect(screen.getAllByText('Subtitles Complete').length).toBeGreaterThan(0);

    fireEvent.click(await screen.findByLabelText('Manual subtitles S01E01'));
    expect(await screen.findByTestId('manual-subtitle-modal')).toHaveTextContent('episode:101');
  });
});
