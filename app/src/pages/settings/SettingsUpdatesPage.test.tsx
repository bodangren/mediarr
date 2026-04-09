import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsUpdatesPage } from './SettingsUpdatesPage';

const mockApi = vi.hoisted(() => ({
  updatesApi: {
    getCurrentVersion: vi.fn(),
    getAvailableUpdates: vi.fn(),
    getUpdateHistory: vi.fn(),
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    getUpdateProgress: vi.fn(),
    installUpdate: vi.fn(),
  },
}));

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => mockApi),
}));

describe('SettingsUpdatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockApi.updatesApi.getCurrentVersion.mockResolvedValue({
      version: '1.0.0',
      branch: 'main',
      commit: 'abc123',
      buildDate: '2026-04-09T00:00:00.000Z',
    });
    mockApi.updatesApi.getAvailableUpdates.mockResolvedValue({
      available: true,
      version: '1.1.0',
      releaseDate: '2026-04-09T12:00:00.000Z',
      changelog: 'Release notes',
      downloadUrl: 'https://example.com/download',
    });
    mockApi.updatesApi.getUpdateHistory.mockResolvedValue({
      items: [
        {
          id: 1,
          version: '1.0.0',
          installedDate: '2026-04-01T00:00:00.000Z',
          status: 'success' as const,
          branch: 'main',
        },
      ],
      meta: {
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      },
    });
    mockApi.updatesApi.checkForUpdates.mockResolvedValue({
      checked: true,
      timestamp: '2026-04-09T12:00:00.000Z',
      available: true,
      updateAvailable: true,
    });
    mockApi.updatesApi.downloadUpdate.mockResolvedValue({
      updateId: 'update-1',
      version: '1.1.0',
      status: 'completed' as const,
      progress: 100,
      bytesDownloaded: 1000,
      totalBytes: 1000,
      message: 'Download completed',
      startedAt: '2026-04-09T12:00:00.000Z',
      completedAt: '2026-04-09T12:01:00.000Z',
      stagedPath: '/tmp/mediarr-1.1.0',
    });
    mockApi.updatesApi.getUpdateProgress.mockResolvedValue({
      updateId: 'update-1',
      version: '1.1.0',
      status: 'completed' as const,
      progress: 100,
      bytesDownloaded: 1000,
      totalBytes: 1000,
      message: 'Download completed',
      startedAt: '2026-04-09T12:00:00.000Z',
      completedAt: '2026-04-09T12:01:00.000Z',
    });
    mockApi.updatesApi.installUpdate.mockResolvedValue({
      mode: 'binary' as const,
      status: 'installed' as const,
      version: '1.1.0',
      message: 'Installed',
    });
  });

  it('renders current version and available update info', async () => {
    render(<SettingsUpdatesPage />);

    expect(await screen.findByText('Current Version')).toBeInTheDocument();
    expect(screen.getByText((_content, node) => node?.textContent === 'Version: 1.0.0')).toBeInTheDocument();
    expect(screen.getByText((_content, node) => node?.textContent === 'Version: 1.1.0')).toBeInTheDocument();
    expect(screen.getByText('Release notes')).toBeInTheDocument();
  });

  it('checks for updates when the button is clicked', async () => {
    render(<SettingsUpdatesPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Check for Updates' }));

    await waitFor(() => {
      expect(mockApi.updatesApi.checkForUpdates).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Update available.')).toBeInTheDocument();
  });

  it('shows download progress after starting update download', async () => {
    render(<SettingsUpdatesPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Download Update' }));

    await waitFor(() => {
      expect(mockApi.updatesApi.downloadUpdate).toHaveBeenCalledWith('1.1.0');
    });

    expect(await screen.findByText('Download Progress')).toBeInTheDocument();
    expect(screen.getByText('100% (1000 / 1000 bytes)')).toBeInTheDocument();
  });

  it('renders error state when initial load fails', async () => {
    mockApi.updatesApi.getCurrentVersion.mockRejectedValueOnce(new Error('load failed'));

    render(<SettingsUpdatesPage />);

    expect(await screen.findByText('load failed')).toBeInTheDocument();
  });
});
