import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '@/components/shell/AppShell';
import NotificationsSettingsPage from './page';

// Mock the API clients
vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({
    notificationsApi: {
      list: vi.fn(() => Promise.resolve([])),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      test: vi.fn(() => Promise.resolve({ success: true, message: 'Test notification sent' })),
      testDraft: vi.fn(() => Promise.resolve({ success: true, message: 'Test notification sent' })),
    },
    eventsApi: {
      connectionState: 'connected',
      onStateChange: vi.fn(() => () => {}),
    },
  })),
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
      <AppShell pathname="/settings/connect">
        <NotificationsSettingsPage />
      </AppShell>
    </QueryClientProvider>,
  );
}

describe('notifications settings page', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('displays empty state when no notifications configured', async () => {
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText('No notification connections configured. Click Add Connection to create one.'),
      ).toBeInTheDocument();
    });
  });
});
