import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BlocklistPage from './page';
import { getApiClients } from '@/lib/api/client';
import { useApiQuery } from '@/lib/query/useApiQuery';

// Mock the API clients
vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

// Mock the useApiQuery hook
vi.mock('@/lib/query/useApiQuery', () => ({
  useApiQuery: vi.fn(),
}));

// Mock the format utilities
vi.mock('@/lib/format', () => ({
  formatRelativeDate: (date: string) => 'Feb 15, 2026',
  formatBytesFromString: (bytes: number) => '1.2 GB',
}));

const mockedGetApiClients = vi.mocked(getApiClients);
const mockedUseApiQuery = vi.mocked(useApiQuery);

describe('BlocklistPage', () => {
  let queryClient: QueryClient;

  const mockBlocklistData = {
    items: [
      {
        id: 1,
        seriesId: 100,
        seriesTitle: 'Test Series',
        episodeId: 1000,
        seasonNumber: 1,
        episodeNumber: 1,
        releaseTitle: 'Test.Series.S01E01.1080p.WEB-DL',
        quality: 'HDTV-1080p',
        dateBlocked: '2026-02-15T10:00:00Z',
        reason: 'Quality check failed: expected HDTV-720p',
        indexer: 'TestIndexer',
        size: 1288490188,
      },
      {
        id: 2,
        seriesId: 101,
        seriesTitle: 'Another Series',
        episodeId: 1001,
        seasonNumber: 2,
        episodeNumber: 5,
        releaseTitle: 'Another.Series.S02E05.720p.HDTV',
        quality: 'HDTV-720p',
        dateBlocked: '2026-02-14T15:30:00Z',
        reason: 'Manual block by user',
        indexer: 'AnotherIndexer',
        size: 536870912,
      },
    ],
    meta: {
      page: 1,
      pageSize: 25,
      totalCount: 2,
      totalPages: 1,
    },
  };

  const mockEmptyBlocklistData = {
    items: [],
    meta: {
      page: 1,
      pageSize: 25,
      totalCount: 0,
      totalPages: 0,
    },
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
        },
      },
    });
    vi.clearAllMocks();

    mockedGetApiClients.mockReturnValue({
      blocklistApi: {
        list: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn(),
      },
    } as unknown as ReturnType<typeof getApiClients>);

    // Mock useApiQuery to return the mock data
    mockedUseApiQuery.mockReturnValue({
      data: mockBlocklistData,
      isPending: false,
      isError: false,
      isResolvedEmpty: false,
      error: null,
      refetch: vi.fn(),
    } as any);
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>,
    );
  };

  it('renders the blocklist page header', () => {
    renderWithQueryClient(<BlocklistPage />);

    expect(screen.getByText('Blocklist')).toBeInTheDocument();
    expect(screen.getByText('Manage blocked releases (Sonarr-style).')).toBeInTheDocument();
  });

  it('displays blocked releases in table view', () => {
    renderWithQueryClient(<BlocklistPage />);

    expect(screen.getAllByText('Test Series')).toHaveLength(2); // Mobile and desktop views
    expect(screen.getAllByText('Another Series')).toHaveLength(2);
    expect(screen.getAllByText('Test.Series.S01E01.1080p.WEB-DL')).toHaveLength(2);
    expect(screen.getAllByText('S01E01')).toHaveLength(2);
    expect(screen.getAllByText('HDTV-1080p')).toHaveLength(2);
  });

  it('displays empty state when no blocked releases', () => {
    mockedUseApiQuery.mockReturnValue({
      data: mockEmptyBlocklistData,
      isPending: false,
      isError: false,
      isResolvedEmpty: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<BlocklistPage />);

    expect(screen.getByText('Blocklist is empty')).toBeInTheDocument();
    expect(screen.getByText('Releases will be added to the blocklist when they fail quality checks or are manually blocked.')).toBeInTheDocument();
  });

  it('shows loading state while fetching data', () => {
    mockedUseApiQuery.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      isResolvedEmpty: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<BlocklistPage />);

    // Should not show empty state when loading
    expect(screen.queryByText('Blocklist is empty')).not.toBeInTheDocument();
  });

  it('allows selecting rows with checkboxes', async () => {
    renderWithQueryClient(<BlocklistPage />);

    expect(screen.getAllByRole('checkbox')).toHaveLength(4); // 2 for mobile, 2 for desktop

    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[0]);

    expect(checkboxes[0]).toBeChecked();
  });

  it('displays mobile card view on small screens', () => {
    renderWithQueryClient(<BlocklistPage />);

    expect(screen.getAllByText('Test Series')).toHaveLength(2);

    // Mobile card view should include episode, quality, date, and reason
    expect(screen.getAllByText('Episode:')).toHaveLength(2);
    expect(screen.getAllByText('Quality:')).toHaveLength(2);
    expect(screen.getAllByText('Date:')).toHaveLength(2);
    expect(screen.getAllByText('Reason:')).toHaveLength(2);
  });
});
