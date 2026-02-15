import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getApiClients } from '@/lib/api/client';
import TasksPage from './page';

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

const mockedGetApiClients = vi.mocked(getApiClients);
const getScheduledTasksMock = vi.fn();
const getQueuedTasksMock = vi.fn();
const getTaskHistoryMock = vi.fn();
const getTaskDetailsMock = vi.fn();
const runTaskMock = vi.fn();
const cancelTaskMock = vi.fn();

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });
}

function renderPage(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <TasksPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();

  getScheduledTasksMock.mockResolvedValue([
    {
      id: 'rss-sync',
      taskName: 'RSS Sync',
      interval: '15m',
      lastExecution: '2026-02-15T10:00:00.000Z',
      lastDuration: 2.5,
      nextExecution: '2026-02-15T10:15:00.000Z',
      status: 'pending',
    },
  ]);

  getQueuedTasksMock.mockResolvedValue([
    {
      id: 1,
      taskName: 'Media Scan',
      started: '2026-02-15T10:05:00.000Z',
      duration: null,
      progress: 45,
      status: 'running',
    },
  ]);

  getTaskHistoryMock.mockResolvedValue({
    items: [
      {
        id: 1,
        taskName: 'RSS Sync',
        started: '2026-02-15T10:00:00.000Z',
        duration: 2.5,
        status: 'success',
        output: null,
      },
    ],
    meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
  });

  getTaskDetailsMock.mockResolvedValue({
    id: 1,
    taskName: 'RSS Sync',
    started: '2026-02-15T10:00:00.000Z',
    duration: 2.5,
    status: 'success',
    output: 'Scanned 15 indexers',
  });

  runTaskMock.mockResolvedValue({
    taskId: 'rss-sync',
    taskName: 'RSS Sync',
    queuedAt: '2026-02-15T10:30:00.000Z',
  });

  cancelTaskMock.mockResolvedValue({
    id: 1,
    taskName: 'Media Scan',
    cancelled: true,
  });

  mockedGetApiClients.mockReturnValue({
    systemApi: {
      getScheduledTasks: getScheduledTasksMock,
      getQueuedTasks: getQueuedTasksMock,
      getTaskHistory: getTaskHistoryMock,
      getTaskDetails: getTaskDetailsMock,
      runTask: runTaskMock,
      cancelTask: cancelTaskMock,
    },
  } as ReturnType<typeof getApiClients>);
});

describe('tasks page', () => {
  it('renders page header with title and description', () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    expect(screen.getByRole('heading', { name: 'System Tasks' })).toBeInTheDocument();
    expect(screen.getByText(/scheduled jobs and manual task execution/i)).toBeInTheDocument();
  });

  it('renders section headers for the three tables', () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    expect(screen.getByText('Scheduled Tasks')).toBeInTheDocument();
    expect(screen.getByText('Queued Tasks')).toBeInTheDocument();
    expect(screen.getByText('Task History')).toBeInTheDocument();
  });

  it('calls getScheduledTasks on mount', () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    expect(getScheduledTasksMock).toHaveBeenCalled();
  });

  it('calls getQueuedTasks on mount', () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    expect(getQueuedTasksMock).toHaveBeenCalled();
  });

  it('calls getTaskHistory on mount', () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    expect(getTaskHistoryMock).toHaveBeenCalled();
  });

  it('opens task details modal when clicking Details button', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await waitFor(() => {
      expect(getTaskHistoryMock).toHaveBeenCalled();
    });

    const detailsButtons = screen.getAllByText('Details');
    expect(detailsButtons.length).toBeGreaterThan(0);

    fireEvent.click(detailsButtons[0]);

    await waitFor(() => {
      expect(getTaskDetailsMock).toHaveBeenCalled();
    });

    const dialog = await screen.findByRole('dialog', { name: 'Task Details' });
    expect(dialog).toBeInTheDocument();
  });

  it('closes task details modal when clicking Close', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await waitFor(() => {
      expect(getTaskHistoryMock).toHaveBeenCalled();
    });

    const detailsButtons = screen.getAllByText('Details');
    fireEvent.click(detailsButtons[0]);

    await screen.findByRole('dialog', { name: 'Task Details' });

    const closeButton = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Task Details' })).not.toBeInTheDocument();
    });
  });
});
