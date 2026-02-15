import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { getApiClients } from '@/lib/api/client';
import Page from './page';

// Mock the API client
vi.mock('@/lib/api/client');

const mockGetApiClients = vi.mocked(getApiClients);

mockGetApiClients.mockReturnValue({
  applicationsApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: 'My Sonarr',
        type: 'Sonarr',
        url: 'http://localhost:8989',
        apiKey: '********',
        syncEnabled: true,
      },
      {
        id: 2,
        name: 'My Radarr',
        type: 'Radarr',
        url: 'http://localhost:7878',
        apiKey: '********',
        syncEnabled: false,
      },
    ]),
    create: vi.fn().mockResolvedValue({
      id: 3,
      name: 'New Lidarr',
      type: 'Lidarr',
      url: 'http://localhost:8686',
      apiKey: '********',
      syncEnabled: true,
    }),
    update: vi.fn().mockResolvedValue({
      id: 1,
      name: 'Updated Sonarr',
      type: 'Sonarr',
      url: 'http://localhost:8989',
      apiKey: '********',
      syncEnabled: false,
    }),
    remove: vi.fn().mockResolvedValue({ id: 1 }),
    test: vi.fn().mockResolvedValue({
      success: true,
      message: 'Connection successful',
      diagnostics: { remediationHints: [] },
    }),
    testDraft: vi.fn().mockResolvedValue({
      success: true,
      message: 'Connection successful',
      diagnostics: { remediationHints: [] },
    }),
    sync: vi.fn().mockResolvedValue({
      success: true,
      message: 'Synced 3 indexers',
    }),
    syncAll: vi.fn().mockResolvedValue({
      success: true,
      message: 'Synced 12 indexers across 4 applications',
    }),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

// Mock toast provider
vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({
    pushToast: vi.fn(),
  }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('Applications Settings Page', () => {
  it('should render page header with title and description', () => {
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { level: 1, name: /Application Integration/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Manage Sonarr, Radarr, Lidarr, Readarr, and Whisparr integrations/i),
    ).toBeInTheDocument();
  });

  it('should render toolbar with action buttons', async () => {
    render(<Page />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sync All/i })).toBeInTheDocument();
    });
  });

  it('should render applications table with data', async () => {
    render(<Page />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('My Sonarr')).toBeInTheDocument();
      expect(screen.getByText('My Radarr')).toBeInTheDocument();
      expect(screen.getByText('Sonarr')).toBeInTheDocument();
      expect(screen.getByText('Radarr')).toBeInTheDocument();
      expect(screen.getByText('http://localhost:8989')).toBeInTheDocument();
      expect(screen.getByText('http://localhost:7878')).toBeInTheDocument();
    });
  });

  it('should mask API keys in the table', async () => {
    render(<Page />, { wrapper: createWrapper() });

    await waitFor(() => {
      const maskedKeys = screen.getAllByText('********');
      expect(maskedKeys.length).toBeGreaterThan(0);
    });
  });

  it('should open add modal when Add button is clicked', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    const addButton = await screen.findByRole('button', { name: /Add/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Add Application/i })).toBeInTheDocument();
    });
  });

  it('should display application type options in add modal', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    const addButton = await screen.findByRole('button', { name: /Add/i });
    await user.click(addButton);

    await waitFor(() => {
      // Find the modal dialog first, then look for options inside it
      const modal = screen.getByRole('dialog', { name: /Add Application/i });
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText('Sonarr')).toBeInTheDocument();
      expect(within(modal).getByText('Radarr')).toBeInTheDocument();
      expect(within(modal).getByText('Lidarr')).toBeInTheDocument();
      expect(within(modal).getByText('Readarr')).toBeInTheDocument();
      expect(within(modal).getByText('Whisparr')).toBeInTheDocument();
    });
  });

  it('should open edit modal when Edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    const editButton = await screen.findAllByRole('button', { name: /Edit/i });
    await user.click(editButton[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Edit Application/i })).toBeInTheDocument();
    });
  });

  it('should allow testing connection from the table', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    const testButton = await screen.findAllByRole('button', { name: /Test/i });
    await user.click(testButton[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Test Connection Result/i })).toBeInTheDocument();
    });
  });

  it('should show sync enabled status', async () => {
    render(<Page />, { wrapper: createWrapper() });

    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      expect(checkboxes.some(cb => cb.checked)).toBe(true);
    });
  });

  it('should render empty state when no applications exist', async () => {
    mockGetApiClients.mockReturnValueOnce({
      applicationsApi: {
        list: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
        test: vi.fn(),
        testDraft: vi.fn(),
        sync: vi.fn(),
        syncAll: vi.fn(),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(<Page />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/No applications configured/i)).toBeInTheDocument();
      expect(screen.getByText(/Create your first application integration/i)).toBeInTheDocument();
    });
  });
});
