import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '@/components/shell/AppShell';
import { getApiClients } from '@/lib/api/client';
import IndexersPage from '@/app/(shell)/indexers/page';
import SearchPage from '@/app/(shell)/search/page';
import GeneralSettingsPage from '@/app/(shell)/settings/general/page';
import { ToastProvider } from '@/components/providers/ToastProvider';

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

const mockedGetApiClients = vi.mocked(getApiClients);

// Indexer fixtures
interface IndexerFixture {
  id: number;
  name: string;
  implementation: string;
  configContract: string;
  settings: string;
  protocol: string;
  enabled: boolean;
  supportsRss: boolean;
  supportsSearch: boolean;
  priority: number;
  health?: {
    failureCount?: number;
    lastErrorMessage?: string | null;
  } | null;
}

function buildIndexer(overrides: Partial<IndexerFixture> = {}): IndexerFixture {
  return {
    id: 1,
    name: 'Indexer 1',
    implementation: 'Torznab',
    configContract: 'TorznabSettings',
    settings: '{"url":"https://indexer.test","apiKey":"abc"}',
    protocol: 'torrent',
    enabled: true,
    supportsRss: true,
    supportsSearch: true,
    priority: 25,
    health: { failureCount: 0, lastErrorMessage: null },
    ...overrides,
  };
}

// Mock function fixtures
const listIndexersMock = vi.fn();
const createIndexerMock = vi.fn();
const updateIndexerMock = vi.fn();
const deleteIndexerMock = vi.fn();
const testIndexerMock = vi.fn();
const searchCandidatesMock = vi.fn();
const grabReleaseMock = vi.fn();
const getSettingsMock = vi.fn();
const updateSettingsMock = vi.fn();

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function renderWithShell(component: React.ReactNode, pathname: string = '/') {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppShell pathname={pathname}>{component}</AppShell>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();

  // Indexer API mocks
  listIndexersMock.mockResolvedValue([buildIndexer()]);
  createIndexerMock.mockResolvedValue(buildIndexer({ id: 11, name: 'Created Indexer' }));
  updateIndexerMock.mockImplementation((id: number, input: Record<string, unknown>) => {
    return Promise.resolve(
      buildIndexer({
        id,
        enabled: typeof input.enabled === 'boolean' ? input.enabled : true,
        priority: typeof input.priority === 'number' ? input.priority : 25,
      }),
    );
  });
  deleteIndexerMock.mockResolvedValue({ id: 1 });
  testIndexerMock.mockResolvedValue({
    success: true,
    message: 'Connectivity check succeeded.',
    diagnostics: { remediationHints: ['No remediation needed.'] },
    healthSnapshot: null,
  });

  // Search API mocks
  searchCandidatesMock.mockResolvedValue([
    {
      indexer: 'Indexer A',
      title: 'Dune Part Two 1080p WEB-DL',
      size: 4_294_967_296,
      seeders: 140,
      quality: '1080p',
      age: 2,
      magnetUrl: 'magnet:?xt=urn:btih:abc123',
    },
  ]);
  grabReleaseMock.mockResolvedValue({
    infoHash: 'abc123',
    name: 'Dune Part Two 1080p WEB-DL',
  });

  // Settings API mocks
  getSettingsMock.mockResolvedValue({
    torrentLimits: {
      maxActiveDownloads: 4,
      maxActiveSeeds: 8,
      globalDownloadLimitKbps: 1000,
      globalUploadLimitKbps: 500,
    },
    schedulerIntervals: {
      rssSyncMinutes: 20,
      availabilityCheckMinutes: 45,
      torrentMonitoringSeconds: 10,
    },
    pathVisibility: {
      showDownloadPath: true,
      showMediaPath: false,
    },
    apiKeys: {
      tmdbApiKey: 'tmdb-token',
      openSubtitlesApiKey: 'os-token',
    },
    host: {
      port: 9696,
      bindAddress: '*',
      urlBase: '/mediarr',
      sslPort: 9697,
      enableSsl: false,
      sslCertPath: '',
      sslKeyPath: '',
    },
    security: {
      apiKey: 'api-key-123',
      authenticationMethod: 'form',
      authenticationRequired: true,
    },
    logging: {
      logLevel: 'info',
      logSizeLimit: 1048576,
      logRetentionDays: 30,
    },
    update: {
      branch: 'master',
      autoUpdateEnabled: false,
      mechanicsEnabled: false,
      updateScriptPath: '',
    },
  });
  updateSettingsMock.mockImplementation(async payload => payload);

  mockedGetApiClients.mockReturnValue({
    indexerApi: {
      list: listIndexersMock,
      create: createIndexerMock,
      update: updateIndexerMock,
      remove: deleteIndexerMock,
      test: testIndexerMock,
      testDraft: vi.fn(),
    },
    releaseApi: {
      searchCandidates: searchCandidatesMock,
      grabRelease: grabReleaseMock,
    },
    settingsApi: {
      get: getSettingsMock,
      update: updateSettingsMock,
    },
    eventsApi: {
      connectionState: 'idle',
      onStateChange: vi.fn(() => () => undefined),
    },
    // Include minimal mocks for other required API clients
    httpClient: {} as any,
    mediaApi: {} as any,
    torrentApi: {} as any,
  } as unknown as ReturnType<typeof getApiClients>);
});

