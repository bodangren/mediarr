/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { IndexerCatalogPanel } from './IndexerCatalogPanel.js';
import type { CatalogEntry } from '@/lib/api/indexerApi.js';

const mockCatalog: CatalogEntry[] = [
  {
    id: '1337x',
    name: '1337x',
    description: 'Popular public torrent site.',
    type: 'torznab',
    baseUrl: 'https://1337x.to',
    categories: ['TV', 'MOVIE'],
    requiresApiKey: false,
    signupUrl: 'https://1337x.to',
    implementation: 'Cardigann',
    configContract: 'CardigannSettings',
    supportedMediaTypes: ['TV', 'MOVIE'],
    supportsSearch: true,
    supportsRss: false,
    isConfigured: false,
  },
  {
    id: 'yts',
    name: 'YTS',
    description: 'High-quality movie torrents.',
    type: 'torznab',
    baseUrl: 'https://yts.mx',
    categories: ['MOVIE'],
    requiresApiKey: false,
    signupUrl: 'https://yts.mx',
    implementation: 'Cardigann',
    configContract: 'CardigannSettings',
    supportedMediaTypes: ['MOVIE'],
    supportsSearch: true,
    supportsRss: false,
    isConfigured: true,
  },
  {
    id: 'nzbgear',
    name: 'NZBGeek',
    description: 'Popular semi-private usenet indexer.',
    type: 'newznab',
    baseUrl: 'https://api.nzbgamer.com',
    categories: ['TV', 'MOVIE'],
    requiresApiKey: true,
    signupUrl: 'https://nzbgamer.com',
    implementation: 'Newznab',
    configContract: 'NewznabSettings',
    supportedMediaTypes: ['TV', 'MOVIE'],
    supportsSearch: true,
    supportsRss: true,
    isConfigured: false,
  },
  {
    id: 'hdbits',
    name: 'HDBits',
    description: 'Premium private usenet indexer.',
    type: 'newznab',
    baseUrl: 'https://hdbits.org',
    categories: ['TV', 'MOVIE'],
    requiresApiKey: true,
    signupUrl: 'https://hdbits.org',
    implementation: 'Newznab',
    configContract: 'NewznabSettings',
    supportedMediaTypes: ['TV', 'MOVIE'],
    supportsSearch: true,
    supportsRss: true,
    isConfigured: false,
  },
];

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({
    indexerApi: {
      getCatalog: vi.fn(),
      addFromCatalog: vi.fn(),
    },
  })),
}));

vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({
    pushToast: vi.fn(),
  }),
}));

const mockAddFromCatalog = vi.fn();
const mockGetCatalog = vi.fn();

function getMockApi() {
  return {
    indexerApi: {
      getCatalog: mockGetCatalog,
      addFromCatalog: mockAddFromCatalog,
    },
  };
}

async function importAndConfigureMocks() {
  const { getApiClients } = await import('@/lib/api/client');
  vi.mocked(getApiClients).mockImplementation(getMockApi as any);
}

function getCatalogEntry(name: string) {
  return within(screen.getByRole('article', { name }));
}

