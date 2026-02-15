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
  notificationsApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: 'Discord Alerts',
        type: 'Discord',
        webhookUrl: 'https://discord.com/api/webhooks/test',
        triggers: ['OnGrab', 'OnDownload'],
        enabled: true,
      },
      {
        id: 2,
        name: 'Telegram Bot',
        type: 'Telegram',
        botToken: 'bot123:ABC',
        chatId: '123456789',
        triggers: ['OnHealthIssue'],
        enabled: false,
      },
      {
        id: 3,
        name: 'Email Notifications',
        type: 'Email',
        smtpServer: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: 'test@example.com',
        smtpPassword: 'password',
        fromAddress: 'noreply@example.com',
        toAddress: 'user@example.com',
        triggers: ['OnGrab', 'OnDownload', 'OnUpgrade'],
        enabled: true,
      },
      {
        id: 4,
        name: 'Custom Webhook',
        type: 'Webhook',
        webhookUrl: 'https://example.com/webhook',
        method: 'POST',
        triggers: ['OnDelete'],
        enabled: true,
      },
    ]),
    create: vi.fn().mockResolvedValue({
      id: 5,
      name: 'New Slack',
      type: 'Slack',
      webhookUrl: 'https://hooks.slack.com/services/test',
      triggers: ['OnGrab'],
      enabled: true,
    }),
    update: vi.fn().mockResolvedValue({
      id: 1,
      name: 'Updated Discord',
      type: 'Discord',
      webhookUrl: 'https://discord.com/api/webhooks/updated',
      triggers: ['OnGrab', 'OnDownload', 'OnUpgrade'],
      enabled: false,
    }),
    remove: vi.fn().mockResolvedValue({ id: 1 }),
    test: vi.fn().mockResolvedValue({
      success: true,
      message: 'Test notification sent successfully',
    }),
    testDraft: vi.fn().mockResolvedValue({
      success: true,
      message: 'Test notification sent successfully',
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

describe('Notifications Settings Page', () => {
  it('should render page header with title and description', () => {
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { level: 1, name: /Notification Providers/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Manage notification providers and trigger policies/i),
    ).toBeInTheDocument();
  });

  it('should render toolbar with action buttons', async () => {
    render(<Page />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
    });
  });

  it('should render notifications table with data', async () => {
    render(<Page />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Discord Alerts')).toBeInTheDocument();
      expect(screen.getByText('Telegram Bot')).toBeInTheDocument();
      expect(screen.getByText('Email Notifications')).toBeInTheDocument();
      expect(screen.getByText('Custom Webhook')).toBeInTheDocument();
      expect(screen.getByText('Discord')).toBeInTheDocument();
      expect(screen.getByText('Telegram')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Webhook')).toBeInTheDocument();
    });
  });

  it('should display triggers for each notification', async () => {
    render(<Page />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('OnGrab, OnDownload')).toBeInTheDocument();
      expect(screen.getByText('OnHealthIssue')).toBeInTheDocument();
      expect(screen.getByText('OnGrab, OnDownload, OnUpgrade')).toBeInTheDocument();
      expect(screen.getByText('OnDelete')).toBeInTheDocument();
    });
  });

  it('should open add modal when Add button is clicked', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    const addButton = await screen.findByRole('button', { name: /Add/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Add Notification/i })).toBeInTheDocument();
    });
  });

  it('should display notification type options in add modal', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    const addButton = await screen.findByRole('button', { name: /Add/i });
    await user.click(addButton);

    await waitFor(() => {
      const modal = screen.getByRole('dialog', { name: /Add Notification/i });
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText('Discord')).toBeInTheDocument();
      expect(within(modal).getByText('Telegram')).toBeInTheDocument();
      expect(within(modal).getByText('Email')).toBeInTheDocument();
      expect(within(modal).getByText('Webhook')).toBeInTheDocument();
    });
  });

  it('should open edit modal when Edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    const editButton = await screen.findAllByRole('button', { name: /Edit/i });
    await user.click(editButton[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Edit Notification/i })).toBeInTheDocument();
    });
  });

  it('should allow testing notification from the table', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    const testButton = await screen.findAllByRole('button', { name: /Test/i });
    await user.click(testButton[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Test Notification Result/i })).toBeInTheDocument();
    });
  });

  it('should render empty state when no notifications exist', async () => {
    mockGetApiClients.mockReturnValueOnce({
      notificationsApi: {
        list: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
        test: vi.fn(),
        testDraft: vi.fn(),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(<Page />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/No notifications configured/i)).toBeInTheDocument();
      expect(screen.getByText(/Create your first notification provider/i)).toBeInTheDocument();
    });
  });
});
