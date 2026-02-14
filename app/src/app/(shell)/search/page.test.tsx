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

  mockedGetApiClients.mockReturnValue({
    indexerApi: {
      list: listIndexersMock,
    },
    releaseApi: {
      searchCandidates: searchCandidatesMock,
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
    expect(screen.getByText('torrent')).toBeInTheDocument();
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
    expect(screen.getByText('unknown')).toBeInTheDocument();
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
});
