import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SystemTasksPage } from './SystemTasksPage';

const mockScheduledTasks = [
  {
    id: 'rss-sync',
    taskName: 'RSS Sync',
    interval: '15 minutes',
    lastExecution: new Date(Date.now() - 600000).toISOString(),
    lastDuration: 2345,
    nextExecution: new Date(Date.now() + 300000).toISOString(),
    status: 'pending',
  },
];

const mockQueuedTasks: unknown[] = [];

const mockHistoryResult = {
  items: [
    {
      id: 1,
      taskName: 'RSS Sync',
      started: new Date(Date.now() - 86400000).toISOString(),
      duration: 3456,
      status: 'success',
      output: 'Processed 42 releases',
    },
  ],
  meta: { page: 1, pageSize: 20, totalCount: 1, totalPages: 1 },
};

const mockGetScheduledTasks = vi.fn();
const mockGetQueuedTasks = vi.fn();
const mockGetTaskHistory = vi.fn();
const mockRunTask = vi.fn();
const mockCancelTask = vi.fn();

vi.mock('@/lib/api/client', () => ({
  getApiClients: () => ({
    systemApi: {
      getScheduledTasks: mockGetScheduledTasks,
      getQueuedTasks: mockGetQueuedTasks,
      getTaskHistory: mockGetTaskHistory,
      runTask: mockRunTask,
      cancelTask: mockCancelTask,
    },
  }),
}));

vi.mock('@/lib/format', () => ({
  formatDateTime: (s: string) => s,
  formatRelativeDate: (s: string) => s,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <SystemTasksPage />
    </MemoryRouter>,
  );
}

describe('SystemTasksPage', () => {
  beforeEach(() => {
    mockGetScheduledTasks.mockResolvedValue(mockScheduledTasks);
    mockGetQueuedTasks.mockResolvedValue(mockQueuedTasks);
    mockGetTaskHistory.mockResolvedValue(mockHistoryResult);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    renderPage();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
  });

  it('shows scheduled tasks after loading', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('15 minutes')).toBeInTheDocument());
    expect(screen.getAllByText('RSS Sync').length).toBeGreaterThan(0);
  });

  it('shows "No tasks currently running" when queue is empty', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('No tasks currently running.')).toBeInTheDocument(),
    );
  });

  it('shows task history entries after loading', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText('RSS Sync').length).toBeGreaterThan(0));
    expect(screen.getByText('Processed 42 releases')).toBeInTheDocument();
  });

  it('calls runTask when "Run Now" is clicked', async () => {
    mockRunTask.mockResolvedValue({ taskId: 'rss-sync', taskName: 'RSS Sync', queuedAt: new Date().toISOString() });
    renderPage();
    await waitFor(() => expect(screen.getByText('Run Now')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Run Now'));
    await waitFor(() => expect(mockRunTask).toHaveBeenCalledWith('rss-sync'));
  });

  it('shows error state when scheduled tasks fail to load', async () => {
    mockGetScheduledTasks.mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Failed to load scheduled tasks')).toBeInTheDocument(),
    );
  });
});
