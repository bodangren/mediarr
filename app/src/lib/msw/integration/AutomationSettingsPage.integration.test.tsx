import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '@/components/providers/AppProviders';
import { NAV_ITEMS } from '@/lib/navigation';
import { server } from '@/lib/msw/server';
import { AutomationSettingsPage } from '@/pages/settings/AutomationSettingsPage';

vi.mock('@/components/providers/ToastProvider', () => ({
  ToastProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useToast: () => ({ pushToast: vi.fn() }),
}));

import type { ReactNode } from 'react';

function renderAutomationRoute() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter initialEntries={['/settings/automation']}>
      <QueryClientProvider client={queryClient}>
        <AppProviders>
          <AutomationSettingsPage />
        </AppProviders>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const baseTasks = [
  {
    id: 'rss-sync',
    taskName: 'rss-sync',
    cronExpression: '*/15 * * * *',
    lastRunAt: '2026-06-18T12:00:00.000Z',
    lastDurationMs: 1234,
    nextRunAt: '2026-06-18T12:15:00.000Z',
  },
];

const emptyHistoryResponse = {
  ok: true,
  data: [],
  meta: { page: 1, pageSize: 25, totalCount: 0, totalPages: 0 },
};

describe('AutomationSettingsPage MSW integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads scheduled tasks through MSW interceptors and renders the table', async () => {
    server.use(
      http.get('/api/scheduler/tasks', () =>
        HttpResponse.json({ ok: true, data: baseTasks }),
      ),
      http.get('/api/scheduler/history', () => HttpResponse.json(emptyHistoryResponse)),
    );

    renderAutomationRoute();

    expect(await screen.findByText('rss-sync')).toBeInTheDocument();
  });

  it('simulates latency on PUT and verifies optimistic update + rollback on failure', async () => {
    server.use(
      http.get('/api/scheduler/tasks', () =>
        HttpResponse.json({ ok: true, data: baseTasks }),
      ),
      http.get('/api/scheduler/history', () => HttpResponse.json(emptyHistoryResponse)),
      http.put('/api/scheduler/:taskId/interval', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json(
          { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Simulated 500 from MSW', retryable: false } },
          { status: 500 },
        );
      }),
    );

    renderAutomationRoute();

    expect(await screen.findByText('*/15 * * * *')).toBeInTheDocument();

    const presetButton = screen.getByRole('button', { name: /^30m$/ });
    fireEvent.click(presetButton);

    await waitFor(() => {
      expect(screen.getByText('*/30 * * * *')).toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(screen.getByText('*/15 * * * *')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});

describe('Automation sidebar wiring', () => {
  it('exposes an Automation link under the Settings section in the sidebar nav config', () => {
    const settingsSection = NAV_ITEMS.find((section) => section.id === 'settings');
    expect(settingsSection, 'Settings sidebar section must exist').toBeDefined();
    const automationEntry = settingsSection!.items.find(
      (item) => item.path === '/settings/automation',
    );
    expect(
      automationEntry,
      'Automation link must be present in Settings sidebar nav',
    ).toBeDefined();
    expect(automationEntry!.label).toMatch(/automation/i);
  });

  it('renders an "Automation" link inside the Settings sidebar nav', async () => {
    server.use(
      http.get('/api/scheduler/tasks', () =>
        HttpResponse.json({ ok: true, data: baseTasks }),
      ),
      http.get('/api/scheduler/history', () => HttpResponse.json(emptyHistoryResponse)),
    );

    renderAutomationRoute();

    expect(
      await screen.findByRole('link', { name: /automation/i }),
    ).toBeInTheDocument();
  });
});