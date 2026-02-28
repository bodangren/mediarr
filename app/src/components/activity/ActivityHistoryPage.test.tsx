import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivityHistoryPage } from './ActivityHistoryPage';
import { getApiClients } from '@/lib/api/client';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { BrowserRouter } from 'react-router-dom';

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

const mockItems = [
  {
    id: 1,
    eventType: 'RELEASE_GRABBED',
    sourceModule: 'movies',
    entityRef: 'The Matrix',
    summary: 'Grabbed The Matrix (1999)',
    success: true,
    details: { quality: 'Bluray-1080p', indexer: 'TPB' },
    occurredAt: '2026-02-28T12:00:00.000Z',
  },
  {
    id: 2,
    eventType: 'IMPORT_FAILED',
    sourceModule: 'movies',
    entityRef: 'Inception',
    summary: 'Import failed for Inception (2010)',
    success: false,
    details: { quality: 'WEBDL-1080p', indexer: 'NZBGeek' },
    occurredAt: '2026-02-27T08:30:00.000Z',
  },
  {
    id: 3,
    eventType: 'IMPORT_COMPLETED',
    sourceModule: 'series',
    entityRef: 'Breaking Bad S01E01',
    summary: 'Imported Breaking Bad S01E01',
    success: true,
    details: { quality: 'HDTV-1080p', indexer: 'TPB' },
    occurredAt: '2026-02-26T15:45:00.000Z',
  },
];

describe('ActivityHistoryPage', () => {
  let mockApi: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = {
      activityApi: {
        list: vi.fn().mockResolvedValue({
          items: mockItems,
          meta: { page: 1, pageSize: 20, totalCount: 3, totalPages: 1 },
        }),
        markFailed: vi.fn().mockResolvedValue({ ...mockItems[0], success: false }),
      },
    };
    (getApiClients as any).mockReturnValue(mockApi);
  });

  const renderPage = () =>
    render(
      <BrowserRouter>
        <ToastProvider>
          <ActivityHistoryPage />
        </ToastProvider>
      </BrowserRouter>,
    );

  it('renders history rows with event type badges and column headers', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Grabbed The Matrix (1999)')).toBeInTheDocument();
    });

    expect(screen.getByText('Download failed for Inception (2010)')).toBeInTheDocument();
    expect(screen.getByText('Imported Breaking Bad S01E01')).toBeInTheDocument();

    // Event type badges
    expect(screen.getAllByText('Grabbed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Imported').length).toBeGreaterThan(0);

    // Column headers
    expect(screen.getByRole('columnheader', { name: 'Date' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Event Type' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Summary' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Source' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Quality' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Indexer' })).toBeInTheDocument();
  });

  it('shows empty state when no history', async () => {
    mockApi.activityApi.list.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/No activity history/i)).toBeInTheDocument();
    });
  });

  it('calls markFailed and shows success when action is clicked on a successful row', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('Grabbed The Matrix (1999)'));

    const row = screen.getByText('Grabbed The Matrix (1999)').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: /mark failed/i }));

    await waitFor(() => {
      expect(mockApi.activityApi.markFailed).toHaveBeenCalledWith(1);
    });
  });

  it('does not show Mark Failed button on already-failed rows', async () => {
    renderPage();

    await waitFor(() => screen.getByText('Download failed for Inception (2010)'));

    const row = screen.getByText('Download failed for Inception (2010)').closest('tr')!;
    expect(within(row).queryByRole('button', { name: /mark failed/i })).not.toBeInTheDocument();
  });

  it('filters by event type when dropdown changes', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('Grabbed The Matrix (1999)'));

    const eventTypeFilter = screen.getByRole('combobox', { name: /event type/i });
    await user.selectOptions(eventTypeFilter, 'IMPORT_FAILED');

    await waitFor(() => {
      expect(mockApi.activityApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'IMPORT_FAILED', page: 1 }),
      );
    });
  });

  it('filters by success/failure status when toggled', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('Grabbed The Matrix (1999)'));

    const statusFilter = screen.getByRole('combobox', { name: /status/i });
    await user.selectOptions(statusFilter, 'false');

    await waitFor(() => {
      expect(mockApi.activityApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, page: 1 }),
      );
    });
  });

  it('navigates to next page', async () => {
    const user = userEvent.setup();
    mockApi.activityApi.list.mockResolvedValue({
      items: mockItems,
      meta: { page: 1, pageSize: 20, totalCount: 40, totalPages: 2 },
    });

    renderPage();

    await waitFor(() => screen.getByText('Grabbed The Matrix (1999)'));

    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(mockApi.activityApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 }),
      );
    });
  });
});
