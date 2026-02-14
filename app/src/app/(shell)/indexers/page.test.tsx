import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import IndexersPage from './page';

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

interface IndexerFixture {
  id: number;
  name: string;
  implementation: string;
  configContract: string;
  settings: string;
  protocol: string;
  enabled: boolean;
  supportsRss: boolean;
  supportsSearch: boolean;
  priority: number;
  health?: {
    failureCount?: number;
    lastErrorMessage?: string | null;
  } | null;
}

function buildIndexer(overrides: Partial<IndexerFixture>): IndexerFixture {
  return {
    id: 1,
    name: 'Indexer 1',
    implementation: 'Torznab',
    configContract: 'TorznabSettings',
    settings: '{"url":"https://indexer.test","apiKey":"abc"}',
    protocol: 'torrent',
    enabled: true,
    supportsRss: true,
    supportsSearch: true,
    priority: 25,
    health: { failureCount: 0, lastErrorMessage: null },
    ...overrides,
  };
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function renderPage(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <IndexersPage />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const mockedGetApiClients = vi.mocked(getApiClients);

const listMock = vi.fn<() => Promise<IndexerFixture[]>>();
const createMock = vi.fn();
const updateMock = vi.fn();
const removeMock = vi.fn();
const testMock = vi.fn();
const testDraftMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  listMock.mockResolvedValue([]);
  createMock.mockResolvedValue(buildIndexer({ id: 11, name: 'Created Indexer' }));
  updateMock.mockImplementation((id: number, input: Record<string, unknown>) => {
    return Promise.resolve(
      buildIndexer({
        id,
        enabled: typeof input.enabled === 'boolean' ? input.enabled : true,
        priority: typeof input.priority === 'number' ? input.priority : 25,
      }),
    );
  });
  removeMock.mockResolvedValue({ id: 1 });
  testMock.mockResolvedValue({
    success: true,
    message: 'Connectivity check succeeded.',
    diagnostics: { remediationHints: ['No remediation needed.'] },
    healthSnapshot: null,
  });
  testDraftMock.mockResolvedValue({
    success: true,
    message: 'Connectivity check succeeded.',
    diagnostics: { remediationHints: ['No remediation needed.'] },
    healthSnapshot: null,
  });

  mockedGetApiClients.mockReturnValue({
    indexerApi: {
      list: listMock,
      create: createMock,
      update: updateMock,
      remove: removeMock,
      test: testMock,
      testDraft: testDraftMock,
    },
  } as ReturnType<typeof getApiClients>);
});

