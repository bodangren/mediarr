import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsNotificationsPage } from './SettingsNotificationsPage';

const pushToast = vi.hoisted(() => vi.fn());
const api = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  test: vi.fn(),
  testDraft: vi.fn(),
}));

vi.mock('@/components/providers/ToastProvider', () => ({
  ToastProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useToast: () => ({ pushToast }),
}));

vi.mock('@/lib/api/client', () => ({
  getApiClients: () => ({ notificationsApi: api }),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsNotificationsPage />
    </QueryClientProvider>,
  );
}

const notification = {
  id: 7,
  name: 'Household Webhook',
  type: 'Webhook' as const,
  enabled: true,
  triggers: ['OnGrab'] as const,
  webhookUrl: 'http://127.0.0.1:9876/notify',
  method: 'POST' as const,
};

describe('SettingsNotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.list.mockResolvedValue([notification]);
    api.update.mockResolvedValue(notification);
    api.remove.mockResolvedValue({ id: notification.id });
    api.test.mockResolvedValue({ success: true, message: 'Test notification sent successfully.' });
  });

  it('renders persisted notifications and all durable controls', async () => {
    renderPage();

    expect(await screen.findByText('Household Webhook')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Notification' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Household Webhook' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Test Household Webhook' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disable Household Webhook' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Household Webhook' })).toBeInTheDocument();
  });

  it('surfaces a list failure instead of rendering a false empty state', async () => {
    api.list.mockRejectedValue(new Error('Notification database unavailable'));
    renderPage();

    expect(await screen.findByText('Notification database unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No notification integrations configured.')).not.toBeInTheDocument();
  });

  it('persists enable changes, sends real tests, and deletes through an explicit confirmation', async () => {
    renderPage();
    await screen.findByText('Household Webhook');

    fireEvent.click(screen.getByRole('button', { name: 'Disable Household Webhook' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith(7, { enabled: false }));

    fireEvent.click(screen.getByRole('button', { name: 'Test Household Webhook' }));
    await waitFor(() => expect(api.test).toHaveBeenCalledWith(7));
    expect(pushToast).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Test notification sent successfully.',
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Delete Household Webhook' }));

    expect(await screen.findByRole('dialog', { name: 'Delete Notification' })).toBeInTheDocument();
    expect(api.remove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Notification' }));
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith(7));
  });
});
