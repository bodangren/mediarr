import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SystemEventsPage } from './SystemEventsPage';

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockEvents = [
  {
    id: 1,
    timestamp: '2026-03-11T10:00:00.000Z',
    level: 'info' as const,
    type: 'indexer' as const,
    message: 'Indexer "Test Indexer" added successfully',
    source: 'IndexerService',
  },
  {
    id: 2,
    timestamp: '2026-03-11T09:00:00.000Z',
    level: 'warning' as const,
    type: 'network' as const,
    message: 'Slow response from indexer',
    source: 'HttpClient',
  },
  {
    id: 3,
    timestamp: '2026-03-11T08:00:00.000Z',
    level: 'error' as const,
    type: 'download' as const,
    message: 'Download failed for release',
    source: 'TorrentManager',
  },
];

const mockEventsResult = {
  items: mockEvents,
  meta: { page: 1, pageSize: 25, totalCount: 3, totalPages: 1 },
};

const mockEmptyResult = {
  items: [],
  meta: { page: 1, pageSize: 25, totalCount: 0, totalPages: 0 },
};

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetEvents = vi.fn();
const mockClearEvents = vi.fn();
const mockExportEvents = vi.fn();

vi.mock('@/lib/api/client', () => ({
  getApiClients: () => ({
    systemApi: {
      getEvents: mockGetEvents,
      clearEvents: mockClearEvents,
      exportEvents: mockExportEvents,
    },
  }),
}));

vi.mock('@/lib/format', () => ({
  formatDateTime: (s: string) => s,
  formatRelativeDate: (s: string) => s,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <SystemEventsPage />
    </MemoryRouter>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SystemEventsPage', () => {
  beforeEach(() => {
    mockGetEvents.mockResolvedValue(mockEventsResult);
    mockClearEvents.mockResolvedValue({ cleared: 3 });
    mockExportEvents.mockResolvedValue(new Blob(['id,timestamp'], { type: 'text/csv' }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    renderPage();
    expect(screen.getByText('Events')).toBeInTheDocument();
  });

  it('shows event rows after loading', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Indexer "Test Indexer" added successfully')).toBeInTheDocument());
    expect(screen.getByText('Slow response from indexer')).toBeInTheDocument();
    expect(screen.getByText('Download failed for release')).toBeInTheDocument();
  });

  it('shows info level badge', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('info')).toBeInTheDocument());
  });

  it('shows warning level badge', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('warning')).toBeInTheDocument());
  });

  it('shows error level badge', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('error')).toBeInTheDocument());
  });

  it('shows source column', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('IndexerService')).toBeInTheDocument());
    expect(screen.getByText('HttpClient')).toBeInTheDocument();
    expect(screen.getByText('TorrentManager')).toBeInTheDocument();
  });

  it('calls getEvents with level filter when level select changes', async () => {
    renderPage();
    await waitFor(() => expect(mockGetEvents).toHaveBeenCalledTimes(1));

    const levelSelect = screen.getByRole('combobox', { name: /filter by level/i });
    fireEvent.change(levelSelect, { target: { value: 'error' } });

    await waitFor(() =>
      expect(mockGetEvents).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'error', page: 1 }),
      ),
    );
  });

  it('calls getEvents with type filter when type select changes', async () => {
    renderPage();
    await waitFor(() => expect(mockGetEvents).toHaveBeenCalledTimes(1));

    const typeSelect = screen.getByRole('combobox', { name: /filter by type/i });
    fireEvent.change(typeSelect, { target: { value: 'indexer' } });

    await waitFor(() =>
      expect(mockGetEvents).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'indexer', page: 1 }),
      ),
    );
  });

  it('calls clearEvents and refreshes when Clear All is clicked', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Clear All')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Clear All'));

    await waitFor(() => expect(mockClearEvents).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockGetEvents).toHaveBeenCalledTimes(2));
  });

  it('calls exportEvents with format=csv when Export CSV is clicked', async () => {
    // Stub URL APIs used by the download trigger
    const origCreateObjectURL = globalThis.URL?.createObjectURL;
    const origRevokeObjectURL = globalThis.URL?.revokeObjectURL;
    const createObjectURL = vi.fn().mockReturnValue('blob:test');
    const revokeObjectURL = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis.URL as any).createObjectURL = createObjectURL;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis.URL as any).revokeObjectURL = revokeObjectURL;

    renderPage();
    await waitFor(() => expect(screen.getByText('Export CSV')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Export CSV'));

    await waitFor(() =>
      expect(mockExportEvents).toHaveBeenCalledWith(
        expect.objectContaining({ format: 'csv' }),
      ),
    );

    // Restore
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis.URL as any).createObjectURL = origCreateObjectURL;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis.URL as any).revokeObjectURL = origRevokeObjectURL;
  });

  it('shows empty state when no events match', async () => {
    mockGetEvents.mockResolvedValue(mockEmptyResult);
    renderPage();
    await waitFor(() => expect(screen.getByText('No events found.')).toBeInTheDocument());
  });

  it('shows error state when API call fails', async () => {
    mockGetEvents.mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Failed to load system events')).toBeInTheDocument(),
    );
  });

  it('shows pagination controls when multiple pages exist', async () => {
    mockGetEvents.mockResolvedValue({
      items: mockEvents,
      meta: { page: 1, pageSize: 25, totalCount: 100, totalPages: 4 },
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('Page 1 of 4')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
  });

  it('advances to next page when Next is clicked', async () => {
    mockGetEvents.mockResolvedValue({
      items: mockEvents,
      meta: { page: 1, pageSize: 25, totalCount: 100, totalPages: 4 },
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('Page 1 of 4')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() =>
      expect(mockGetEvents).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })),
    );
  });

  it('renders — for events with no source', async () => {
    mockGetEvents.mockResolvedValue({
      items: [
        {
          id: 99,
          timestamp: '2026-03-11T07:00:00.000Z',
          level: 'info' as const,
          type: 'backup' as const,
          message: 'Backup completed',
        },
      ],
      meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('Backup completed')).toBeInTheDocument());
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
