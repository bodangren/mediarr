import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SystemBackupPage } from './SystemBackupPage';

const mockBackups = [
  {
    id: 'mediarr_backup_2024-02-14.db',
    name: 'mediarr_backup_2024-02-14.zip',
    path: '/data/backups/mediarr_backup_2024-02-14.zip',
    size: 15728640,
    created: new Date(Date.now() - 86400000).toISOString(),
    type: 'scheduled' as const,
  },
];

const mockSchedule = {
  supported: true,
  enabled: true,
  interval: 'daily' as const,
  retentionDays: 30,
  nextBackup: new Date(Date.now() + 43200000).toISOString(),
  lastBackup: new Date(Date.now() - 43200000).toISOString(),
};

const mockGetBackups = vi.fn();
const mockCreateBackup = vi.fn();
const mockGetBackupSchedule = vi.fn();
const mockUpdateBackupSchedule = vi.fn();
const mockRestoreBackup = vi.fn();
const mockDownloadBackup = vi.fn();
const mockDeleteBackup = vi.fn();

vi.mock('@/lib/api/client', () => ({
  getApiClients: () => ({
    backupApi: {
      getBackups: mockGetBackups,
      createBackup: mockCreateBackup,
      getBackupSchedule: mockGetBackupSchedule,
      updateBackupSchedule: mockUpdateBackupSchedule,
      restoreBackup: mockRestoreBackup,
      downloadBackup: mockDownloadBackup,
      deleteBackup: mockDeleteBackup,
    },
  }),
}));

vi.mock('@/lib/format', () => ({
  formatBytes: (n: number) => `${n}B`,
  formatDateTime: (s: string) => s,
  formatRelativeDate: (s: string) => s,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <SystemBackupPage />
    </MemoryRouter>,
  );
}

describe('SystemBackupPage', () => {
  beforeEach(() => {
    mockGetBackups.mockResolvedValue(mockBackups);
    mockGetBackupSchedule.mockResolvedValue(mockSchedule);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', async () => {
    renderPage();
    expect(screen.getByText('Backup')).toBeInTheDocument();
    await screen.findByText('mediarr_backup_2024-02-14.zip');
    await screen.findByText('Save Schedule');
  });

  it('shows backup list after loading', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('mediarr_backup_2024-02-14.zip')).toBeInTheDocument(),
    );
    expect(screen.getByText('scheduled')).toBeInTheDocument();
  });

  it('shows "Back Up Now" button', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Back Up Now')).toBeInTheDocument());
  });

  it('calls createBackup when "Back Up Now" is clicked', async () => {
    const newBackup = {
      id: 'manual_2024.db',
      name: 'manual_2024.zip',
      path: '/data/backups/manual_2024.zip',
      size: 1000000,
      created: new Date().toISOString(),
      type: 'manual' as const,
    };
    mockCreateBackup.mockResolvedValue(newBackup);
    renderPage();
    await waitFor(() => expect(screen.getByText('Back Up Now')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Back Up Now'));
    await waitFor(() => expect(mockCreateBackup).toHaveBeenCalled());
  });

  it('shows schedule panel with "Save Schedule" button', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Save Schedule')).toBeInTheDocument());
  });

  it('shows "Enable automatic backups" checkbox', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Enable automatic backups')).toBeInTheDocument(),
    );
  });

  it('requires accessible confirmation before deleting a backup', async () => {
    mockDeleteBackup.mockResolvedValue({ id: 'mediarr_backup_2024-02-14.db', deleted: true });
    mockGetBackups
      .mockResolvedValueOnce(mockBackups)
      .mockResolvedValue([]);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    const dialog = await screen.findByRole('dialog', { name: 'Delete Backup' });
    expect(dialog).toHaveTextContent('mediarr_backup_2024-02-14.zip');
    expect(dialog).toHaveTextContent(/permanently delete/i);
    expect(mockDeleteBackup).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Delete Backup' })).not.toBeInTheDocument(),
    );
    expect(mockDeleteBackup).not.toHaveBeenCalled();
    expect(screen.getByText('mediarr_backup_2024-02-14.zip')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const reopenedDialog = await screen.findByRole('dialog', { name: 'Delete Backup' });
    fireEvent.click(within(reopenedDialog).getByRole('button', { name: 'Delete Backup' }));

    await waitFor(() => expect(mockDeleteBackup).toHaveBeenCalledWith('mediarr_backup_2024-02-14.db'));
    expect(await screen.findByText('No backups yet')).toBeInTheDocument();
  });

  it('requires accessible confirmation and announces restart after restore', async () => {
    mockRestoreBackup.mockResolvedValue({
      id: 'mediarr_backup_2024-02-14.db',
      name: 'mediarr_backup_2024-02-14.zip',
      restoredAt: new Date().toISOString(),
      restartRequired: true,
      safetyBackupId: 'manual_backup_safety.db',
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Restore' }));

    const dialog = await screen.findByRole('dialog', { name: 'Restore Backup' });
    expect(dialog).toHaveTextContent('mediarr_backup_2024-02-14.zip');
    expect(dialog).toHaveTextContent(/restart/i);
    expect(mockRestoreBackup).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Restore Backup' })).not.toBeInTheDocument(),
    );
    expect(mockRestoreBackup).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    const reopenedDialog = await screen.findByRole('dialog', { name: 'Restore Backup' });
    fireEvent.click(within(reopenedDialog).getByRole('button', { name: 'Restore Backup' }));

    await waitFor(() =>
      expect(mockRestoreBackup).toHaveBeenCalledWith('mediarr_backup_2024-02-14.db'),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Backup restored. Restart Mediarr to finish applying it.',
    );
  });

  it('disables fabricated schedule controls when scheduling is unsupported', async () => {
    mockGetBackupSchedule.mockResolvedValue({
      ...mockSchedule,
      supported: false,
      enabled: false,
      nextBackup: null,
    });
    renderPage();

    expect(await screen.findByText('Automatic backup scheduling is not available in this deployment.'))
      .toBeInTheDocument();
    expect(screen.getByText('Save Schedule')).toBeDisabled();
  });

  it('shows "No backups yet" when list is empty', async () => {
    mockGetBackups.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText('No backups yet')).toBeInTheDocument());
  });
});
