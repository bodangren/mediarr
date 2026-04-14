import { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsIndexersPage } from './SettingsIndexersPage';
import type { DiscoveredService } from '@/lib/api/indexerApi';

vi.mock('@/components/providers/ToastProvider', () => ({
  ToastProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useToast: () => ({ pushToast: vi.fn() }),
}));

const mockApi = vi.hoisted(() => ({
  indexerApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    test: vi.fn(),
    testDraft: vi.fn(),
    getCatalog: vi.fn(),
    addFromCatalog: vi.fn(),
    detect: vi.fn(),
    importFrom: vi.fn(),
  },
}));

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => mockApi),
}));

describe('SettingsIndexersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.indexerApi.list.mockResolvedValue([]);
    mockApi.indexerApi.detect.mockResolvedValue([]);
  });

  it('renders loading state while detecting LAN services', () => {
    mockApi.indexerApi.detect.mockImplementation(() => new Promise(() => {}));
    render(<SettingsIndexersPage />);
    expect(screen.getByText('Checking for LAN indexer services...')).toBeInTheDocument();
  });

  it('does not show banner when no services detected', async () => {
    mockApi.indexerApi.detect.mockResolvedValue([]);
    render(<SettingsIndexersPage />);
    await waitFor(() => {
      expect(screen.queryByText(/LAN Indexer Service Detected/)).not.toBeInTheDocument();
    });
  });

  it('shows detection banner when Prowlarr is detected', async () => {
    const discoveredServices: DiscoveredService[] = [
      {
        type: 'prowlarr',
        url: 'http://192.168.1.100:9696',
        host: '192.168.1.100',
        port: 9696,
        name: 'My Prowlarr',
        version: '1.0.0',
      },
    ];
    mockApi.indexerApi.detect.mockResolvedValue(discoveredServices);
    render(<SettingsIndexersPage />);
    await waitFor(() => {
      expect(screen.getByText('LAN Indexer Service Detected')).toBeInTheDocument();
      expect(screen.getByText(/Prowlarr \(My Prowlarr\) detected at http:\/\/192.168.1.100:9696/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Import from Prowlarr/ })).toBeInTheDocument();
    });
  });

  it('shows detection banner when Jackett is detected', async () => {
    const discoveredServices: DiscoveredService[] = [
      {
        type: 'jackett',
        url: 'http://192.168.1.101:9117',
        host: '192.168.1.101',
        port: 9117,
        indexerCount: 5,
      },
    ];
    mockApi.indexerApi.detect.mockResolvedValue(discoveredServices);
    render(<SettingsIndexersPage />);
    await waitFor(() => {
      expect(screen.getByText('LAN Indexer Service Detected')).toBeInTheDocument();
      expect(screen.getByText(/Jackett detected at http:\/\/192.168.1.101:9117 — 5 indexers/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Import from Jackett/ })).toBeInTheDocument();
    });
  });

  it('shows multiple detected services in banner', async () => {
    const discoveredServices: DiscoveredService[] = [
      {
        type: 'prowlarr',
        url: 'http://192.168.1.100:9696',
        host: '192.168.1.100',
        port: 9696,
        name: 'Prowlarr 1',
      },
      {
        type: 'jackett',
        url: 'http://192.168.1.101:9117',
        host: '192.168.1.101',
        port: 9117,
        name: 'Jackett 1',
        indexerCount: 3,
      },
    ];
    mockApi.indexerApi.detect.mockResolvedValue(discoveredServices);
    render(<SettingsIndexersPage />);
    await waitFor(() => {
      expect(screen.getByText('LAN Indexer Service Detected')).toBeInTheDocument();
      expect(screen.getByText(/Prowlarr \(Prowlarr 1\) detected at/)).toBeInTheDocument();
      expect(screen.getByText(/Jackett \(Jackett 1\) detected at.*3 indexers/)).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Import from/ })).toHaveLength(2);
    });
  });

  it('calls importFrom when import button is clicked', async () => {
    const discoveredServices: DiscoveredService[] = [
      {
        type: 'prowlarr',
        url: 'http://192.168.1.100:9696',
        host: '192.168.1.100',
        port: 9696,
      },
    ];
    mockApi.indexerApi.detect.mockResolvedValue(discoveredServices);
    mockApi.indexerApi.importFrom.mockResolvedValue({ imported: 2, indexers: [] });
    render(<SettingsIndexersPage />);
    const importButton = await screen.findByRole('button', { name: /Import from Prowlarr/ });
    await importButton.click();
    await waitFor(() => {
      expect(mockApi.indexerApi.importFrom).toHaveBeenCalledWith('prowlarr', 'http://192.168.1.100:9696');
    });
  });

  it('removes service from banner after successful import', async () => {
    const discoveredServices: DiscoveredService[] = [
      {
        type: 'prowlarr',
        url: 'http://192.168.1.100:9696',
        host: '192.168.1.100',
        port: 9696,
      },
    ];
    mockApi.indexerApi.detect.mockResolvedValue(discoveredServices);
    mockApi.indexerApi.importFrom.mockResolvedValue({ imported: 2, indexers: [] });
    render(<SettingsIndexersPage />);
    const importButton = await screen.findByRole('button', { name: /Import from Prowlarr/ });
    await importButton.click();
    await waitFor(() => {
      expect(screen.queryByText(/LAN Indexer Service Detected/)).not.toBeInTheDocument();
    });
  });

  it('displays empty state when no indexers configured', async () => {
    mockApi.indexerApi.list.mockResolvedValue([]);
    render(<SettingsIndexersPage />);
    await waitFor(() => {
      expect(screen.getByText(/No indexers configured yet/)).toBeInTheDocument();
    });
  });

  it('renders indexer list when indexers exist', async () => {
    mockApi.indexerApi.list.mockResolvedValue([
      {
        id: 1,
        name: 'Test Indexer',
        implementation: 'Torznab',
        configContract: 'TorznabSettings',
        settings: '{}',
        protocol: 'torrent',
        supportedMediaTypes: '[]',
        enabled: true,
        supportsRss: true,
        supportsSearch: true,
        priority: 25,
      },
    ]);
    render(<SettingsIndexersPage />);
    await waitFor(() => {
      expect(screen.getByText('Test Indexer')).toBeInTheDocument();
      expect(screen.getByText(/torrent/i)).toBeInTheDocument();
    });
  });
});