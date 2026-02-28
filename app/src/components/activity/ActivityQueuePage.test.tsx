import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivityQueuePage } from './ActivityQueuePage';
import { getApiClients } from '@/lib/api/client';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { BrowserRouter } from 'react-router-dom';

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

const mockTorrents = [
  {
    infoHash: 'hash1',
    name: 'Big Buck Bunny',
    status: 'downloading',
    progress: 0.5,
    downloadSpeed: 1024 * 1024,
    uploadSpeed: 512 * 1024,
    seeders: 42,
    size: '1073741824',
    downloaded: '536870912',
    uploaded: '0',
    eta: 3600,
    path: '/downloads/incomplete',
  },
  {
    infoHash: 'hash2',
    name: 'Sintel',
    status: 'paused',
    progress: 0.25,
    downloadSpeed: 0,
    uploadSpeed: 0,
    seeders: 0,
    size: '536870912',
    downloaded: '134217728',
    uploaded: '0',
    eta: null,
    path: '/downloads/incomplete',
  },
];

describe('ActivityQueuePage', () => {
  let mockApi: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = {
      torrentApi: {
        list: vi.fn().mockResolvedValue({
          items: mockTorrents,
          meta: { page: 1, pageSize: 20, totalCount: 2, totalPages: 1 },
        }),
        pause: vi.fn().mockResolvedValue({ infoHash: 'hash1', status: 'paused' }),
        resume: vi.fn().mockResolvedValue({ infoHash: 'hash2', status: 'downloading' }),
        remove: vi.fn().mockResolvedValue({ infoHash: 'hash1', removed: true }),
        retryImport: vi.fn().mockResolvedValue({ infoHash: 'hash1', retried: true }),
        setSpeedLimits: vi.fn().mockResolvedValue({ updated: true, limits: {} }),
      },
    };
    (getApiClients as any).mockReturnValue(mockApi);
  });

  const renderPage = () => render(
    <BrowserRouter>
      <ToastProvider>
        <ActivityQueuePage />
      </ToastProvider>
    </BrowserRouter>,
  );

  it('renders torrent rows, status badges, progress, and queue columns', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Big Buck Bunny')).toBeInTheDocument();
      expect(screen.getByText('Sintel')).toBeInTheDocument();
    });

    expect(screen.getByRole('columnheader', { name: 'Seeders' })).toBeInTheDocument();
    expect(screen.getByText('downloading')).toBeInTheDocument();
    expect(screen.getByText('paused')).toBeInTheDocument();
    expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('25%').length).toBeGreaterThan(0);
    expect(screen.getByText('1.0 GB')).toBeInTheDocument();
    expect(screen.getByText('512 MB')).toBeInTheDocument();
    expect(screen.getByText('1.0 MB/s')).toBeInTheDocument();
    expect(screen.getByText('512 KB/s')).toBeInTheDocument();
    expect(screen.getByText('1h 0m')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('calls pause API when pause action is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('Big Buck Bunny'));

    const row = screen.getByText('Big Buck Bunny').closest('tr')!;
    await user.click(within(row).getByLabelText('Pause torrent'));

    await waitFor(() => {
      expect(mockApi.torrentApi.pause).toHaveBeenCalledWith('hash1');
    });
  });

  it('calls resume API when resume action is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('Sintel'));

    const row = screen.getByText('Sintel').closest('tr')!;
    await user.click(within(row).getByLabelText('Resume torrent'));

    await waitFor(() => {
      expect(mockApi.torrentApi.resume).toHaveBeenCalledWith('hash2');
    });
  });

  it('opens removal modal and calls remove API on confirm', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('Big Buck Bunny'));

    const row = screen.getByText('Big Buck Bunny').closest('tr')!;
    await user.click(within(row).getByLabelText('Remove torrent'));

    const modal = screen.getByRole('dialog', { name: 'Remove from queue' });
    expect(within(modal).getByText(/Are you sure you want to remove/)).toBeInTheDocument();
    await user.click(within(modal).getByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(mockApi.torrentApi.remove).toHaveBeenCalledWith('hash1');
    });
  });

  it('calls retryImport API when retry import action is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('Big Buck Bunny'));

    const row = screen.getByText('Big Buck Bunny').closest('tr')!;
    await user.click(within(row).getByLabelText('Retry import'));

    await waitFor(() => {
      expect(mockApi.torrentApi.retryImport).toHaveBeenCalledWith('hash1');
    });
  });

  it('calls setSpeedLimits when applying limits', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByLabelText(/Download Limit/));

    await user.clear(screen.getByLabelText(/Download Limit/));
    await user.type(screen.getByLabelText(/Download Limit/), '1000');
    await user.clear(screen.getByLabelText(/Upload Limit/));
    await user.type(screen.getByLabelText(/Upload Limit/), '500');
    await user.click(screen.getByRole('button', { name: 'Apply Limits' }));

    await waitFor(() => {
      expect(mockApi.torrentApi.setSpeedLimits).toHaveBeenCalledWith({
        download: 1000 * 1024,
        upload: 500 * 1024,
      });
    });
  });

  it('uses -1 for unlimited when limits are 0', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByLabelText(/Download Limit/));

    await user.clear(screen.getByLabelText(/Download Limit/));
    await user.type(screen.getByLabelText(/Download Limit/), '0');
    await user.clear(screen.getByLabelText(/Upload Limit/));
    await user.type(screen.getByLabelText(/Upload Limit/), '0');
    await user.click(screen.getByRole('button', { name: 'Apply Limits' }));

    await waitFor(() => {
      expect(mockApi.torrentApi.setSpeedLimits).toHaveBeenCalledWith({
        download: -1,
        upload: -1,
      });
    });
  });

  it('shows empty state when no torrents', async () => {
    mockApi.torrentApi.list.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('No active downloads in the queue.')).toBeInTheDocument();
    });
  });
});
