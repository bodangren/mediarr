import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BackupPage from './page';
import * as apiClient from '@/lib/api/client';

// Mock the API client
vi.mock('@/lib/api/client');

describe('BackupPage', () => {
  let queryClient: QueryClient;

  const mockBackupApi = {
    getBackups: vi.fn(),
    getBackupSchedule: vi.fn(),
    createBackup: vi.fn(),
    restoreBackup: vi.fn(),
    downloadBackup: vi.fn(),
    deleteBackup: vi.fn(),
    updateBackupSchedule: vi.fn(),
  };

  const mockLogsApi = {
    getFiles: vi.fn(),
    getFileContents: vi.fn(),
    downloadFile: vi.fn(),
    clearFile: vi.fn(),
  };

  const mockUpdatesApi = {
    getLatestVersion: vi.fn(),
    checkForUpdates: vi.fn(),
    installUpdate: vi.fn(),
    getUpdateHistory: vi.fn(),
  };

  const mockBackups = [
    {
      id: 1,
      name: 'manual-backup-20260215',
      path: '/backups/manual-backup-20260215.zip',
      size: 10485760,
      created: '2026-02-15T10:00:00.000Z',
      type: 'manual' as const,
    },
    {
      id: 2,
      name: 'scheduled-backup-20260214',
      path: '/backups/scheduled-backup-20260214.zip',
      size: 10484736,
      created: '2026-02-14T02:00:00.000Z',
      type: 'scheduled' as const,
    },
  ];

  const mockBackupSchedule = {
    enabled: true,
    interval: 'weekly' as const,
    retentionDays: 30,
    nextBackup: '2026-02-22T02:00:00.000Z',
    lastBackup: '2026-02-15T02:00:00.000Z',
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.spyOn(apiClient, 'getApiClients').mockReturnValue({
      httpClient: {} as any,
      mediaApi: {} as any,
      releaseApi: {} as any,
      torrentApi: {} as any,
      indexerApi: {} as any,
      applicationsApi: {} as any,
      downloadClientApi: {} as any,
      tagsApi: {} as any,
      subtitleApi: {} as any,
      activityApi: {} as any,
      settingsApi: {} as any,
      healthApi: {} as any,
      notificationsApi: {} as any,
      systemApi: {} as any,
      backupApi: mockBackupApi as any,
      logsApi: mockLogsApi as any,
      updatesApi: mockUpdatesApi as any,
      eventsApi: {} as any,
    });

    mockBackupApi.getBackups.mockResolvedValue(mockBackups);
    mockBackupApi.getBackupSchedule.mockResolvedValue(mockBackupSchedule);
    mockBackupApi.createBackup.mockResolvedValue({
      id: 3,
      name: 'manual-backup-20260215-2',
      path: '/backups/manual-backup-20260215-2.zip',
      size: 10486840,
      created: '2026-02-15T11:00:00.000Z',
      type: 'manual' as const,
    });
    mockBackupApi.restoreBackup.mockResolvedValue({
      id: 1,
      name: 'manual-backup-20260215',
      restoredAt: '2026-02-15T11:30:00.000Z',
    });
    mockBackupApi.downloadBackup.mockResolvedValue({
      downloadUrl: '/api/backups/1/download',
      expiresAt: '2026-02-15T12:00:00.000Z',
    });
    mockBackupApi.deleteBackup.mockResolvedValue({
      id: 1,
      deleted: true,
    });
    mockBackupApi.updateBackupSchedule.mockResolvedValue(mockBackupSchedule);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryClientProvider client={queryClient}>
        <BackupPage />
      </QueryClientProvider>,
    );
  }

  describe('rendering', () => {
    it('should render page header', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('System Backup')).toBeInTheDocument();
        expect(screen.getByText('Backups, restores, and retention configuration.')).toBeInTheDocument();
      });
    });

    it('should render create backup button', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Create Backup')).toBeInTheDocument();
      });
    });

    it('should render backups table with data', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('manual-backup-20260215')).toBeInTheDocument();
        expect(screen.getByText('scheduled-backup-20260214')).toBeInTheDocument();
      });
    });

    it('should render backup schedule section', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Backup Schedule')).toBeInTheDocument();
        expect(screen.getByText('weekly')).toBeInTheDocument();
        expect(screen.getByText('30 days')).toBeInTheDocument();
      });
    });
  });

  describe('backup actions', () => {
    it('should create backup when button is clicked', async () => {
      renderPage();

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const createButton = buttons.find(btn => btn.textContent?.includes('Create Backup'));
        expect(createButton).toBeDefined();
      });

      const buttons = screen.getAllByRole('button');
      const createButton = buttons.find(btn => btn.textContent?.includes('Create Backup'));
      expect(createButton).toBeDefined();
      fireEvent.click(createButton!);

      await waitFor(() => {
        expect(mockBackupApi.createBackup).toHaveBeenCalled();
      });
    });

    it('should open restore modal when restore button is clicked', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('manual-backup-20260215')).toBeInTheDocument();
      });

      // Find restore button for first backup
      const restoreButton = screen.getByRole('button', { name: 'Restore manual-backup-20260215' });
      expect(restoreButton).toBeInTheDocument();
      fireEvent.click(restoreButton);

      await waitFor(() => {
        expect(screen.getByText(/Restore from backup/i)).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to restore/i)).toBeInTheDocument();
      });
    });

    it('should open delete modal when delete button is clicked', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('manual-backup-20260215')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: 'Delete manual-backup-20260215' });
      expect(deleteButton).toBeInTheDocument();
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/Delete backup/i)).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();
      });
    });

    it('should restore backup when confirmed in modal', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('manual-backup-20260215')).toBeInTheDocument();
      });

      const restoreButton = screen.getByRole('button', { name: 'Restore manual-backup-20260215' });
      fireEvent.click(restoreButton);

      await waitFor(() => {
        expect(screen.getByText(/Restore from backup/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: 'Restore' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockBackupApi.restoreBackup).toHaveBeenCalledWith(1);
      });
    });

    it('should delete backup when confirmed in modal', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('manual-backup-20260215')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: 'Delete manual-backup-20260215' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/Delete backup/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: 'Delete' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockBackupApi.deleteBackup).toHaveBeenCalledWith(1);
      });
    });

    it('should cancel restore when cancel button is clicked', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('manual-backup-20260215')).toBeInTheDocument();
      });

      const restoreButton = screen.getByRole('button', { name: 'Restore manual-backup-20260215' });
      fireEvent.click(restoreButton);

      await waitFor(() => {
        expect(screen.getByText(/Restore from backup/i)).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(/Restore from backup/i)).not.toBeInTheDocument();
      });

      expect(mockBackupApi.restoreBackup).not.toHaveBeenCalled();
    });

    it('should cancel delete when cancel button is clicked', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('manual-backup-20260215')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: 'Delete manual-backup-20260215' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/Delete backup/i)).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(/Delete backup/i)).not.toBeInTheDocument();
      });

      expect(mockBackupApi.deleteBackup).not.toHaveBeenCalled();
    });
  });

  describe('empty state', () => {
    it('should show empty message when no backups exist', async () => {
      mockBackupApi.getBackups.mockResolvedValue([]);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('No backups')).toBeInTheDocument();
        expect(screen.getByText('Create a backup to protect your system data.')).toBeInTheDocument();
      });
    });
  });

  describe('loading states', () => {
    it('should show loading state initially', () => {
      mockBackupApi.getBackups.mockImplementation(() => new Promise(() => {}));

      renderPage();

      // QueryPanel renders skeleton blocks during loading
      expect(screen.queryAllByTestId('skeleton-block').length).toBeGreaterThan(0);
    });
  });

  describe('error states', () => {
    it('should show error message when fetch fails', async () => {
      mockBackupApi.getBackups.mockRejectedValue(new Error('Failed to fetch backups'));

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/Could not load data/i)).toBeInTheDocument();
      });
    });

    it('should allow retry when error occurs', async () => {
      mockBackupApi.getBackups.mockRejectedValueOnce(new Error('Failed to fetch backups')).mockResolvedValue(mockBackups);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/Could not load data/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockBackupApi.getBackups).toHaveBeenCalledTimes(2);
      });
    });
  });
});