describe('IndexerCatalogPanel', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await importAndConfigureMocks();
  });

  it('shows loading state initially', async () => {
    mockGetCatalog.mockImplementation(() => new Promise(() => {}));
    render(<IndexerCatalogPanel />);
    expect(screen.getByText(/loading catalog/i)).toBeInTheDocument();
  });

  it('shows error state when catalog fetch fails', async () => {
    mockGetCatalog.mockRejectedValue(new Error('Network error'));
    render(<IndexerCatalogPanel />);
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('renders catalog grouped by privacy type', async () => {
    mockGetCatalog.mockResolvedValue(mockCatalog);
    render(<IndexerCatalogPanel />);
    await waitFor(() => {
      expect(screen.getByText(/^public indexers$/i)).toBeInTheDocument();
      expect(screen.getByText(/^semi-private indexers$/i)).toBeInTheDocument();
      expect(screen.getByText(/^private indexers$/i)).toBeInTheDocument();
    });
  });

  it('renders public indexer cards with one-click add', async () => {
    mockGetCatalog.mockResolvedValue(mockCatalog);
    render(<IndexerCatalogPanel />);
    await waitFor(() => {
      expect(screen.getByText('1337x')).toBeInTheDocument();
      expect(screen.getByText('YTS')).toBeInTheDocument();
    });
    expect(getCatalogEntry('1337x').getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('renders configured indexers as already added', async () => {
    mockGetCatalog.mockResolvedValue(mockCatalog);
    render(<IndexerCatalogPanel />);
    await waitFor(() => {
      expect(screen.getByText('YTS')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /already added/i })).toBeInTheDocument();
  });

  it('renders private indexers with API key input', async () => {
    mockGetCatalog.mockResolvedValue(mockCatalog);
    render(<IndexerCatalogPanel />);
    await waitFor(() => {
      expect(getCatalogEntry('NZBGeek').getByPlaceholderText(/enter api key/i)).toBeInTheDocument();
    });
  });

  it('shows signup and add buttons for private indexers', async () => {
    mockGetCatalog.mockResolvedValue(mockCatalog);
    render(<IndexerCatalogPanel />);
    await waitFor(() => {
      expect(getCatalogEntry('NZBGeek').getByRole('button', { name: /sign up/i })).toBeInTheDocument();
      expect(getCatalogEntry('NZBGeek').getByRole('button', { name: 'Add' })).toBeInTheDocument();
    });
  });

  it('calls addFromCatalog when adding a public indexer', async () => {
    mockGetCatalog.mockResolvedValue(mockCatalog);
    mockAddFromCatalog.mockResolvedValue({ id: 1 } as any);
    render(<IndexerCatalogPanel />);
    await waitFor(() => {
      expect(screen.getByText('1337x')).toBeInTheDocument();
    });
    fireEvent.click(getCatalogEntry('1337x').getByRole('button', { name: 'Add' }));
    await waitFor(() => {
      expect(mockAddFromCatalog).toHaveBeenCalledWith('1337x', undefined);
    });
  });

  it('validates API key is required for private indexers', async () => {
    mockGetCatalog.mockResolvedValue(mockCatalog);
    render(<IndexerCatalogPanel />);
    await waitFor(() => {
      expect(getCatalogEntry('NZBGeek').getByPlaceholderText(/enter api key/i)).toBeInTheDocument();
    });
    fireEvent.click(getCatalogEntry('NZBGeek').getByRole('button', { name: 'Add' }));
    await waitFor(() => {
      expect(mockAddFromCatalog).not.toHaveBeenCalled();
    });
  });

  it('calls addFromCatalog with API key for private indexers', async () => {
    mockGetCatalog.mockResolvedValue(mockCatalog);
    mockAddFromCatalog.mockResolvedValue({ id: 1 } as any);
    render(<IndexerCatalogPanel />);
    await waitFor(() => {
      expect(getCatalogEntry('NZBGeek').getByPlaceholderText(/enter api key/i)).toBeInTheDocument();
    });
    const entry = getCatalogEntry('NZBGeek');
    const apiKeyInput = entry.getByPlaceholderText(/enter api key/i);
    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });
    fireEvent.click(entry.getByRole('button', { name: 'Add' }));
    await waitFor(() => {
      expect(mockAddFromCatalog).toHaveBeenCalledWith('nzbgear', 'test-api-key');
    });
  });

  it('renders empty message when catalog is empty', async () => {
    mockGetCatalog.mockResolvedValue([]);
    render(<IndexerCatalogPanel />);
    await waitFor(() => {
      expect(screen.getByText(/no indexers available/i)).toBeInTheDocument();
    });
  });

  it('has a refresh button', async () => {
    mockGetCatalog.mockResolvedValue(mockCatalog);
    render(<IndexerCatalogPanel />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
  });
});
