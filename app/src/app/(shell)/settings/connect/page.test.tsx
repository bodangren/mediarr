import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '@/components/shell/AppShell';
import NotificationsSettingsPage from './page';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';

const mockNotifications = [
  {
    id: 1,
    name: 'Test Notification',
    type: 'Discord' as const,
    triggers: ['OnGrab' as const, 'OnDownload' as const],
    enabled: true,
    webhookUrl: 'https://discord.com/api/webhooks/test',
  },
  {
    id: 2,
    name: 'Another Notification',
    type: 'Telegram' as const,
    triggers: ['OnImport' as const],
    enabled: false,
    botToken: 'test-token',
    chatId: '123456',
  },
];

vi.mock('@/lib/api/client');

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppShell pathname="/settings/connect">
          <NotificationsSettingsPage />
        </AppShell>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('notifications settings page', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('displays empty state when no notifications configured', async () => {
    vi.mocked(getApiClients).mockReturnValue({
      notificationsApi: {
        list: vi.fn(() => Promise.resolve([])),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
        test: vi.fn(() => Promise.resolve({ success: true, message: 'Test notification sent' })),
        testDraft: vi.fn(() => Promise.resolve({ success: true, message: 'Test notification sent' })),
      },
      eventsApi: {
        connectionState: 'idle',
        onStateChange: vi.fn(() => () => {}),
      },
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText('No notification connections configured. Click Add Connection to create one.'),
      ).toBeInTheDocument();
    });
  });

  it('displays list of notifications', async () => {
    vi.mocked(getApiClients).mockReturnValue({
      notificationsApi: {
        list: vi.fn(() => Promise.resolve(mockNotifications)),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
        test: vi.fn(() => Promise.resolve({ success: true, message: 'Test notification sent' })),
        testDraft: vi.fn(() => Promise.resolve({ success: true, message: 'Test notification sent' })),
      },
      eventsApi: {
        connectionState: 'idle',
        onStateChange: vi.fn(() => () => {}),
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Test Notification')).toBeInTheDocument();
      expect(screen.getByText('Another Notification')).toBeInTheDocument();
    });
  });

  it('calls notificationsApi.update when toggle is clicked', async () => {
    const mockUpdate = vi.fn(() =>
      Promise.resolve({
        ...mockNotifications[0],
        enabled: false,
      }),
    );
    vi.mocked(getApiClients).mockReturnValue({
      notificationsApi: {
        list: vi.fn(() => Promise.resolve(mockNotifications)),
        create: vi.fn(),
        update: mockUpdate,
        remove: vi.fn(),
        test: vi.fn(() => Promise.resolve({ success: true, message: 'Test notification sent' })),
        testDraft: vi.fn(() => Promise.resolve({ success: true, message: 'Test notification sent' })),
      },
      eventsApi: {
        connectionState: 'idle',
        onStateChange: vi.fn(() => () => {}),
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Test Notification')).toBeInTheDocument();
    });

    // Find the checkbox for the first notification
    const checkboxes = screen.getAllByRole('checkbox');
    const firstCheckbox = checkboxes[0];

    // Click the checkbox to disable
    fireEvent.click(firstCheckbox);

    // Verify the API was called with the correct parameters
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(1, { enabled: false });
    });
  });

  it('shows error toast and rolls back cache when update fails', async () => {
    const mockUpdate = vi.fn(() => Promise.reject(new Error('Network error')));
    vi.mocked(getApiClients).mockReturnValue({
      notificationsApi: {
        list: vi.fn(() => Promise.resolve(mockNotifications)),
        create: vi.fn(),
        update: mockUpdate,
        remove: vi.fn(),
        test: vi.fn(() => Promise.resolve({ success: true, message: 'Test notification sent' })),
        testDraft: vi.fn(() => Promise.resolve({ success: true, message: 'Test notification sent' })),
      },
      eventsApi: {
        connectionState: 'idle',
        onStateChange: vi.fn(() => () => {}),
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Test Notification')).toBeInTheDocument();
    });

    // Find the checkbox for the first notification
    const checkboxes = screen.getAllByRole('checkbox');
    const firstCheckbox = checkboxes[0];

    // Click the checkbox to disable
    fireEvent.click(firstCheckbox);

    // Wait for the error toast to appear
    await waitFor(() => {
      expect(screen.getByText('Mutation failed')).toBeInTheDocument();
      expect(screen.getByText('Failed to update notification status')).toBeInTheDocument();
    });

    // Verify the API was called
    expect(mockUpdate).toHaveBeenCalledWith(1, { enabled: false });

    // Verify the checkbox state rolled back (still checked)
    await waitFor(() => {
      expect(firstCheckbox).toBeChecked();
    });
  });
});