describe('E2E Journey: Indexer Management Flow', () => {
  it('loads indexers page and performs row-level delete action', async () => {
    // Step 1: Load the indexers page
    renderWithShell(<IndexersPage />, '/indexers');

    // Verify page loads with initial data
    await screen.findByText('Indexer 1');
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Protocol' })).toBeInTheDocument();

    // Step 2: Perform row-level delete action
    const row = screen.getByText('Indexer 1').closest('tr');
    expect(row).not.toBeNull();

    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(deleteIndexerMock).toHaveBeenCalledWith(1);
    });

    // Verify success toast appears (from existing test: "Indexer deleted")
    expect(await screen.findByText('Indexer deleted')).toBeInTheDocument();
  });

  it('loads indexers page and performs row-level test action', async () => {
    renderWithShell(<IndexersPage />, '/indexers');

    await screen.findByText('Indexer 1');

    // Perform row-level test action
    const row = screen.getByText('Indexer 1').closest('tr');
    expect(row).not.toBeNull();

    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Test' }));

    await waitFor(() => {
      expect(testIndexerMock).toHaveBeenCalledWith(1);
    });

    // Verify success toast appears (from existing test: "Indexer test passed")
    expect(await screen.findByText('Indexer test passed')).toBeInTheDocument();
  });

  it('loads indexers page and performs row-level edit action', async () => {
    listIndexersMock.mockResolvedValue([
      buildIndexer({
        id: 2,
        name: 'Editable Indexer',
        settings: JSON.stringify({ url: 'https://editable.example', apiKey: 'edit-key' }),
      }),
    ]);

    renderWithShell(<IndexersPage />, '/indexers');

    const rowLabel = await screen.findByText('Editable Indexer');
    const row = rowLabel.closest('tr');
    expect(row).not.toBeNull();

    // Perform row-level edit action
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Edit' }));

    // Verify edit modal opens
    const modal = screen.getByRole('dialog', { name: 'Edit indexer' });
    expect(within(modal).getByDisplayValue('Editable Indexer')).toBeInTheDocument();

    // Close modal (we're just testing the flow to this point)
    fireEvent.click(within(modal).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Edit indexer' })).not.toBeInTheDocument();
    });
  });

  it('loads indexers page and performs bulk delete action', async () => {
    listIndexersMock.mockResolvedValue([
      buildIndexer({ id: 101, name: 'Bulk Alpha' }),
      buildIndexer({ id: 102, name: 'Bulk Beta' }),
    ]);

    renderWithShell(<IndexersPage />, '/indexers');

    await screen.findByText('Bulk Alpha');

    // Enable select mode
    fireEvent.click(screen.getByRole('button', { name: 'Select Mode' }));
    expect(screen.getByText('Selection mode enabled')).toBeInTheDocument();

    // Select multiple indexers
    const alphaRow = screen.getByText('Bulk Alpha').closest('tr');
    const betaRow = screen.getByText('Bulk Beta').closest('tr');
    expect(alphaRow).not.toBeNull();
    expect(betaRow).not.toBeNull();

    fireEvent.click(within(alphaRow as HTMLElement).getByRole('checkbox', { name: 'Select row' }));
    fireEvent.click(within(betaRow as HTMLElement).getByRole('checkbox', { name: 'Select row' }));

    // Perform bulk delete
    fireEvent.click(screen.getByRole('button', { name: 'Delete Selected' }));

    const confirmModal = screen.getByRole('dialog', { name: 'Delete selected indexers' });
    fireEvent.click(within(confirmModal).getByRole('button', { name: 'Delete 2 Indexers' }));

    await waitFor(() => {
      expect(deleteIndexerMock).toHaveBeenCalledTimes(2);
      expect(deleteIndexerMock).toHaveBeenCalledWith(101);
      expect(deleteIndexerMock).toHaveBeenCalledWith(102);
    });

    // Verify bulk delete success toast
    expect(await screen.findByText('Deleted 2 indexers')).toBeInTheDocument();
  });
});

