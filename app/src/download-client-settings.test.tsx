/**
 * Tests for Phase 4: Download Client Settings rewrite.
 * Tests the new single-instance settings form and cleanup of plural references.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const defaultTorrentLimits = {
  maxActiveDownloads: 3,
  maxActiveSeeds: 3,
  globalDownloadLimitKbps: null,
  globalUploadLimitKbps: null,
  incompleteDirectory: '/tmp/incomplete',
  completeDirectory: '/media/complete',
  seedRatioLimit: 1.5,
  seedTimeLimitMinutes: 60,
  seedLimitAction: 'pause' as const,
};

const mockPushToast = vi.hoisted(() => vi.fn());

const mockApi = vi.hoisted(() => ({
  mediaApi: {
    listMovies: vi.fn(),
    listSeries: vi.fn(),
    setMovieMonitored: vi.fn(),
    deleteMovie: vi.fn(),
    setSeriesMonitored: vi.fn(),
    deleteSeries: vi.fn(),
  },
  movieApi: { getById: vi.fn(), getRootFolders: vi.fn(), searchReleases: vi.fn() },
  seriesApi: { getSeriesWithEpisodes: vi.fn(), getRootFolders: vi.fn(), searchReleases: vi.fn() },
  releaseApi: { grabRelease: vi.fn() },
  indexerApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  downloadClientApi: {
    get: vi.fn(),
    save: vi.fn(),
  },
  qualityProfileApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  customFormatApi: { list: vi.fn(), create: vi.fn(), delete: vi.fn() },
  subtitleProvidersApi: { listProviders: vi.fn() },
  notificationsApi: { list: vi.fn() },
  settingsApi: { get: vi.fn(), update: vi.fn() },
}));

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => mockApi),
}));

vi.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { pathname: string; children: ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}));

vi.mock('@/components/providers/ToastProvider', () => ({
  ToastProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useToast: () => ({ pushToast: mockPushToast, toasts: [] }),
}));

vi.mock('@/components/movie/MovieInteractiveSearchModal', () => ({
  MovieInteractiveSearchModal: () => null,
}));

vi.mock('@/components/search/InteractiveSearchModal', () => ({
  InteractiveSearchModal: () => null,
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
    incompleteDirectory: '',
    completeDirectory: '',
    seedRatioLimit: 0,
    seedTimeLimitMinutes: 0,
    seedLimitAction: 'pause' as const,
  },
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
      <App />
    </MemoryRouter>,
  );
}

describe('Phase 4: Download Client settings page — single-instance form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.mediaApi.listMovies.mockResolvedValue({ items: [], meta: { page: 1, pageSize: 200, totalCount: 0, totalPages: 0 } });
    mockApi.mediaApi.listSeries.mockResolvedValue({ items: [], meta: { page: 1, pageSize: 200, totalCount: 0, totalPages: 0 } });
    mockApi.indexerApi.list.mockResolvedValue([]);
    mockApi.downloadClientApi.get.mockResolvedValue(defaultTorrentLimits);
    mockApi.downloadClientApi.save.mockResolvedValue(defaultTorrentLimits);
    mockApi.qualityProfileApi.list.mockResolvedValue([]);
    mockApi.customFormatApi.list.mockResolvedValue([]);
    mockApi.subtitleProvidersApi.listProviders.mockResolvedValue([]);
    mockApi.notificationsApi.list.mockResolvedValue([]);
    mockApi.settingsApi.get.mockResolvedValue(baseSettings);
    mockApi.movieApi.getRootFolders.mockResolvedValue({ rootFolders: [] });
    mockApi.seriesApi.getRootFolders.mockResolvedValue({ rootFolders: [] });
  });

  it('renders the page title as "Download Client" (singular)', async () => {
    renderApp('/settings/clients');
    expect(await screen.findByText('Download Client')).toBeInTheDocument();
  });

  it('calls downloadClientApi.get on mount', async () => {
    renderApp('/settings/clients');

    await waitFor(() => {
      expect(mockApi.downloadClientApi.get).toHaveBeenCalledTimes(1);
    });
  });

  it('renders the incomplete directory input with loaded value', async () => {
    renderApp('/settings/clients');

    const input = await screen.findByDisplayValue('/tmp/incomplete');
    expect(input).toBeInTheDocument();
  });

  it('renders the complete directory input with loaded value', async () => {
    renderApp('/settings/clients');

    const input = await screen.findByDisplayValue('/media/complete');
    expect(input).toBeInTheDocument();
  });

  it('renders a seed ratio limit input', async () => {
    renderApp('/settings/clients');

    await screen.findByDisplayValue('/tmp/incomplete'); // wait for load

    // Seed ratio limit input should show 1.5
    const inputs = screen.getAllByRole('spinbutton');
    const values = inputs.map(i => (i as HTMLInputElement).value);
    expect(values).toContain('1.5');
  });

  it('renders a seed time limit input', async () => {
    renderApp('/settings/clients');

    await screen.findByDisplayValue('/tmp/incomplete');

    const inputs = screen.getAllByRole('spinbutton');
    const values = inputs.map(i => (i as HTMLInputElement).value);
    expect(values).toContain('60');
  });

  it('calls downloadClientApi.save on form submit', async () => {
    renderApp('/settings/clients');

    await screen.findByDisplayValue('/tmp/incomplete');

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockApi.downloadClientApi.save).toHaveBeenCalledTimes(1);
    });
  });

  it('calls pushToast with success after saving', async () => {
    renderApp('/settings/clients');

    await screen.findByDisplayValue('/tmp/incomplete');

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockPushToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/Download Client settings saved/),
          variant: 'success',
        }),
      );
    });
  });
});

describe('Phase 4: "Download Clients" (plural) must be absent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.mediaApi.listMovies.mockResolvedValue({ items: [], meta: { page: 1, pageSize: 200, totalCount: 0, totalPages: 0 } });
    mockApi.mediaApi.listSeries.mockResolvedValue({ items: [], meta: { page: 1, pageSize: 200, totalCount: 0, totalPages: 0 } });
    mockApi.indexerApi.list.mockResolvedValue([]);
    mockApi.downloadClientApi.get.mockResolvedValue(defaultTorrentLimits);
    mockApi.downloadClientApi.save.mockResolvedValue(defaultTorrentLimits);
    mockApi.qualityProfileApi.list.mockResolvedValue([]);
    mockApi.customFormatApi.list.mockResolvedValue([]);
    mockApi.subtitleProvidersApi.listProviders.mockResolvedValue([]);
    mockApi.notificationsApi.list.mockResolvedValue([]);
    mockApi.settingsApi.get.mockResolvedValue(baseSettings);
    mockApi.movieApi.getRootFolders.mockResolvedValue({ rootFolders: [] });
    mockApi.seriesApi.getRootFolders.mockResolvedValue({ rootFolders: [] });
  });

  it('does not render "Download Clients" (plural) as a page title on the clients page', async () => {
    renderApp('/settings/clients');

    await screen.findByText('Download Client'); // wait for page render

    // The exact plural string "Download Clients" should not appear as rendered text
    expect(screen.queryByText('Download Clients')).not.toBeInTheDocument();
  });
});
