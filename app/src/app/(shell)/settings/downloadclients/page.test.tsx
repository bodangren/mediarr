import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import DownloadClientsPage from './page';

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

interface DownloadClientFixture {
  id: number;
  name: string;
  implementation: string;
  configContract: string;
  settings: string;
  protocol: 'torrent' | 'usenet';
  host: string;
  port: number;
  category: string | null;
  priority: number;
  enabled: boolean;
  health?: {
    failureCount?: number;
    lastErrorMessage?: string | null;
  } | null;
}

function buildDownloadClient(overrides: Partial<DownloadClientFixture>): DownloadClientFixture {
  return {
    id: 1,
    name: 'Download Client 1',
    implementation: 'Transmission',
    configContract: 'TransmissionSettings',
    settings: '{}',
    protocol: 'torrent',
    host: 'localhost',
    port: 9091,
    category: 'movies',
    priority: 1,
    enabled: true,
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
        <DownloadClientsPage />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const mockedGetApiClients = vi.mocked(getApiClients);

const listMock = vi.fn<() => Promise<DownloadClientFixture[]>>();
const createMock = vi.fn();
const updateMock = vi.fn();
const removeMock = vi.fn();
const testMock = vi.fn();
const testDraftMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  listMock.mockResolvedValue([]);
  createMock.mockResolvedValue(buildDownloadClient({ id: 11, name: 'Created Client' }));
  updateMock.mockImplementation((id: number, input: Record<string, unknown>) => {
    return Promise.resolve(
      buildDownloadClient({
        id,
        enabled: typeof input.enabled === 'boolean' ? input.enabled : true,
        priority: typeof input.priority === 'number' ? input.priority : 1,
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
    downloadClientApi: {
      list: listMock,
      create: createMock,
      update: updateMock,
      remove: removeMock,
      test: testMock,
      testDraft: testDraftMock,
    },
  } as ReturnType<typeof getApiClients>);
});

describe('download clients page', () => {
  it('renders download client table columns for the index view contract', async () => {
    listMock.mockResolvedValue([buildDownloadClient({ id: 31, name: 'Transmission Hub' })]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await screen.findByText('Transmission Hub');

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Type' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Host' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Category' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Enabled' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Priority' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Health' })).toBeInTheDocument();
  });

  it('renders page toolbar actions and executes refresh/select-mode controls', async () => {
    listMock.mockResolvedValue([buildDownloadClient({ id: 41, name: 'Toolbar Client' })]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await screen.findByText('Toolbar Client');

    const addButton = screen.getByRole('button', { name: 'Add' });
    const refreshButton = screen.getByRole('button', { name: 'Refresh' });
    const selectModeButton = screen.getByRole('button', { name: 'Select Mode' });

    expect(addButton).toBeInTheDocument();
    expect(refreshButton).toBeInTheDocument();
    expect(selectModeButton).toBeInTheDocument();

    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(listMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    fireEvent.click(selectModeButton);
    expect(screen.getByText('Selection mode enabled')).toBeInTheDocument();
  });

  it('filters visible rows by alphabet jump bar selection', async () => {
    listMock.mockResolvedValue([
      buildDownloadClient({ id: 51, name: 'Alpha Hub' }),
      buildDownloadClient({ id: 52, name: 'Beta Vault' }),
      buildDownloadClient({ id: 53, name: '1337 Client' }),
    ]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await screen.findByText('Alpha Hub');
    expect(screen.getByText('Beta Vault')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'B' }));
    expect(screen.queryByText('Alpha Hub')).not.toBeInTheDocument();
    expect(screen.getByText('Beta Vault')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '#' }));
    expect(screen.getByText('1337 Client')).toBeInTheDocument();
    expect(screen.queryByText('Beta Vault')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByText('Alpha Hub')).toBeInTheDocument();
    expect(screen.getByText('Beta Vault')).toBeInTheDocument();
  });

  it('opens edit modal with pre-populated values and supports cancel reset', async () => {
    listMock.mockResolvedValue([
      buildDownloadClient({
        id: 61,
        name: 'Editable Client',
        settings: JSON.stringify({ useSsl: true }),
      }),
    ]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    const row = (await screen.findByText('Editable Client')).closest('tr');
    expect(row).not.toBeNull();

    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Edit' }));

    const modal = screen.getByRole('dialog', { name: 'Edit download client' });
    expect(within(modal).getByDisplayValue('Editable Client')).toBeInTheDocument();
    expect(within(modal).getByDisplayValue('localhost')).toBeInTheDocument();

    fireEvent.click(within(modal).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog', { name: 'Edit download client' })).not.toBeInTheDocument();
  });

  it('submits edited download client payload through modal save action', async () => {
    listMock.mockResolvedValue([
      buildDownloadClient({
        id: 91,
        name: 'Updater Client',
        settings: JSON.stringify({ useSsl: false }),
      }),
    ]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    const row = (await screen.findByText('Updater Client')).closest('tr');
    expect(row).not.toBeNull();

    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Edit' }));

    const modal = await screen.findByRole('dialog', { name: 'Edit download client' });
    fireEvent.change(within(modal).getByLabelText('Name'), { target: { value: 'Updater Client v2' } });
    fireEvent.change(within(modal).getByLabelText('Host'), { target: { value: '192.168.1.200' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        91,
        expect.objectContaining({
          name: 'Updater Client v2',
          host: '192.168.1.200',
        }),
      );
    });
  });

  it('deletes a download client row and shows deletion confirmation toast', async () => {
    listMock.mockResolvedValue([buildDownloadClient({ id: 71, name: 'Delete Me' })]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    const row = (await screen.findByText('Delete Me')).closest('tr');
    expect(row).not.toBeNull();

    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(removeMock).toHaveBeenCalledWith(71);
    });
    expect(await screen.findByText('Download client deleted')).toBeInTheDocument();
  });

  it('surfaces save errors from create mutation failures', async () => {
    createMock.mockRejectedValueOnce(new Error('save exploded'));

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Broken Client' } });
    fireEvent.change(screen.getByLabelText('Host'), { target: { value: 'localhost' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add Download Client' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Save failed');
    expect(await screen.findByRole('status')).toHaveTextContent('save exploded');
  });

  it('rolls back enabled toggle when optimistic mutation fails', async () => {
    listMock.mockResolvedValue([
      buildDownloadClient({ id: 7, name: 'Fallback Client', enabled: true }),
    ]);
    let rejectUpdate: ((reason?: unknown) => void) | undefined;
    updateMock.mockImplementationOnce(() => {
      return new Promise<DownloadClientFixture>((_resolve, reject) => {
        rejectUpdate = reject;
      });
    });

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    const rowLabel = await screen.findByText('Fallback Client');
    const row = rowLabel.closest('tr');
    expect(row).not.toBeNull();

    const enabledCheckbox = within(row as HTMLElement).getByRole('checkbox');
    expect(enabledCheckbox).toBeChecked();

    fireEvent.click(enabledCheckbox);

    await waitFor(() => {
      expect(queryClient.getQueryData<DownloadClientFixture[]>(queryKeys.downloadClients())?.[0]?.enabled).toBe(false);
    });

    rejectUpdate?.(new Error('timeout'));
    expect(await screen.findByText('Could not update download client enabled state.')).toBeInTheDocument();

    await waitFor(() => {
      expect(queryClient.getQueryData<DownloadClientFixture[]>(queryKeys.downloadClients())?.[0]?.enabled).toBe(true);
    });
    expect(within(row as HTMLElement).getByRole('checkbox')).toBeChecked();
  });

  it('applies priority edits optimistically before the server responds', async () => {
    listMock.mockResolvedValue([
      buildDownloadClient({ id: 3, name: 'Speed Client', priority: 1 }),
    ]);

    let resolveUpdate: ((value: DownloadClientFixture) => void) | undefined;
    updateMock.mockImplementationOnce((id: number, input: Record<string, unknown>) => {
      return new Promise<DownloadClientFixture>(resolve => {
        resolveUpdate = resolve;
      }).then(() => {
        return buildDownloadClient({
          id,
          name: 'Speed Client',
          priority: typeof input.priority === 'number' ? input.priority : 1,
        });
      });
    });

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    const rowLabel = await screen.findByText('Speed Client');
    const row = rowLabel.closest('tr');
    expect(row).not.toBeNull();

    const priorityInput = within(row as HTMLElement).getByDisplayValue('1');
    fireEvent.change(priorityInput, { target: { value: '5' } });
    fireEvent.blur(priorityInput);

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(3, { priority: 5 });
      expect(queryClient.getQueryData<DownloadClientFixture[]>(queryKeys.downloadClients())?.[0]?.priority).toBe(5);
    });

    resolveUpdate?.(buildDownloadClient({ id: 3, name: 'Speed Client', priority: 5 }));
  });

  it('renders test success/failure diagnostics and remediation hints', async () => {
    listMock.mockResolvedValue([
      buildDownloadClient({ id: 1, name: 'Healthy Client' }),
      buildDownloadClient({ id: 2, name: 'Flaky Client', health: { failureCount: 3, lastErrorMessage: 'HTTP timeout' } }),
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
        message: 'HTTP timeout contacting client.',
        diagnostics: { remediationHints: ['Check firewall', 'Verify credentials'] },
        healthSnapshot: { failureCount: 3, lastErrorMessage: 'HTTP timeout' },
      });
    });

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    const healthyRow = (await screen.findByText('Healthy Client')).closest('tr');
    const flakyRow = screen.getByText('Flaky Client').closest('tr');
    expect(healthyRow).not.toBeNull();
    expect(flakyRow).not.toBeNull();

    fireEvent.click(within(healthyRow as HTMLElement).getByRole('button', { name: 'Test' }));
    fireEvent.click(within(flakyRow as HTMLElement).getByRole('button', { name: 'Test' }));

    expect(await screen.findByText('Download client test passed')).toBeInTheDocument();
    expect(await screen.findByText('Download client test failed')).toBeInTheDocument();
    expect(await screen.findByText('Download Client #1: Connectivity check succeeded.')).toBeInTheDocument();
    expect(await screen.findByText('Download Client #2: HTTP timeout contacting client.')).toBeInTheDocument();
    expect(screen.getByText('Check firewall')).toBeInTheDocument();
    expect(screen.getByText('Verify credentials')).toBeInTheDocument();
  });

  it('shows per-row health status badges from client health snapshots', async () => {
    listMock.mockResolvedValue([
      buildDownloadClient({ id: 11, name: 'Healthy', health: { failureCount: 0, lastErrorMessage: null } }),
      buildDownloadClient({ id: 12, name: 'Degraded', health: { failureCount: 1, lastErrorMessage: 'slow response' } }),
      buildDownloadClient({ id: 13, name: 'Broken', health: { failureCount: 4, lastErrorMessage: 'auth failed' } }),
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

  it('creates download clients from modal presets and runs draft connection tests', async () => {
    listMock.mockResolvedValue([buildDownloadClient({ id: 21, name: 'Any Client' })]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);
    await screen.findByText('Any Client');

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('dialog', { name: 'Add download client' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'qBittorrent Test' } });
    fireEvent.click(screen.getByRole('button', { name: /qBittorrent/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));

    await waitFor(() => {
      expect(testDraftMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'qBittorrent Test',
          implementation: 'QBittorrent',
          protocol: 'torrent',
        }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Download Client' }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1);
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'qBittorrent Test',
          implementation: 'QBittorrent',
          protocol: 'torrent',
        }),
      );
    });
  });

  it('confirms and deletes selected download clients in bulk mode', async () => {
    listMock.mockResolvedValue([
      buildDownloadClient({ id: 201, name: 'Bulk Alpha' }),
      buildDownloadClient({ id: 202, name: 'Bulk Beta' }),
      buildDownloadClient({ id: 203, name: 'Bulk Gamma' }),
    ]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    const alphaRow = (await screen.findByText('Bulk Alpha')).closest('tr');
    const betaRow = screen.getByText('Bulk Beta').closest('tr');
    expect(alphaRow).not.toBeNull();
    expect(betaRow).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Select Mode' }));
    const alphaSelectableRow = screen.getByText('Bulk Alpha').closest('tr');
    const betaSelectableRow = screen.getByText('Bulk Beta').closest('tr');
    fireEvent.click(within(alphaSelectableRow as HTMLElement).getByRole('checkbox', { name: 'Select row' }));
    fireEvent.click(within(betaSelectableRow as HTMLElement).getByRole('checkbox', { name: 'Select row' }));

    fireEvent.click(screen.getByRole('button', { name: 'Delete Selected' }));

    const confirmModal = await screen.findByRole('dialog', { name: 'Delete selected download clients' });
    fireEvent.click(within(confirmModal).getByRole('button', { name: 'Delete 2 Download Clients' }));

    await waitFor(() => {
      expect(removeMock).toHaveBeenCalledTimes(2);
      expect(removeMock).toHaveBeenCalledWith(201);
      expect(removeMock).toHaveBeenCalledWith(202);
    });

    expect(await screen.findByText('Deleted 2 download clients')).toBeInTheDocument();
  });

  it('runs bulk test operations for selected download clients', async () => {
    listMock.mockResolvedValue([
      buildDownloadClient({ id: 301, name: 'Test Alpha' }),
      buildDownloadClient({ id: 302, name: 'Test Beta' }),
    ]);

    testMock.mockImplementation((id: number) => {
      if (id === 301) {
        return Promise.resolve({
          success: true,
          message: 'Alpha healthy',
          diagnostics: { remediationHints: ['No remediation needed.'] },
          healthSnapshot: null,
        });
      }

      return Promise.resolve({
        success: false,
        message: 'Beta timeout',
        diagnostics: { remediationHints: ['Check DNS'] },
        healthSnapshot: { failureCount: 3, lastErrorMessage: 'timeout' },
      });
    });

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    const alphaRow = (await screen.findByText('Test Alpha')).closest('tr');
    const betaRow = screen.getByText('Test Beta').closest('tr');
    expect(alphaRow).not.toBeNull();
    expect(betaRow).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Select Mode' }));
    const alphaSelectableRow = screen.getByText('Test Alpha').closest('tr');
    const betaSelectableRow = screen.getByText('Test Beta').closest('tr');
    fireEvent.click(within(alphaSelectableRow as HTMLElement).getByRole('checkbox', { name: 'Select row' }));
    fireEvent.click(within(betaSelectableRow as HTMLElement).getByRole('checkbox', { name: 'Select row' }));

    fireEvent.click(screen.getByRole('button', { name: 'Test Selected' }));

    await waitFor(() => {
      expect(testMock).toHaveBeenCalledTimes(2);
      expect(testMock).toHaveBeenCalledWith(301);
      expect(testMock).toHaveBeenCalledWith(302);
    });

    expect(await screen.findByText('Bulk download client test complete')).toBeInTheDocument();
    expect(await screen.findByText('1 passed, 1 failed')).toBeInTheDocument();
  });

  it('opens bulk edit modal and applies updates to selected download clients', async () => {
    listMock.mockResolvedValue([
      buildDownloadClient({ id: 401, name: 'Edit Alpha', enabled: false, priority: 1 }),
      buildDownloadClient({ id: 402, name: 'Edit Beta', enabled: false, priority: 2 }),
    ]);

    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    const alphaRow = (await screen.findByText('Edit Alpha')).closest('tr');
    const betaRow = screen.getByText('Edit Beta').closest('tr');
    expect(alphaRow).not.toBeNull();
    expect(betaRow).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Select Mode' }));
    const alphaSelectableRow = screen.getByText('Edit Alpha').closest('tr');
    const betaSelectableRow = screen.getByText('Edit Beta').closest('tr');
    fireEvent.click(within(alphaSelectableRow as HTMLElement).getByRole('checkbox', { name: 'Select row' }));
    fireEvent.click(within(betaSelectableRow as HTMLElement).getByRole('checkbox', { name: 'Select row' }));

    fireEvent.click(screen.getByRole('button', { name: 'Bulk Edit' }));

    const modal = await screen.findByRole('dialog', { name: 'Bulk edit download clients' });
    fireEvent.click(within(modal).getByRole('checkbox', { name: 'Enable selected download clients' }));
    fireEvent.change(within(modal).getByLabelText('Priority'), { target: { value: '10' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Apply Changes' }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(401, { enabled: true, priority: 10 });
      expect(updateMock).toHaveBeenCalledWith(402, { enabled: true, priority: 10 });
    });

    expect(await screen.findByText('Updated 2 download clients')).toBeInTheDocument();
  });
});
