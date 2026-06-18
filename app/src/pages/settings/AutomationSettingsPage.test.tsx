import { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AutomationSettingsPage } from './AutomationSettingsPage';

vi.mock('@/components/providers/ToastProvider', () => ({
  ToastProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useToast: () => ({ pushToast: vi.fn() }),
}));

const mockSchedulerApi = vi.hoisted(() => ({
  listTasks: vi.fn(),
  runTask: vi.fn(),
  updateInterval: vi.fn(),
  getHistory: vi.fn(),
  toggleEnabled: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({ schedulerApi: mockSchedulerApi })),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AutomationSettingsPage />
    </QueryClientProvider>,
  );
}

const baseTasks = [
  {
    id: 'rss-sync',
    taskName: 'RSS Sync',
    cronExpression: '*/15 * * * *',
    lastRunAt: '2026-06-18T12:00:00.000Z',
    lastDurationMs: 1234,
    nextRunAt: '2026-06-18T12:15:00.000Z',
    enabled: true,
    status: 'healthy' as const,
  },
  {
    id: 'wanted-search',
    taskName: 'Wanted Search',
    cronExpression: '0 */6 * * *',
    lastRunAt: '2026-06-18T06:00:00.000Z',
    lastDurationMs: 5800,
    nextRunAt: '2026-06-18T12:00:00.000Z',
    enabled: true,
    status: 'warning' as const,
  },
];

const baseHistory = {
  items: [
    {
      id: 1,
      taskName: 'rss-sync',
      status: 'SUCCESS' as const,
      startedAt: '2026-06-18T12:00:00.000Z',
      completedAt: '2026-06-18T12:00:01.000Z',
      durationMs: 1000,
      errorMessage: null,
    },
    {
      id: 2,
      taskName: 'wanted-search',
      status: 'FAILED' as const,
      startedAt: '2026-06-18T06:00:00.000Z',
      completedAt: '2026-06-18T06:00:05.000Z',
      durationMs: 5000,
      errorMessage: 'Indexer timeout',
    },
  ],
  meta: { page: 1, pageSize: 25, totalCount: 2, totalPages: 1 },
};

