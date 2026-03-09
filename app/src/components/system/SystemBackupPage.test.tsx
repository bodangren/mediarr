import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SystemBackupPage } from './SystemBackupPage';

const mockBackups = [
  {
    id: 1,
    name: 'mediarr_backup_2024-02-14.zip',
    path: '/data/backups/mediarr_backup_2024-02-14.zip',
    size: 15728640,
    created: new Date(Date.now() - 86400000).toISOString(),
    type: 'scheduled' as const,
  },
];

const mockSchedule = {
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

  it('renders the page title', () => {
    renderPage();
    expect(screen.getByText('Backup')).toBeInTheDocument();
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
      id: 99,
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

  it('calls deleteBackup when Delete is clicked and confirmed', async () => {
    mockDeleteBackup.mockResolvedValue({ id: 1, deleted: true });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();
    await waitFor(() => expect(screen.getAllByText('Delete').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('Delete')[0]);
    await waitFor(() => expect(mockDeleteBackup).toHaveBeenCalledWith(1));
  });

  it('shows "No backups yet" when list is empty', async () => {
    mockGetBackups.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText('No backups yet')).toBeInTheDocument());
  });
});
