'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import SystemStatusPage from './page';

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

interface SystemStatusFixture {
  health: {
    overall: 'ok' | 'warning' | 'error' | 'unknown';
    checks: Array<{
      type: string;
      source: string;
      message: string;
      status: 'ok' | 'warning' | 'error' | 'unknown';
      lastChecked?: string;
    }>;
  };
  system: {
    version: string;
    branch: string;
    commit: string;
    startTime: string;
    uptime: number;
    dotNetVersion?: string;
    os: string;
    osVersion?: string;
    isMono?: boolean;
    isLinux?: boolean;
    isWindows?: boolean;
    isDocker?: boolean;
  };
  database: {
    type: string;
    version: string;
    migration: string;
    location: string;
  };
  diskSpace: Array<{
    path: string;
    label: string;
    free: number;
    total: number;
  }>;
  dependencies: {
    required: Array<{
      name: string;
      version: string;
      status: 'ok' | 'warning' | 'error' | 'unknown';
    }>;
    optional: Array<{
      name: string;
      version?: string;
      status: 'ok' | 'warning' | 'error' | 'unknown';
      reason?: string;
    }>;
  };
}

function buildSystemStatus(overrides: Partial<SystemStatusFixture> = {}): SystemStatusFixture {
  return {
    health: {
      overall: 'ok',
      checks: [
        {
          type: 'Indexer Proxy',
          source: 'System',
          message: 'All indexer proxies are healthy',
          status: 'ok',
          lastChecked: '2026-02-15T04:13:00Z',
        },
        {
          type: 'Download Client',
          source: 'Transmission',
          message: 'Download client is responding',
          status: 'ok',
          lastChecked: '2026-02-15T04:13:00Z',
        },
      ],
    },
    system: {
      version: '1.0.0',
      branch: 'main',
      commit: 'abc123def456',
      startTime: '2026-02-15T00:00:00Z',
      uptime: 12345,
      os: 'Linux',
      osVersion: 'Ubuntu 22.04',
      isLinux: true,
      isDocker: true,
    },
    database: {
      type: 'SQLite',
      version: '3.40.0',
      migration: '123',
      location: '/config/mediarr.db',
    },
    diskSpace: [
      {
        path: '/data',
        label: 'Data',
        free: 500000000000,
        total: 1000000000000,
      },
      {
        path: '/config',
        label: 'Config',
        free: 100000000000,
        total: 200000000000,
      },
    ],
    dependencies: {
      required: [
        {
          name: 'Node.js',
          version: '20.10.0',
          status: 'ok',
        },
        {
          name: 'SQLite',
          version: '3.40.0',
          status: 'ok',
        },
      ],
      optional: [
        {
          name: 'FFmpeg',
          version: '6.0.0',
          status: 'ok',
        },
        {
          name: 'HandBrake',
          status: 'warning',
          reason: 'Not installed',
        },
      ],
    },
    ...overrides,
  };
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });
}

function renderPage(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <SystemStatusPage />
    </QueryClientProvider>,
  );
}

const mockedGetApiClients = vi.mocked(getApiClients);
const getStatusMock = vi.fn<() => Promise<SystemStatusFixture>>();

beforeEach(() => {
  vi.clearAllMocks();
  getStatusMock.mockResolvedValue(buildSystemStatus());
  mockedGetApiClients.mockReturnValue({
    systemApi: {
      getStatus: getStatusMock,
      getHealth: vi.fn(),
      isHealthy: vi.fn(),
    },
  } as unknown as ReturnType<typeof getApiClients>);
});

describe('System Status Page', () => {
  it('should render the page header', () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    expect(screen.getByText('System Status')).toBeInTheDocument();
    expect(
      screen.getByText('System health, dependencies, and runtime diagnostics.'),
    ).toBeInTheDocument();
  });

  it('should render health status cards', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await waitFor(() => {
      expect(screen.getByText('Health')).toBeInTheDocument();
    });

    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Warnings')).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(2);
    expect(screen.getByText('Errors')).toBeInTheDocument();
  });

  it('should render health check list', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await waitFor(() => {
      expect(screen.getByText('System')).toBeInTheDocument();
    });

    expect(screen.getByText('Indexer Proxy')).toBeInTheDocument();
    expect(screen.getByText('All indexer proxies are healthy')).toBeInTheDocument();
    expect(screen.getByText('Transmission')).toBeInTheDocument();
    expect(screen.getByText('Download Client')).toBeInTheDocument();
  });

  it('should render system information', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await waitFor(() => {
      expect(screen.getByText('About')).toBeInTheDocument();
    });

    expect(screen.getByText('Version Information')).toBeInTheDocument();
    expect(screen.getByText('Runtime Information')).toBeInTheDocument();
    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.getByText('Environment')).toBeInTheDocument();
  });

  it('should render database information', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    const databaseSection = await waitFor(() => screen.getByText('Database'));
    expect(databaseSection).toBeInTheDocument();

    // Find the Database section and verify it contains SQLite
    const databaseParent = databaseSection.closest('section');
    expect(databaseParent).toHaveTextContent('SQLite');
    expect(databaseParent).toHaveTextContent(/Version/);
    expect(databaseParent).toHaveTextContent(/Migration/);
  });

  it('should render disk space information', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await waitFor(() => {
      expect(screen.getByText('Disk Space')).toBeInTheDocument();
    });

    expect(screen.getByText('Data')).toBeInTheDocument();
    expect(screen.getByText('/data')).toBeInTheDocument();
    expect(screen.getByText('Config')).toBeInTheDocument();
    expect(screen.getByText('/config')).toBeInTheDocument();
  });

  it('should render dependencies section', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    const dependenciesSection = await waitFor(() => screen.getByText('Dependencies'));
    expect(dependenciesSection).toBeInTheDocument();

    // Find the Dependencies section and verify it contains the required elements
    const dependenciesParent = dependenciesSection.closest('section');
    expect(dependenciesParent).toHaveTextContent('Required Dependencies');
    expect(dependenciesParent).toHaveTextContent('Optional Dependencies');
    expect(dependenciesParent).toHaveTextContent('Node.js');
    expect(dependenciesParent).toHaveTextContent('SQLite');
    expect(dependenciesParent).toHaveTextContent('FFmpeg');
    expect(dependenciesParent).toHaveTextContent('HandBrake');
  });

  it('should handle loading state', () => {
    getStatusMock.mockReturnValue(new Promise(() => {}));
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('should handle error state', async () => {
    getStatusMock.mockRejectedValue(new Error('Failed to fetch'));
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load system status/i)).toBeInTheDocument();
    });
  });

  it('should calculate health counts correctly', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await waitFor(() => {
      expect(screen.getByText('Health')).toBeInTheDocument();
    });

    // Default mock has 2 OK checks, 0 warnings, 0 errors
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Warnings')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    expect(screen.getByText('Errors')).toBeInTheDocument();
  });
});
