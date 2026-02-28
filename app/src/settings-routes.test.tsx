/**
 * Integration tests for settings routes — Phase 4 coverage.
 * Covers: navigation to all critical settings pages, and API load/save wiring for
 * indexers, download clients, quality profiles/custom formats, and subtitles.
 *
 * App.test.tsx already covers /settings/general (save) and /settings/subtitles (provider
 * error), so this file adds complementary coverage for the remaining critical paths.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  indexerApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  downloadClientApi: {
    get: vi.fn(),
    save: vi.fn(),
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

const mockPushToast = vi.hoisted(() => vi.fn());

vi.mock('@/components/providers/ToastProvider', () => ({
  ToastProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useToast: () => ({ pushToast: mockPushToast, toasts: [] }),
}));

import App from './App';

const defaultTorrentLimits = {
  maxActiveDownloads: 3,
  maxActiveSeeds: 3,
  globalDownloadLimitKbps: null,
  globalUploadLimitKbps: null,
  incompleteDirectory: '',
  completeDirectory: '',
  seedRatioLimit: 0,
  seedTimeLimitMinutes: 0,
  seedLimitAction: 'pause' as const,
};

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

const mockQualityProfile = {
  id: 1,
  name: 'Default',
  cutoff: 100,
  items: [{ quality: { id: 100, name: 'WEBDL-1080p', source: 'WEBDL', resolution: 1080 }, allowed: true }],
  languageProfileId: null,
};

function renderApp(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );
}

describe('Settings routes — navigation integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.mediaApi.listMovies.mockResolvedValue({ items: [], meta: { page: 1, pageSize: 200, totalCount: 0, totalPages: 0 } });
    mockApi.mediaApi.listSeries.mockResolvedValue({ items: [], meta: { page: 1, pageSize: 200, totalCount: 0, totalPages: 0 } });
    mockApi.indexerApi.list.mockResolvedValue([]);
    mockApi.downloadClientApi.get.mockResolvedValue(defaultTorrentLimits);
    mockApi.qualityProfileApi.list.mockResolvedValue([]);
    mockApi.customFormatApi.list.mockResolvedValue([]);
    mockApi.subtitleProvidersApi.listProviders.mockResolvedValue([]);
    mockApi.notificationsApi.list.mockResolvedValue([]);
    mockApi.settingsApi.get.mockResolvedValue(baseSettings);
    mockApi.movieApi.getRootFolders.mockResolvedValue({ rootFolders: [] });
    mockApi.seriesApi.getRootFolders.mockResolvedValue({ rootFolders: [] });
  });

  it('renders the Indexers settings page title', async () => {
    renderApp('/settings/indexers');
    expect(await screen.findByText('Indexers')).toBeInTheDocument();
  });

  it('renders the Download Client settings page title (singular)', async () => {
    renderApp('/settings/clients');
    expect(await screen.findByText('Download Client')).toBeInTheDocument();
  });

  it('renders the Profiles & Quality settings page title', async () => {
    renderApp('/settings/profiles');
    expect(await screen.findByText('Profiles & Quality')).toBeInTheDocument();
  });

  it('renders the Subtitles settings page title', async () => {
    renderApp('/settings/subtitles');
    expect(await screen.findByText('Subtitles')).toBeInTheDocument();
  });

  it('renders the General settings page title', async () => {
    renderApp('/settings/general');
    expect(await screen.findByText('General')).toBeInTheDocument();
  });

  it('renders the Media Management settings page title', async () => {
    renderApp('/settings/media');
    expect(await screen.findByText('Media Management')).toBeInTheDocument();
  });

  it('/settings redirects to /settings/media', async () => {
    renderApp('/settings');
    expect(await screen.findByText('Media Management')).toBeInTheDocument();
  });
});

// ── Indexers ─────────────────────────────────────────────────────────────────

describe('Settings: Indexers page', () => {
  const mockIndexers = [
    { id: 1, name: 'NZBGeek', implementation: 'Newznab', protocol: 'usenet', enabled: true, url: 'https://nzbgeek.info', apiKey: 'key1', priority: 25 },
    { id: 2, name: 'TorrentLeech', implementation: 'Torznab', protocol: 'torrent', enabled: false, url: 'https://tl.test', apiKey: 'key2', priority: 25 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.indexerApi.list.mockResolvedValue(mockIndexers);
    mockApi.indexerApi.create.mockResolvedValue({ id: 3, name: 'New Indexer', implementation: 'Torznab', protocol: 'torrent', enabled: true });
    mockApi.indexerApi.update.mockResolvedValue({ ...mockIndexers[0], enabled: false });
    mockApi.indexerApi.remove.mockResolvedValue({ id: 1 });
    mockApi.downloadClientApi.get.mockResolvedValue(defaultTorrentLimits);
    mockApi.qualityProfileApi.list.mockResolvedValue([]);
    mockApi.customFormatApi.list.mockResolvedValue([]);
    mockApi.subtitleProvidersApi.listProviders.mockResolvedValue([]);
    mockApi.notificationsApi.list.mockResolvedValue([]);
    mockApi.settingsApi.get.mockResolvedValue(baseSettings);
    mockApi.movieApi.getRootFolders.mockResolvedValue({ rootFolders: [] });
    mockApi.seriesApi.getRootFolders.mockResolvedValue({ rootFolders: [] });
    mockApi.mediaApi.listMovies.mockResolvedValue({ items: [], meta: { page: 1, pageSize: 200, totalCount: 0, totalPages: 0 } });
    mockApi.mediaApi.listSeries.mockResolvedValue({ items: [], meta: { page: 1, pageSize: 200, totalCount: 0, totalPages: 0 } });
  });

  it('calls indexerApi.list on mount', async () => {
    renderApp('/settings/indexers');

    await waitFor(() => {
      expect(mockApi.indexerApi.list).toHaveBeenCalledTimes(1);
    });
  });

  it('renders existing indexers', async () => {
    renderApp('/settings/indexers');

    expect(await screen.findByText('NZBGeek')).toBeInTheDocument();
    expect(screen.getByText('TorrentLeech')).toBeInTheDocument();
  });

  it('shows error message when indexerApi.list fails', async () => {
    mockApi.indexerApi.list.mockRejectedValue(new Error('Indexer DB unavailable'));

    renderApp('/settings/indexers');

    expect(await screen.findByText('Indexer DB unavailable')).toBeInTheDocument();
  });

  it('calls indexerApi.create with correct payload on form submit', async () => {
    renderApp('/settings/indexers');

    await screen.findByText('NZBGeek'); // wait for initial load

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'MyIndexer' } });
    fireEvent.change(screen.getByPlaceholderText('https://indexer/api'), { target: { value: 'https://example.com' } });
    fireEvent.change(screen.getByPlaceholderText('API Key'), { target: { value: 'secret-key' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Add Indexer' }).closest('form')!);

    await waitFor(() => {
      expect(mockApi.indexerApi.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'MyIndexer',
        implementation: 'Torznab',
        protocol: 'torrent',
        enabled: true,
      }));
    });
  });

  it('reloads indexers after successful create', async () => {
    renderApp('/settings/indexers');

    await screen.findByText('NZBGeek');
    mockApi.indexerApi.list.mockClear();

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'NewIdx' } });
    fireEvent.change(screen.getByPlaceholderText('https://indexer/api'), { target: { value: 'https://idx.test' } });
    fireEvent.change(screen.getByPlaceholderText('API Key'), { target: { value: 'k' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Add Indexer' }).closest('form')!);

    await waitFor(() => {
      expect(mockApi.indexerApi.list).toHaveBeenCalledTimes(1);
    });
  });

  it('calls indexerApi.update when toggle button is clicked', async () => {
    renderApp('/settings/indexers');

    await screen.findByText('NZBGeek');
    const [disableButton] = screen.getAllByRole('button', { name: 'Disable' });
    fireEvent.click(disableButton!);

    await waitFor(() => {
      expect(mockApi.indexerApi.update).toHaveBeenCalledWith(1, { enabled: false });
    });
  });

  it('calls indexerApi.remove when Delete is clicked', async () => {
    renderApp('/settings/indexers');

    await screen.findByText('NZBGeek');
    const [deleteButton] = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButton!);

    await waitFor(() => {
      expect(mockApi.indexerApi.remove).toHaveBeenCalledWith(1);
    });
  });
});

// ── Download Client (single-instance) ─────────────────────────────────────────

const dlTorrentLimits = {
  ...defaultTorrentLimits,
  incompleteDirectory: '/tmp/dl',
  completeDirectory: '/media/done',
};

describe('Settings: Download Client page (single-instance)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.downloadClientApi.get.mockResolvedValue(dlTorrentLimits);
    mockApi.downloadClientApi.save.mockResolvedValue(dlTorrentLimits);
    mockApi.indexerApi.list.mockResolvedValue([]);
    mockApi.qualityProfileApi.list.mockResolvedValue([]);
    mockApi.customFormatApi.list.mockResolvedValue([]);
    mockApi.subtitleProvidersApi.listProviders.mockResolvedValue([]);
    mockApi.notificationsApi.list.mockResolvedValue([]);
    mockApi.settingsApi.get.mockResolvedValue(baseSettings);
    mockApi.movieApi.getRootFolders.mockResolvedValue({ rootFolders: [] });
    mockApi.seriesApi.getRootFolders.mockResolvedValue({ rootFolders: [] });
    mockApi.mediaApi.listMovies.mockResolvedValue({ items: [], meta: { page: 1, pageSize: 200, totalCount: 0, totalPages: 0 } });
    mockApi.mediaApi.listSeries.mockResolvedValue({ items: [], meta: { page: 1, pageSize: 200, totalCount: 0, totalPages: 0 } });
  });

  it('calls downloadClientApi.get on mount', async () => {
    renderApp('/settings/clients');

    await waitFor(() => {
      expect(mockApi.downloadClientApi.get).toHaveBeenCalledTimes(1);
    });
  });

  it('renders incomplete directory input with loaded value', async () => {
    renderApp('/settings/clients');

    const input = await screen.findByDisplayValue('/tmp/dl');
    expect(input).toBeInTheDocument();
  });

  it('calls downloadClientApi.save on form submit', async () => {
    renderApp('/settings/clients');

    await screen.findByDisplayValue('/tmp/dl');
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockApi.downloadClientApi.save).toHaveBeenCalledTimes(1);
    });
  });
});

// ── Quality Profiles ──────────────────────────────────────────────────────────

describe('Settings: Profiles & Quality page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.qualityProfileApi.list.mockResolvedValue([mockQualityProfile]);
    mockApi.qualityProfileApi.create.mockResolvedValue({ id: 2, name: 'HD Pack', cutoff: 100, items: [], languageProfileId: null });
    mockApi.qualityProfileApi.update.mockResolvedValue({ ...mockQualityProfile, name: 'Renamed' });
    mockApi.customFormatApi.list.mockResolvedValue([
      { id: 1, name: 'DolbyVision', includeCustomFormatWhenRenaming: false, conditions: [{ type: 'regex', field: 'title', operator: 'contains', value: 'DoVi', negate: false, required: false }], scores: [] },
    ]);
    mockApi.customFormatApi.create.mockResolvedValue({ id: 2, name: 'NewFormat', includeCustomFormatWhenRenaming: false, conditions: [], scores: [] });
    mockApi.indexerApi.list.mockResolvedValue([]);
    mockApi.downloadClientApi.get.mockResolvedValue(defaultTorrentLimits);
    mockApi.subtitleProvidersApi.listProviders.mockResolvedValue([]);
    mockApi.notificationsApi.list.mockResolvedValue([]);
    mockApi.settingsApi.get.mockResolvedValue(baseSettings);
    mockApi.movieApi.getRootFolders.mockResolvedValue({ rootFolders: [] });
    mockApi.seriesApi.getRootFolders.mockResolvedValue({ rootFolders: [] });
    mockApi.mediaApi.listMovies.mockResolvedValue({ items: [], meta: { page: 1, pageSize: 200, totalCount: 0, totalPages: 0 } });
    mockApi.mediaApi.listSeries.mockResolvedValue({ items: [], meta: { page: 1, pageSize: 200, totalCount: 0, totalPages: 0 } });
  });

  it('calls qualityProfileApi.list and customFormatApi.list on mount', async () => {
    renderApp('/settings/profiles');

    await waitFor(() => {
      expect(mockApi.qualityProfileApi.list).toHaveBeenCalledTimes(1);
      expect(mockApi.customFormatApi.list).toHaveBeenCalledTimes(1);
    });
  });

  it('renders existing quality profile', async () => {
    renderApp('/settings/profiles');

    expect(await screen.findByDisplayValue('Default')).toBeInTheDocument();
  });

  it('renders existing custom format', async () => {
    renderApp('/settings/profiles');

    expect(await screen.findByText('DolbyVision')).toBeInTheDocument();
  });

  it('calls qualityProfileApi.create on form submit', async () => {
    renderApp('/settings/profiles');

    await screen.findByDisplayValue('Default');

    fireEvent.change(screen.getByPlaceholderText('New profile name'), { target: { value: 'HD Pack' } });
    fireEvent.submit(screen.getByPlaceholderText('New profile name').closest('form')!);

    await waitFor(() => {
      expect(mockApi.qualityProfileApi.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'HD Pack',
      }));
    });
  });

  it('shows success message after creating quality profile', async () => {
    renderApp('/settings/profiles');

    await screen.findByDisplayValue('Default');

    fireEvent.change(screen.getByPlaceholderText('New profile name'), { target: { value: 'HD Pack' } });
    fireEvent.submit(screen.getByPlaceholderText('New profile name').closest('form')!);

    expect(await screen.findByText('Created quality profile "HD Pack".')).toBeInTheDocument();
  });

  it('calls qualityProfileApi.update when Save is clicked on a profile', async () => {
    renderApp('/settings/profiles');

    const nameInput = await screen.findByDisplayValue('Default');
    fireEvent.change(nameInput, { target: { value: 'Renamed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockApi.qualityProfileApi.update).toHaveBeenCalledWith(1, { name: 'Renamed' });
    });
  });

  it('calls customFormatApi.create on custom format form submit', async () => {
    renderApp('/settings/profiles');

    await screen.findByDisplayValue('Default');

    fireEvent.change(screen.getByPlaceholderText('New custom format name'), { target: { value: 'RemuxOnly' } });
    fireEvent.submit(screen.getByPlaceholderText('New custom format name').closest('form')!);

    await waitFor(() => {
      expect(mockApi.customFormatApi.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'RemuxOnly',
      }));
    });
  });

  it('shows error when qualityProfileApi.list fails', async () => {
    mockApi.qualityProfileApi.list.mockRejectedValue(new Error('DB connection lost'));

    renderApp('/settings/profiles');

    expect(await screen.findByText('DB connection lost')).toBeInTheDocument();
  });
});

// ── Subtitles (complementary to App.test.tsx) ─────────────────────────────────

describe('Settings: Subtitles page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.settingsApi.get.mockResolvedValue(baseSettings);
    mockApi.settingsApi.update.mockResolvedValue(baseSettings);
    mockApi.subtitleProvidersApi.listProviders.mockResolvedValue([
      { id: 1, name: 'OpenSubtitles', status: 'ok' },
    ]);
    mockApi.indexerApi.list.mockResolvedValue([]);
    mockApi.downloadClientApi.get.mockResolvedValue(defaultTorrentLimits);
    mockApi.qualityProfileApi.list.mockResolvedValue([]);
    mockApi.customFormatApi.list.mockResolvedValue([]);
    mockApi.notificationsApi.list.mockResolvedValue([]);
    mockApi.movieApi.getRootFolders.mockResolvedValue({ rootFolders: [] });
    mockApi.seriesApi.getRootFolders.mockResolvedValue({ rootFolders: [] });
    mockApi.mediaApi.listMovies.mockResolvedValue({ items: [], meta: { page: 1, pageSize: 200, totalCount: 0, totalPages: 0 } });
    mockApi.mediaApi.listSeries.mockResolvedValue({ items: [], meta: { page: 1, pageSize: 200, totalCount: 0, totalPages: 0 } });
  });

  it('loads and displays subtitle providers', async () => {
    renderApp('/settings/subtitles');

    expect(await screen.findByText(/OpenSubtitles/)).toBeInTheDocument();
    expect(screen.getByText(/ok/)).toBeInTheDocument();
  });

  it('calls settingsApi.get on mount to pre-fill form values', async () => {
    renderApp('/settings/subtitles');

    await waitFor(() => {
      expect(mockApi.settingsApi.get).toHaveBeenCalledTimes(1);
    });
  });

  it('calls settingsApi.update with correct payload on save', async () => {
    renderApp('/settings/subtitles');

    await screen.findByText(/OpenSubtitles/);

    fireEvent.change(screen.getByLabelText('OpenSubtitles API Key'), { target: { value: 'my-key' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Subtitle Settings' }));

    await waitFor(() => {
      expect(mockApi.settingsApi.update).toHaveBeenCalledWith(expect.objectContaining({
        apiKeys: { openSubtitlesApiKey: 'my-key' },
      }));
    });
  });

  it('shows success message after saving subtitle settings', async () => {
    renderApp('/settings/subtitles');

    await screen.findByText(/OpenSubtitles/);

    fireEvent.click(screen.getByRole('button', { name: 'Save Subtitle Settings' }));

    expect(await screen.findByText('Subtitle settings saved.')).toBeInTheDocument();
  });
});