describe('indexers page', () => {
  it('renders indexer table columns for the index view contract', async () => {
    listMock.mockResolvedValue([buildIndexer({ id: 31, name: 'Alpha Hub' })]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await screen.findByText('Alpha Hub');

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Protocol' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Enabled' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Priority' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Health' })).toBeInTheDocument();
  });

  it('renders page toolbar actions and executes refresh/sync/select-mode controls', async () => {
    listMock.mockResolvedValue([buildIndexer({ id: 41, name: 'Toolbar Indexer' })]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await screen.findByText('Toolbar Indexer');

    const addButton = screen.getByRole('button', { name: 'Add' });
    const refreshButton = screen.getByRole('button', { name: 'Refresh' });
    const syncButton = screen.getByRole('button', { name: 'Sync' });
    const selectModeButton = screen.getByRole('button', { name: 'Select Mode' });

    expect(addButton).toBeInTheDocument();
    expect(refreshButton).toBeInTheDocument();
    expect(syncButton).toBeInTheDocument();
    expect(selectModeButton).toBeInTheDocument();

    fireEvent.click(refreshButton);
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(listMock.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    fireEvent.click(selectModeButton);
    expect(screen.getByText('Selection mode enabled')).toBeInTheDocument();
  });

  it('filters visible rows by alphabet jump bar selection', async () => {
    listMock.mockResolvedValue([
      buildIndexer({ id: 51, name: 'Alpha Hub' }),
      buildIndexer({ id: 52, name: 'Beta Vault' }),
      buildIndexer({ id: 53, name: '1337 Mirror' }),
    ]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await screen.findByText('Alpha Hub');
    expect(screen.getByText('Beta Vault')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'B' }));
    expect(screen.queryByText('Alpha Hub')).not.toBeInTheDocument();
    expect(screen.getByText('Beta Vault')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '#' }));
    expect(screen.getByText('1337 Mirror')).toBeInTheDocument();
    expect(screen.queryByText('Beta Vault')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByText('Alpha Hub')).toBeInTheDocument();
    expect(screen.getByText('Beta Vault')).toBeInTheDocument();
  });

  it('opens edit modal with pre-populated values and supports cancel reset', async () => {
    listMock.mockResolvedValue([
      buildIndexer({
        id: 61,
        name: 'Editable Indexer',
        settings: JSON.stringify({ url: 'https://editable.example', apiKey: 'edit-key' }),
      }),
    ]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    const row = (await screen.findByText('Editable Indexer')).closest('tr');
    expect(row).not.toBeNull();

    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Edit' }));

    const modal = screen.getByRole('dialog', { name: 'Edit indexer' });
    expect(within(modal).getByDisplayValue('Editable Indexer')).toBeInTheDocument();
    expect(within(modal).getByDisplayValue('https://editable.example')).toBeInTheDocument();

    fireEvent.click(within(modal).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog', { name: 'Edit indexer' })).not.toBeInTheDocument();
  });

  it('submits edited indexer payload through modal save action', async () => {
    listMock.mockResolvedValue([
      buildIndexer({
        id: 91,
        name: 'Updater Indexer',
        settings: JSON.stringify({ url: 'https://old.example', apiKey: 'old-key' }),
      }),
    ]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    const row = (await screen.findByText('Updater Indexer')).closest('tr');
    expect(row).not.toBeNull();

    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Edit' }));

    const modal = await screen.findByRole('dialog', { name: 'Edit indexer' });
    fireEvent.change(within(modal).getByLabelText('Name'), { target: { value: 'Updater Indexer v2' } });
    fireEvent.change(within(modal).getByLabelText('Indexer URL'), { target: { value: 'https://new.example' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Save Indexer' }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        91,
        expect.objectContaining({
          name: 'Updater Indexer v2',
          settings: JSON.stringify({
            url: 'https://new.example',
            apiKey: 'old-key',
          }),
        }),
      );
    });
  });

  it('deletes an indexer row and shows deletion confirmation toast', async () => {
    listMock.mockResolvedValue([buildIndexer({ id: 71, name: 'Delete Me' })]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    const row = (await screen.findByText('Delete Me')).closest('tr');
    expect(row).not.toBeNull();

    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(removeMock).toHaveBeenCalledWith(71);
    });
    expect(await screen.findByText('Indexer deleted')).toBeInTheDocument();
  });

  it('surfaces save errors from create mutation failures', async () => {
    createMock.mockRejectedValueOnce(new Error('save exploded'));

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Broken Indexer' } });
    fireEvent.change(screen.getByLabelText('Indexer URL'), { target: { value: 'https://broken.example' } });
    fireEvent.change(screen.getByLabelText(/^API Key$/), { target: { value: 'broken-key' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add Indexer' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Save failed');
    expect(await screen.findByRole('status')).toHaveTextContent('save exploded');
  });

  it('rolls back the enabled toggle when optimistic mutation fails', async () => {
    listMock.mockResolvedValue([
      buildIndexer({ id: 7, name: 'Fallback Indexer', enabled: true }),
    ]);
    let rejectUpdate: ((reason?: unknown) => void) | undefined;
    updateMock.mockImplementationOnce(() => {
      return new Promise<IndexerFixture>((_resolve, reject) => {
        rejectUpdate = reject;
      });
    });

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    const rowLabel = await screen.findByText('Fallback Indexer');
    const row = rowLabel.closest('tr');
    expect(row).not.toBeNull();

    const enabledCheckbox = within(row as HTMLElement).getByRole('checkbox');
    expect(enabledCheckbox).toBeChecked();

    fireEvent.click(enabledCheckbox);

    await waitFor(() => {
      expect(queryClient.getQueryData<IndexerFixture[]>(queryKeys.indexers())?.[0]?.enabled).toBe(false);
    });

    rejectUpdate?.(new Error('timeout'));
    expect(await screen.findByText('Could not update indexer enabled state.')).toBeInTheDocument();

    await waitFor(() => {
      expect(queryClient.getQueryData<IndexerFixture[]>(queryKeys.indexers())?.[0]?.enabled).toBe(true);
    });
    expect(within(row as HTMLElement).getByRole('checkbox')).toBeChecked();
  });

  it('applies priority edits optimistically before the server responds', async () => {
    listMock.mockResolvedValue([
      buildIndexer({ id: 3, name: 'Speed Indexer', priority: 10 }),
    ]);

    let resolveUpdate: ((value: IndexerFixture) => void) | undefined;
    updateMock.mockImplementationOnce((id: number, input: Record<string, unknown>) => {
      return new Promise<IndexerFixture>(resolve => {
        resolveUpdate = resolve;
      }).then(() => {
        return buildIndexer({
          id,
          name: 'Speed Indexer',
          priority: typeof input.priority === 'number' ? input.priority : 10,
        });
      });
    });

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    const rowLabel = await screen.findByText('Speed Indexer');
    const row = rowLabel.closest('tr');
    expect(row).not.toBeNull();

    const priorityInput = within(row as HTMLElement).getByDisplayValue('10');
    fireEvent.change(priorityInput, { target: { value: '42' } });
    fireEvent.blur(priorityInput);

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(3, { priority: 42 });
      expect(queryClient.getQueryData<IndexerFixture[]>(queryKeys.indexers())?.[0]?.priority).toBe(42);
    });

    resolveUpdate?.(buildIndexer({ id: 3, name: 'Speed Indexer', priority: 42 }));
  });

  it('renders test success/failure diagnostics and remediation hints', async () => {
    listMock.mockResolvedValue([
      buildIndexer({ id: 1, name: 'Healthy Indexer' }),
      buildIndexer({ id: 2, name: 'Flaky Indexer', health: { failureCount: 3, lastErrorMessage: 'HTTP timeout' } }),
    ]);

    testMock.mockImplementation((id: number) => {
      if (id === 1) {
        return Promise.resolve({
          success: true,
          message: 'Connectivity check succeeded.',
          diagnostics: { remediationHints: ['No remediation needed.'] },
          healthSnapshot: null,
        });
      }

      return Promise.resolve({
        success: false,
        message: 'HTTP timeout contacting indexer.',
        diagnostics: { remediationHints: ['Verify API key', 'Check firewall rules'] },
        healthSnapshot: { failureCount: 3, lastErrorMessage: 'HTTP timeout' },
      });
    });

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    const healthyRow = (await screen.findByText('Healthy Indexer')).closest('tr');
    const flakyRow = screen.getByText('Flaky Indexer').closest('tr');
    expect(healthyRow).not.toBeNull();
    expect(flakyRow).not.toBeNull();

    fireEvent.click(within(healthyRow as HTMLElement).getByRole('button', { name: 'Test' }));
    fireEvent.click(within(flakyRow as HTMLElement).getByRole('button', { name: 'Test' }));

    expect(await screen.findByText('Indexer test passed')).toBeInTheDocument();
    expect(await screen.findByText('Indexer test failed')).toBeInTheDocument();
    expect(await screen.findByText('Indexer #1: Connectivity check succeeded.')).toBeInTheDocument();
    expect(await screen.findByText('Indexer #2: HTTP timeout contacting indexer.')).toBeInTheDocument();
    expect(await screen.findByText('Verify API key')).toBeInTheDocument();
    expect(await screen.findByText('Check firewall rules')).toBeInTheDocument();
  });

  it('shows per-row health status badges from indexer health snapshots', async () => {
    listMock.mockResolvedValue([
      buildIndexer({ id: 11, name: 'Healthy', health: { failureCount: 0, lastErrorMessage: null } }),
      buildIndexer({ id: 12, name: 'Degraded', health: { failureCount: 1, lastErrorMessage: 'slow response' } }),
      buildIndexer({ id: 13, name: 'Broken', health: { failureCount: 4, lastErrorMessage: 'auth failed' } }),
    ]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    const healthyRow = (await screen.findByText('Healthy')).closest('tr');
    const degradedRow = screen.getByText('Degraded').closest('tr');
    const brokenRow = screen.getByText('Broken').closest('tr');

    expect(within(healthyRow as HTMLElement).getByText('completed')).toBeInTheDocument();
    expect(within(degradedRow as HTMLElement).getByText('warning')).toBeInTheDocument();
    expect(within(brokenRow as HTMLElement).getByText('error')).toBeInTheDocument();
  });

  it('creates indexers from modal presets and runs draft connection tests', async () => {
    listMock.mockResolvedValue([buildIndexer({ id: 21, name: 'Any Indexer' })]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);
    await screen.findByText('Any Indexer');

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('dialog', { name: 'Add indexer' })).toBeInTheDocument();
    expect(screen.getByLabelText('Indexer URL')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Generic Newznab/ }));
    expect(screen.queryByLabelText('Indexer URL')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Host')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Usenet Provider' } });
    fireEvent.change(screen.getByLabelText('Host'), { target: { value: 'news.provider.net' } });
    fireEvent.change(screen.getByLabelText(/^API Key$/), { target: { value: 'usenet-key' } });

    fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));

    await waitFor(() => {
      expect(testDraftMock).toHaveBeenCalledWith(
        expect.objectContaining({
          protocol: 'usenet',
          settings: JSON.stringify({ host: 'news.provider.net', apiKey: 'usenet-key' }),
        }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Indexer' }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1);
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          protocol: 'usenet',
          settings: JSON.stringify({ host: 'news.provider.net', apiKey: 'usenet-key' }),
        }),
      );
    });
  });
});
