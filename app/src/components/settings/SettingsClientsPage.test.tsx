import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SettingsClientsPage } from '@/App';
import type { TorrentLimitsSettings } from '@/lib/api/downloadClientsApi';

// Mock the API client module
vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

// Mock FilesystemBrowser to avoid complex rendering
vi.mock('@/components/primitives/FilesystemBrowser', () => ({
  FilesystemBrowser: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="filesystem-browser" /> : null,
}));

// Mock ToastProvider
const mockPushToast = vi.fn();
vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ pushToast: mockPushToast }),
}));

import { getApiClients } from '@/lib/api/client';

const defaultSettings: TorrentLimitsSettings = {
  maxActiveDownloads: 3,
  maxActiveSeeds: 3,
  globalDownloadLimitKbps: null,
  globalUploadLimitKbps: null,
  incompleteDirectory: '/downloads/incomplete',
  completeDirectory: '/downloads/complete',
  seedRatioLimit: 0,
  seedTimeLimitMinutes: 0,
  seedLimitAction: 'pause',
};

function createMockApi(overrides: Partial<TorrentLimitsSettings> = {}) {
  const settings = { ...defaultSettings, ...overrides };
  return {
    downloadClientApi: {
      get: vi.fn().mockResolvedValue(settings),
      save: vi.fn().mockResolvedValue(settings),
    },
    filesystemApi: {
      list: vi.fn().mockResolvedValue({ writable: true, entries: [] }),
    },
  };
}

describe('SettingsClientsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders complete directory field with folder icon and Validate button', async () => {
    (getApiClients as ReturnType<typeof vi.fn>).mockReturnValue(createMockApi());

    render(<SettingsClientsPage />);

    await waitFor(() => {
      expect(screen.getByText('Complete Directory')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('/downloads/complete')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Browse complete directory' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Validate complete directory' })).toBeInTheDocument();
  });

  it('renders seed ratio limit input', async () => {
    (getApiClients as ReturnType<typeof vi.fn>).mockReturnValue(createMockApi({ seedRatioLimit: 1.5 }));

    render(<SettingsClientsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Seed Ratio Limit/)).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('1.5')).toBeInTheDocument();
  });

  it('renders seed time limit input', async () => {
    (getApiClients as ReturnType<typeof vi.fn>).mockReturnValue(createMockApi({ seedTimeLimitMinutes: 120 }));

    render(<SettingsClientsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Seed Time Limit/)).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('120')).toBeInTheDocument();
  });

  it('renders seed limit action select with pause and remove options', async () => {
    (getApiClients as ReturnType<typeof vi.fn>).mockReturnValue(createMockApi({ seedLimitAction: 'remove' }));

    render(<SettingsClientsPage />);

    await waitFor(() => {
      expect(screen.getByText('When Seed Limit Reached')).toBeInTheDocument();
    });

    const select = screen.getByDisplayValue('Remove torrent');
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Pause torrent' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Remove torrent' })).toBeInTheDocument();
  });

  it('values persist after successful save', async () => {
    const savedSettings: TorrentLimitsSettings = {
      ...defaultSettings,
      completeDirectory: '/media/done',
      seedRatioLimit: 2.0,
      seedTimeLimitMinutes: 60,
      seedLimitAction: 'remove',
    };

    const mockApi = createMockApi();
    mockApi.downloadClientApi.save = vi.fn().mockResolvedValue(savedSettings);
    (getApiClients as ReturnType<typeof vi.fn>).mockReturnValue(mockApi);

    render(<SettingsClientsPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('/downloads/complete')).toBeInTheDocument();
    });

    // Change complete directory
    const completeInput = screen.getByDisplayValue('/downloads/complete');
    fireEvent.change(completeInput, { target: { value: '/media/done' } });

    // Submit form
    const saveButton = screen.getByRole('button', { name: 'Save Download Client Settings' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockApi.downloadClientApi.save).toHaveBeenCalled();
      expect(mockPushToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'success' }),
      );
    });

    // Values reflect saved state
    expect(screen.getByDisplayValue('/media/done')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
  });

  it('shows writable status after validating complete directory', async () => {
    const mockApi = createMockApi();
    (getApiClients as ReturnType<typeof vi.fn>).mockReturnValue(mockApi);

    render(<SettingsClientsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Validate complete directory' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Validate complete directory' }));

    await waitFor(() => {
      expect(screen.getByText('✓ Writable')).toBeInTheDocument();
    });
  });

  it('shows not-found status when complete directory validation fails', async () => {
    const mockApi = createMockApi();
    mockApi.filesystemApi.list = vi.fn().mockRejectedValue(new Error('Not found'));
    (getApiClients as ReturnType<typeof vi.fn>).mockReturnValue(mockApi);

    render(<SettingsClientsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Validate complete directory' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Validate complete directory' }));

    await waitFor(() => {
      expect(screen.getByText('✗ Not found')).toBeInTheDocument();
    });
  });

  it('opens filesystem browser when Browse complete directory is clicked', async () => {
    (getApiClients as ReturnType<typeof vi.fn>).mockReturnValue(createMockApi());

    render(<SettingsClientsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Browse complete directory' })).toBeInTheDocument();
    });

    expect(screen.queryByTestId('filesystem-browser')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Browse complete directory' }));
    expect(screen.getByTestId('filesystem-browser')).toBeInTheDocument();
  });
});