describe('AutomationSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSchedulerApi.listTasks.mockResolvedValue(baseTasks);
    mockSchedulerApi.runTask.mockResolvedValue({ taskId: 'rss-sync', executionId: 99 });
    mockSchedulerApi.updateInterval.mockResolvedValue({ taskId: 'rss-sync', cronExpression: '*/30 * * * *' });
    mockSchedulerApi.toggleEnabled.mockResolvedValue({ taskId: 'rss-sync', enabled: false });
    mockSchedulerApi.getHistory.mockResolvedValue(baseHistory);
  });

  it('renders the page title and description', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: /automation/i })).toBeInTheDocument();
  });

  it('calls schedulerApi.listTasks once on mount', async () => {
    renderPage();

    await waitFor(() => {
      expect(mockSchedulerApi.listTasks).toHaveBeenCalledTimes(1);
    });
  });

  it('renders a row per scheduled task in the scheduler table', async () => {
    renderPage();

    expect(await screen.findByText('RSS Sync')).toBeInTheDocument();
    expect(screen.getByText('Wanted Search')).toBeInTheDocument();
  });

  it('calls schedulerApi.runTask with the task id when Run Now is clicked', async () => {
    renderPage();

    const buttons = await screen.findAllByRole('button', { name: /run now/i });
    fireEvent.click(buttons[0]!);

    await waitFor(() => {
      expect(mockSchedulerApi.runTask).toHaveBeenCalledWith('rss-sync');
    });
  });

  it('shows the running state on the task row while schedulerApi.runTask is in-flight', async () => {
    let resolveRunTask!: (value: { taskId: string; executionId: number }) => void;
    mockSchedulerApi.runTask.mockImplementation(
      () =>
        new Promise<{ taskId: string; executionId: number }>((resolve) => {
          resolveRunTask = resolve;
        }),
    );

    renderPage();

    const buttons = await screen.findAllByRole('button', { name: /run now/i });
    fireEvent.click(buttons[0]!);

    expect(await screen.findByRole('button', { name: /running\.\.\./i })).toBeInTheDocument();

    resolveRunTask!({ taskId: 'rss-sync', executionId: 99 });
  });

  it('calls schedulerApi.updateInterval with (taskId, cronExpression) when a preset is clicked', async () => {
    renderPage();

    const row = (await screen.findByText('RSS Sync')).closest('tr');
    if (!row) throw new Error('Expected RSS Sync row');

    const presetButton = await screen.findByRole('button', { name: /^30m$/ });
    fireEvent.click(presetButton);

    await waitFor(() => {
      expect(mockSchedulerApi.updateInterval).toHaveBeenCalledWith('rss-sync', '*/30 * * * *');
    });
  });

  it('updates the displayed cron expression optimistically before schedulerApi.updateInterval resolves', async () => {
    let resolveUpdate!: (value: { taskId: string; cronExpression: string }) => void;
    mockSchedulerApi.updateInterval.mockImplementation(
      () =>
        new Promise<{ taskId: string; cronExpression: string }>((resolve) => {
          resolveUpdate = resolve;
        }),
    );

    renderPage();

    expect(await screen.findByText('*/15 * * * *')).toBeInTheDocument();

    const presetButton = screen.getByRole('button', { name: /^30m$/ });
    fireEvent.click(presetButton);

    expect(await screen.findByText('*/30 * * * *')).toBeInTheDocument();

    resolveUpdate!({ taskId: 'rss-sync', cronExpression: '*/30 * * * *' });
  });

  it('rolls back the cron expression and shows error toast when schedulerApi.updateInterval rejects', async () => {
    let rejectUpdate!: (reason: Error) => void;
    mockSchedulerApi.updateInterval.mockImplementation(
      () =>
        new Promise<{ taskId: string; cronExpression: string }>((_resolve, reject) => {
          rejectUpdate = reject;
        }),
    );

    renderPage();

    expect(await screen.findByText('*/15 * * * *')).toBeInTheDocument();

    const presetButton = screen.getByRole('button', { name: /^30m$/ });
    fireEvent.click(presetButton);

    expect(await screen.findByText('*/30 * * * *')).toBeInTheDocument();

    rejectUpdate(new Error('Invalid cron'));

    await waitFor(() => {
      expect(screen.getByText('*/15 * * * *')).toBeInTheDocument();
    });
  });

  it('renders the TaskHistoryPanel with rows returned by schedulerApi.getHistory', async () => {
    renderPage();

    expect(await screen.findByText('RSS Sync')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockSchedulerApi.getHistory).toHaveBeenCalled();
    });

    expect(await screen.findByText('rss-sync')).toBeInTheDocument();
  });

  it('calls schedulerApi.getHistory with incremented page when Next page is clicked', async () => {
    mockSchedulerApi.getHistory.mockResolvedValue({
      ...baseHistory,
      meta: { page: 1, pageSize: 1, totalCount: 3, totalPages: 3 },
    });

    renderPage();

    const nextButton = await screen.findByRole('button', { name: /next page/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      const calls = mockSchedulerApi.getHistory.mock.calls;
      const lastCall = calls[calls.length - 1]?.[0] as { page: number } | undefined;
      expect(lastCall?.page).toBe(2);
    });
  });

  it('calls schedulerApi.getHistory with fromDate when the From date input changes', async () => {
    renderPage();

    const fromInput = await screen.findByLabelText(/^from$/i);
    fireEvent.change(fromInput, { target: { value: '2026-06-01' } });

    await waitFor(() => {
      const calls = mockSchedulerApi.getHistory.mock.calls;
      const lastCall = calls[calls.length - 1]?.[0] as { fromDate?: string } | undefined;
      expect(lastCall?.fromDate).toBe('2026-06-01');
    });
  });

  it('calls schedulerApi.getHistory with toDate when the To date input changes', async () => {
    renderPage();

    const toInput = await screen.findByLabelText(/^to$/i);
    fireEvent.change(toInput, { target: { value: '2026-06-30' } });

    await waitFor(() => {
      const calls = mockSchedulerApi.getHistory.mock.calls;
      const lastCall = calls[calls.length - 1]?.[0] as { toDate?: string } | undefined;
      expect(lastCall?.toDate).toBe('2026-06-30');
    });
  });
});