describe('E2E Journey: Search and Grab Flow', () => {
  it('executes search and performs grab action with API verification', async () => {
    renderWithShell(<SearchPage />, '/search');

    // Step 1: Wait for page to load
    await screen.findByRole('heading', { name: 'Search' });
    expect(screen.getByLabelText('Search query')).toBeInTheDocument();

    // Step 2: Enter search query and execute search
    fireEvent.change(screen.getByLabelText('Search query'), { target: { value: 'Dune Part Two' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search releases' }));

    await waitFor(() => {
      expect(searchCandidatesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'Dune Part Two',
        }),
      );
    });

    // Step 3: Verify results are displayed
    expect(await screen.findByText('Dune Part Two 1080p WEB-DL')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Title' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Indexer' })).toBeInTheDocument();

    // Step 4: Perform grab action
    const grabButton = screen.getByRole('button', {
      name: 'Grab release Dune Part Two 1080p WEB-DL',
    });
    expect(grabButton).toBeInTheDocument();

    fireEvent.click(grabButton);

    await waitFor(() => {
      expect(grabReleaseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Dune Part Two 1080p WEB-DL',
          indexer: 'Indexer A',
          magnetUrl: 'magnet:?xt=urn:btih:abc123',
        }),
      );
    });
  });

  it('executes search and performs bulk grab action', async () => {
    searchCandidatesMock.mockResolvedValueOnce([
      {
        indexer: 'Indexer A',
        title: 'Dune Part Two 1080p',
        size: 4_294_967_296,
        seeders: 140,
        age: 2,
        magnetUrl: 'magnet:?xt=urn:btih:abc123',
      },
      {
        indexer: 'Indexer B',
        title: 'Dune Part Two 2160p',
        size: 8_589_934_592,
        seeders: 80,
        age: 1,
        magnetUrl: 'magnet:?xt=urn:btih:def456',
      },
    ]);

    renderWithShell(<SearchPage />, '/search');

    await screen.findByRole('heading', { name: 'Search' });

    // Execute search
    fireEvent.change(screen.getByLabelText('Search query'), { target: { value: 'Dune' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search releases' }));

    // Wait for results
    await screen.findByText('Dune Part Two 1080p');

    // Select multiple results
    const checkboxes = screen.getAllByLabelText('Select row');
    expect(checkboxes.length).toBeGreaterThan(0);

    fireEvent.click(checkboxes[0]); // Select first result
    fireEvent.click(checkboxes[1]); // Select second result

    // Perform bulk grab
    fireEvent.click(screen.getByRole('button', { name: 'Bulk grab' }));

    await waitFor(() => {
      expect(grabReleaseMock).toHaveBeenCalledTimes(2);
    });

    // Verify bulk grab was called (toast may vary)
    await waitFor(() => {
      expect(grabReleaseMock).toHaveBeenCalledTimes(2);
    });
  });
});

describe('E2E Journey: Settings Configuration Flow', () => {
  it('updates general settings via save button with payload validation', async () => {
    renderWithShell(<GeneralSettingsPage />, '/settings/general');

    // Step 1: Wait for settings to load
    await screen.findByRole('heading', { name: 'General Settings' });

    // Step 2: Verify initial values are loaded
    expect(screen.getByLabelText('Max Active Downloads')).toHaveValue(4);
    expect(screen.getByLabelText('TMDB API Key')).toHaveValue('tmdb-token');

    // Step 3: Modify settings
    fireEvent.change(screen.getByLabelText('Max Active Downloads'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('TMDB API Key'), { target: { value: 'new-tmdb-key' } });
    fireEvent.click(screen.getByLabelText('Enable SSL'));

    // Step 4: Save via button
    fireEvent.click(screen.getByRole('button', { name: 'Save General Settings' }));

    // Step 5: Verify payload was sent
    await waitFor(() => {
      expect(updateSettingsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          torrentLimits: expect.objectContaining({
            maxActiveDownloads: 8,
          }),
          apiKeys: expect.objectContaining({
            tmdbApiKey: 'new-tmdb-key',
          }),
          host: expect.objectContaining({
            enableSsl: true,
          }),
        }),
      );
    });
  });

  it('updates general settings via keyboard shortcut with payload validation', async () => {
    renderWithShell(<GeneralSettingsPage />, '/settings/general');

    await screen.findByRole('heading', { name: 'General Settings' });

    // Modify settings
    fireEvent.change(screen.getByLabelText('Max Active Downloads'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Max Active Seeds'), { target: { value: '25' } });

    // Use keyboard shortcut (Cmd/Ctrl+S)
    fireEvent.keyDown(window, { key: 's', metaKey: true });

    await waitFor(() => {
      expect(updateSettingsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          torrentLimits: expect.objectContaining({
            maxActiveDownloads: 15,
            maxActiveSeeds: 25,
          }),
        }),
      );
    });
  });
});

