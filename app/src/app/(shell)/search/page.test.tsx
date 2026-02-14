import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getApiClients } from '@/lib/api/client';
import SearchPage from './page';

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

const mockedGetApiClients = vi.mocked(getApiClients);

const listIndexersMock = vi.fn();
const searchCandidatesMock = vi.fn();
const grabReleaseMock = vi.fn();

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

  mockedGetApiClients.mockReturnValue({
    indexerApi: {
      list: listIndexersMock,
    },
    releaseApi: {
      searchCandidates: searchCandidatesMock,
      grabRelease: grabReleaseMock,
    },
  } as ReturnType<typeof getApiClients>);
});

describe('search page', () => {
  it('renders search controls with indexer options', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    expect(screen.getByRole('heading', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByLabelText('Search query')).toBeInTheDocument();
    expect(screen.getByLabelText('Search type')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Indexer')).toBeInTheDocument();
    expect(screen.getByLabelText('Limit')).toBeInTheDocument();
    expect(screen.getByLabelText('Offset')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Indexer A' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Indexer B' })).toBeInTheDocument();
    });
  });

  it('submits search parameters and renders result rows', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await screen.findByRole('option', { name: 'Indexer A' });

    fireEvent.change(screen.getByLabelText('Search query'), { target: { value: 'Dune Part Two' } });
    fireEvent.change(screen.getByLabelText('Search type'), { target: { value: 'movie' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: '2000' } });
    fireEvent.change(screen.getByLabelText('Indexer'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Limit'), { target: { value: '75' } });
    fireEvent.change(screen.getByLabelText('Offset'), { target: { value: '15' } });

    fireEvent.click(screen.getByRole('button', { name: 'Show advanced options' }));
    fireEvent.change(screen.getByLabelText('Season'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Episode'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2024' } });

    fireEvent.click(screen.getByRole('button', { name: 'Search releases' }));

    await waitFor(() => {
      expect(searchCandidatesMock).toHaveBeenCalledWith({
        query: 'Dune Part Two',
        searchType: 'movie',
        category: '2000',
        indexerId: 10,
        limit: 75,
        offset: 15,
        season: 1,
        episode: 2,
        year: 2024,
      });
    });

    expect(await screen.findByText('Dune Part Two 1080p WEB-DL')).toBeInTheDocument();
    expect(screen.getAllByText('Indexer A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('torrent').length).toBeGreaterThan(0);
  });

  it('renders search-specific columns with row fallbacks and indexer flags', async () => {
    searchCandidatesMock.mockResolvedValueOnce([
      {
        indexer: 'Indexer A',
        title: 'Dune Part Two 1080p WEB-DL',
        size: 4_294_967_296,
        seeders: 140,
        age: 2,
        magnetUrl: 'magnet:?xt=urn:btih:abc123',
        indexerFlags: 'freeleech,vip',
      },
      {
        indexer: 'Indexer B',
        title: 'Fallback Release',
        size: 1_073_741_824,
        seeders: 5,
      },
    ]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    fireEvent.change(screen.getByLabelText('Search query'), { target: { value: 'fallback case' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search releases' }));

    expect(await screen.findByRole('columnheader', { name: 'Protocol' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Age' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Title' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Indexer' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Flags' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Size' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Seeders' })).toBeInTheDocument();

    expect(screen.getByText('freeleech')).toBeInTheDocument();
    expect(screen.getByText('vip')).toBeInTheDocument();
    expect(screen.getByText('Fallback Release')).toBeInTheDocument();
    expect(screen.getAllByText('unknown').length).toBeGreaterThan(0);
    expect(screen.getByText('- d')).toBeInTheDocument();
  });

  it('shows empty state when search returns no rows', async () => {
    searchCandidatesMock.mockResolvedValueOnce([]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    fireEvent.change(screen.getByLabelText('Search query'), { target: { value: 'missing title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search releases' }));

    expect(await screen.findByText('No results')).toBeInTheDocument();
    expect(screen.getByText('Try broader criteria or a different indexer selection.')).toBeInTheDocument();
  });

  it('shows query error panel when search request fails', async () => {
    searchCandidatesMock.mockRejectedValueOnce(new Error('search backend unavailable'));

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    fireEvent.change(screen.getByLabelText('Search query'), { target: { value: 'error case' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search releases' }));

    expect(await screen.findByText('Could not load data')).toBeInTheDocument();
    expect(screen.getByText('search backend unavailable')).toBeInTheDocument();
  });

  it('supports row-level grab and download actions', async () => {
    searchCandidatesMock.mockResolvedValueOnce([
      {
        indexer: 'Indexer A',
        title: 'Grab Candidate',
        size: 4_294_967_296,
        seeders: 140,
        age: 2,
        magnetUrl: 'magnet:?xt=urn:btih:abc123',
      },
    ]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    fireEvent.change(screen.getByLabelText('Search query'), { target: { value: 'grab candidate' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search releases' }));

    expect(await screen.findByText('Grab Candidate')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Grab release Grab Candidate' }));

    await waitFor(() => {
      expect(grabReleaseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Grab Candidate',
          indexer: 'Indexer A',
          magnetUrl: 'magnet:?xt=urn:btih:abc123',
        }),
      );
    });

    expect(screen.getByRole('link', { name: 'Download release Grab Candidate' })).toHaveAttribute(
      'href',
      'magnet:?xt=urn:btih:abc123',
    );
  });

  it('opens override modal and applies an override title', async () => {
    searchCandidatesMock.mockResolvedValueOnce([
      {
        indexer: 'Indexer A',
        title: 'Needs Override',
        size: 4_294_967_296,
        seeders: 140,
        age: 2,
        magnetUrl: 'magnet:?xt=urn:btih:abc123',
      },
    ]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    fireEvent.change(screen.getByLabelText('Search query'), { target: { value: 'override candidate' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search releases' }));

    expect(await screen.findByText('Needs Override')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Override match Needs Override' }));

    expect(await screen.findByRole('dialog', { name: 'Override release match' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Override title'), { target: { value: 'Override Applied Title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply override' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Override release match' })).not.toBeInTheDocument();
    });
    expect(screen.getByText('Override Applied Title')).toBeInTheDocument();
  });

  it('supports bulk grab for selected rows', async () => {
    searchCandidatesMock.mockResolvedValueOnce([
      {
        indexer: 'Indexer A',
        title: 'Bulk One',
        size: 4_294_967_296,
        seeders: 140,
        age: 2,
        magnetUrl: 'magnet:?xt=urn:btih:bulk1',
      },
      {
        indexer: 'Indexer B',
        title: 'Bulk Two',
        size: 3_221_225_472,
        seeders: 100,
        age: 3,
        magnetUrl: 'magnet:?xt=urn:btih:bulk2',
      },
    ]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    fireEvent.change(screen.getByLabelText('Search query'), { target: { value: 'bulk candidate' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search releases' }));

    expect(await screen.findByText('Bulk One')).toBeInTheDocument();
    expect(screen.getByText('Bulk Two')).toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText('Select row')[0]);
    fireEvent.click(screen.getAllByLabelText('Select row')[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Bulk grab' }));

    await waitFor(() => {
      expect(grabReleaseMock).toHaveBeenCalledTimes(2);
    });
  });

  it('filters results by protocol, minimum size, and minimum seeders', async () => {
    searchCandidatesMock.mockResolvedValueOnce([
      {
        indexer: 'Indexer A',
        title: 'Torrent Large',
        size: 5_368_709_120,
        seeders: 120,
        age: 1,
        magnetUrl: 'magnet:?xt=urn:btih:fit1',
      },
      {
        indexer: 'Indexer B',
        title: 'Usenet Large',
        size: 5_368_709_120,
        seeders: 200,
        age: 1,
        downloadUrl: 'https://example.com/file.nzb',
      },
      {
        indexer: 'Indexer C',
        title: 'Torrent Small',
        size: 1_073_741_824,
        seeders: 20,
        age: 1,
        magnetUrl: 'magnet:?xt=urn:btih:fit2',
      },
    ]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    fireEvent.change(screen.getByLabelText('Search query'), { target: { value: 'filter candidates' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search releases' }));

    expect(await screen.findByText('Torrent Large')).toBeInTheDocument();
    expect(screen.getByText('Usenet Large')).toBeInTheDocument();
    expect(screen.getByText('Torrent Small')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Protocol filter'), { target: { value: 'torrent' } });
    fireEvent.change(screen.getByLabelText('Minimum size (GB)'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Minimum seeders'), { target: { value: '50' } });

    expect(screen.getByText('Torrent Large')).toBeInTheDocument();
    expect(screen.queryByText('Usenet Large')).not.toBeInTheDocument();
    expect(screen.queryByText('Torrent Small')).not.toBeInTheDocument();
  });

  it('applies custom filter builder rules to search results', async () => {
    searchCandidatesMock.mockResolvedValueOnce([
      {
        indexer: 'Indexer A',
        title: 'VIP Exclusive Pack',
        size: 4_294_967_296,
        seeders: 120,
        age: 1,
        magnetUrl: 'magnet:?xt=urn:btih:vip',
      },
      {
        indexer: 'Indexer B',
        title: 'Regular Pack',
        size: 4_294_967_296,
        seeders: 120,
        age: 1,
        magnetUrl: 'magnet:?xt=urn:btih:reg',
      },
    ]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    fireEvent.change(screen.getByLabelText('Search query'), { target: { value: 'custom filter candidates' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search releases' }));

    expect(await screen.findByText('VIP Exclusive Pack')).toBeInTheDocument();
    expect(screen.getByText('Regular Pack')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show custom filters' }));
    fireEvent.change(screen.getByLabelText('Field 1'), { target: { value: 'title' } });
    fireEvent.change(screen.getByLabelText('Operator 1'), { target: { value: 'contains' } });
    fireEvent.change(screen.getByLabelText('Value 1'), { target: { value: 'vip' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));

    expect(screen.getByText('VIP Exclusive Pack')).toBeInTheDocument();
    expect(screen.queryByText('Regular Pack')).not.toBeInTheDocument();
  });
});
