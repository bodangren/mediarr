import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReleaseCandidate } from '@/lib/api';
import { getApiClients } from '@/lib/api/client';
import SearchPage from './page';

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

const mockedGetApiClients = vi.mocked(getApiClients);

const listIndexersMock = vi.fn();
const listDownloadClientsMock = vi.fn();
const searchCandidatesMock = vi.fn();
const grabReleaseMock = vi.fn();
const grabCandidateMock = vi.fn();

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

function renderPage(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <SearchPage />
    </QueryClientProvider>,
  );
}

function paginated(items: ReleaseCandidate[]) {
  return {
    items,
    meta: {
      page: 1,
      pageSize: 100,
      totalCount: items.length,
      totalPages: 1,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  listIndexersMock.mockResolvedValue([
    {
      id: 10,
      name: 'Indexer A',
      implementation: 'Torznab',
      configContract: 'TorznabSettings',
      settings: '{}',
      protocol: 'torrent',
      enabled: true,
      supportsRss: true,
      supportsSearch: true,
      priority: 25,
    },
    {
      id: 20,
      name: 'Indexer B',
      implementation: 'Torznab',
      configContract: 'TorznabSettings',
      settings: '{}',
      protocol: 'usenet',
      enabled: true,
      supportsRss: true,
      supportsSearch: true,
      priority: 20,
    },
  ]);

  listDownloadClientsMock.mockResolvedValue([
    {
      id: 1,
      name: 'qBittorrent',
      implementation: 'QBittorrent',
      configContract: 'QBittorrentSettings',
      settings: '{}',
      protocol: 'torrent',
      host: 'localhost',
      port: 8080,
      category: null,
      priority: 1,
      enabled: true,
    },
    {
      id: 2,
      name: 'SABnzbd',
      implementation: 'Sabnzbd',
      configContract: 'SabnzbdSettings',
      settings: '{}',
      protocol: 'usenet',
      host: 'localhost',
      port: 8081,
      category: null,
      priority: 2,
      enabled: true,
    },
  ]);

  searchCandidatesMock.mockResolvedValue(
    paginated([
      {
        indexer: 'Indexer A',
        indexerId: 10,
        guid: 'guid-abc123',
        title: 'Dune Part Two 1080p WEB-DL',
        size: 4_294_967_296,
        seeders: 140,
        quality: '1080p',
        age: 2,
        categories: [2000],
        protocol: 'torrent',
        magnetUrl: 'magnet:?xt=urn:btih:abc123',
      },
    ]),
  );

  grabReleaseMock.mockResolvedValue({
    success: true,
    downloadId: 'abc123',
    message: 'grabbed',
  });

  mockedGetApiClients.mockReturnValue({
    indexerApi: {
      list: listIndexersMock,
    },
    downloadClientApi: {
      list: listDownloadClientsMock,
    },
    releaseApi: {
      searchCandidates: searchCandidatesMock,
      grabRelease: grabReleaseMock,
      grabCandidate: grabCandidateMock,
    },
  } as ReturnType<typeof getApiClients>);
});

describe('search page', () => {
  it('renders search controls with indexer and download client options', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    expect(screen.getByRole('heading', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByLabelText('Search query')).toBeInTheDocument();
    expect(screen.getByLabelText('Search type')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Indexer')).toBeInTheDocument();
    expect(screen.getByLabelText('Download client')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Indexer A' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Indexer B' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'qBittorrent' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'SABnzbd' })).toBeInTheDocument();
    });
  });

  it('renders type-specific query parameter modal fields and passes values to search', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    fireEvent.change(screen.getByLabelText('Search query'), { target: { value: 'Dune Part Two' } });
    fireEvent.change(screen.getByLabelText('Search type'), { target: { value: 'tvsearch' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: '2000' } });

    fireEvent.click(screen.getByRole('button', { name: 'Query parameters' }));
    expect(await screen.findByRole('dialog', { name: 'Query parameters' })).toBeInTheDocument();
    expect(screen.getByLabelText('Season')).toBeInTheDocument();
    expect(screen.getByLabelText('Episode')).toBeInTheDocument();
    expect(screen.getByLabelText('TVDB ID')).toBeInTheDocument();
    expect(screen.queryByLabelText('IMDB ID')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Season'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Episode'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('TVDB ID'), { target: { value: '80348' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply parameters' }));

    fireEvent.click(screen.getByRole('button', { name: 'Search releases' }));

    await waitFor(() => {
      expect(searchCandidatesMock).toHaveBeenCalledWith({
        query: 'Dune Part Two',
        type: 'tvsearch',
        categories: [2000],
        season: 1,
        episode: 2,
        tvdbId: 80348,
        page: 1,
        pageSize: 100,
        sortBy: 'seeders',
        sortDir: 'desc',
      });
    });

    expect(await screen.findByText('Dune Part Two 1080p WEB-DL')).toBeInTheDocument();
    expect(screen.getAllByText('Indexer A').length).toBeGreaterThan(0);
  });

  it('sends selected download client when grabbing a release', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await screen.findByRole('option', { name: 'SABnzbd' });
    fireEvent.change(screen.getByLabelText('Download client'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Search query'), { target: { value: 'grab candidate' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search releases' }));

    expect(await screen.findByText('Dune Part Two 1080p WEB-DL')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Grab release Dune Part Two 1080p WEB-DL' }));

    await waitFor(() => {
      expect(grabReleaseMock).toHaveBeenCalledWith('guid-abc123', 10, 2);
    });
  });

  it('filters results by indexer, category, and quality', async () => {
    searchCandidatesMock.mockResolvedValueOnce(
      paginated([
        {
          indexer: 'Indexer A',
          indexerId: 10,
          guid: 'guid-a',
          title: 'A 1080p Action',
          size: 5_368_709_120,
          seeders: 120,
          age: 1,
          quality: '1080p',
          categories: [2000],
          protocol: 'torrent',
          magnetUrl: 'magnet:?xt=urn:btih:fit1',
        },
        {
          indexer: 'Indexer B',
          indexerId: 20,
          guid: 'guid-b',
          title: 'B 2160p Action',
          size: 5_368_709_120,
          seeders: 220,
          age: 1,
          quality: '2160p',
          categories: [5000],
          protocol: 'torrent',
          magnetUrl: 'magnet:?xt=urn:btih:fit2',
        },
      ]),
    );

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    fireEvent.change(screen.getByLabelText('Search query'), { target: { value: 'filter candidates' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search releases' }));

    expect(await screen.findByText('A 1080p Action')).toBeInTheDocument();
    expect(screen.getByText('B 2160p Action')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Indexer filter'), { target: { value: 'Indexer A' } });
    fireEvent.change(screen.getByLabelText('Category filter'), { target: { value: '2000' } });
    fireEvent.change(screen.getByLabelText('Quality filter'), { target: { value: '1080p' } });

    expect(screen.getByText('A 1080p Action')).toBeInTheDocument();
    expect(screen.queryByText('B 2160p Action')).not.toBeInTheDocument();
  });

  it('supports override modal fields and sends overridden values to grab request', async () => {
    grabCandidateMock.mockResolvedValueOnce({
      success: true,
      downloadId: 'override-1',
      message: 'override grabbed',
    });

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    fireEvent.change(screen.getByLabelText('Search query'), { target: { value: 'override candidate' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search releases' }));

    expect(await screen.findByText('Dune Part Two 1080p WEB-DL')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Override match Dune Part Two 1080p WEB-DL' }));

    expect(await screen.findByRole('dialog', { name: 'Override release match' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Override title'), { target: { value: 'Overridden Title' } });
    fireEvent.change(screen.getByLabelText('Category override'), { target: { value: '5000,5030' } });
    fireEvent.change(screen.getByLabelText('Quality override'), { target: { value: 'Remux-2160p' } });
    fireEvent.change(screen.getByLabelText('Language override'), { target: { value: 'en' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply override' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Override release match' })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Grab release Overridden Title' }));

    await waitFor(() => {
      expect(grabCandidateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Overridden Title',
          quality: 'Remux-2160p',
          categories: [5000, 5030],
          language: 'en',
        }),
      );
    });
  });
});
