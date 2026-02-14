import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getApiClients } from '@/lib/api/client';
import IndexerStatsPage from './page';

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

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

const mockedGetApiClients = vi.mocked(getApiClients);
const listMock = vi.fn<() => Promise<IndexerFixture[]>>();

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderPage(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <IndexerStatsPage />
    </QueryClientProvider>,
  );
}

describe('indexer stats page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMock.mockResolvedValue([]);
    mockedGetApiClients.mockReturnValue({
      indexerApi: {
        list: listMock,
      },
    } as ReturnType<typeof getApiClients>);
  });

  it('renders stat cards and chart sections from indexer telemetry', async () => {
    listMock.mockResolvedValue([
      {
        id: 1,
        name: 'Alpha',
        implementation: 'Torznab',
        configContract: 'TorznabSettings',
        settings: '{}',
        protocol: 'torrent',
        enabled: true,
        supportsRss: true,
        supportsSearch: true,
        priority: 10,
        health: { failureCount: 0, lastErrorMessage: null },
      },
      {
        id: 2,
        name: 'Beta',
        implementation: 'Torznab',
        configContract: 'NewznabSettings',
        settings: '{}',
        protocol: 'usenet',
        enabled: false,
        supportsRss: true,
        supportsSearch: false,
        priority: 30,
        health: { failureCount: 2, lastErrorMessage: 'Auth failed' },
      },
      {
        id: 3,
        name: 'Gamma',
        implementation: 'Cardigann',
        configContract: 'TorznabSettings',
        settings: '{}',
        protocol: 'torrent',
        enabled: true,
        supportsRss: false,
        supportsSearch: true,
        priority: 20,
        health: { failureCount: 1, lastErrorMessage: 'Timeout' },
      },
    ]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    expect(await screen.findByRole('heading', { name: 'Indexer Stats' })).toBeInTheDocument();
    expect(await screen.findByText('Total Indexers')).toBeInTheDocument();
    expect(screen.getByText('Total Indexers')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Active Indexers')).toBeInTheDocument();
    expect(screen.getByText('Failed Indexers')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Queries by Protocol' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Failure Rate by Indexer' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Capability Mix' })).toBeInTheDocument();

    expect(screen.getByTestId('stacked-bar-torrent')).toBeInTheDocument();
    expect(screen.getByTestId('bar-alpha')).toBeInTheDocument();
    expect(screen.getByTestId('doughnut-rss-search')).toBeInTheDocument();
  });

  it('shows an empty query panel when no indexers are configured', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    expect(await screen.findByText('No indexer stats available')).toBeInTheDocument();
    expect(screen.getByText('Add indexers to view performance telemetry.')).toBeInTheDocument();
  });
});