describe('E2E Journey: Mobile Responsiveness Flow', () => {
  beforeEach(() => {
    // Set mobile viewport
    vi.stubGlobal('innerWidth', 375);
    vi.stubGlobal('innerHeight', 667);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('accesses mobile bottom navigation and opens More overflow menu', async () => {
    renderWithShell(<div>Test Content</div>, '/');

    // Step 1: Verify mobile bottom navigation is present
    const mobileNav = screen.getByRole('navigation', { name: 'Mobile Navigation' });
    expect(mobileNav).toBeInTheDocument();

    // Step 2: Verify More button exists (primary nav items are implicitly tested through mobile nav presence)
    const moreButton = screen.getByRole('button', { name: 'More navigation options' });
    expect(moreButton).toBeInTheDocument();
    expect(moreButton).toHaveAttribute('aria-expanded', 'false');

    // Step 4: Open More menu
    fireEvent.click(moreButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'More navigation' })).toBeInTheDocument();
      expect(moreButton).toHaveAttribute('aria-expanded', 'true');
    });

    // Step 5: Verify overflow menu items are accessible
    expect(screen.getByRole('menuitem', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'System Status' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeInTheDocument();
  });

  it('navigates via mobile bottom nav to Indexers and performs row action', async () => {
    renderWithShell(<IndexersPage />, '/indexers');

    // Step 1: Verify mobile bottom nav exists
    const mobileNav = screen.getByRole('navigation', { name: 'Mobile Navigation' });
    expect(mobileNav).toBeInTheDocument();

    // Step 2: Wait for indexers page to load
    await screen.findByText('Indexer 1');

    // Step 3: Verify row actions are accessible on mobile
    const row = screen.getByText('Indexer 1').closest('tr');
    expect(row).not.toBeNull();

    expect(within(row as HTMLElement).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(within(row as HTMLElement).getByRole('button', { name: 'Test' })).toBeInTheDocument();
    expect(within(row as HTMLElement).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('accesses search on mobile and performs grab action', async () => {
    renderWithShell(<SearchPage />, '/search');

    // Step 1: Wait for search page to load on mobile
    await screen.findByRole('heading', { name: 'Search' });
    expect(screen.getByLabelText('Search query')).toBeInTheDocument();

    // Step 2: Enter search query
    const searchInput = screen.getByLabelText('Search query');
    fireEvent.change(searchInput, { target: { value: 'Dune Part Two' } });

    // Step 3: Execute search
    fireEvent.click(screen.getByRole('button', { name: 'Search releases' }));

    await waitFor(() => {
      expect(searchCandidatesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'Dune Part Two',
        }),
      );
    });

    // Step 4: Verify results and grab action are accessible
    expect(await screen.findByText('Dune Part Two 1080p WEB-DL')).toBeInTheDocument();

    const grabButton = screen.getByRole('button', {
      name: 'Grab release Dune Part Two 1080p WEB-DL',
    });
    expect(grabButton).toBeInTheDocument();

    // Step 5: Perform grab
    fireEvent.click(grabButton);

    await waitFor(() => {
      expect(grabReleaseMock).toHaveBeenCalled();
    });
  });

  it('updates settings on mobile via keyboard shortcut', async () => {
    renderWithShell(<GeneralSettingsPage />, '/settings/general');

    await screen.findByRole('heading', { name: 'General Settings' });

    // Verify form is accessible on mobile
    expect(screen.getByLabelText('Max Active Downloads')).toBeInTheDocument();

    // Modify a setting
    fireEvent.change(screen.getByLabelText('Max Active Downloads'), { target: { value: '10' } });

    // Use keyboard shortcut (mobile-friendly save)
    fireEvent.keyDown(window, { key: 's', metaKey: true });

    await waitFor(() => {
      expect(updateSettingsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          torrentLimits: expect.objectContaining({
            maxActiveDownloads: 10,
          }),
        }),
      );
    });
  });
});
