import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '@/components/shell/AppShell';
import { getApiClients } from '@/lib/api/client';
import GeneralSettingsPage from './page';

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

const mockedGetApiClients = vi.mocked(getApiClients);
const getSettingsMock = vi.fn();
const updateSettingsMock = vi.fn();

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AppShell pathname="/settings/general">
        <GeneralSettingsPage />
      </AppShell>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();

  getSettingsMock.mockResolvedValue({
    torrentLimits: {
      maxActiveDownloads: 4,
      maxActiveSeeds: 8,
      globalDownloadLimitKbps: 1000,
      globalUploadLimitKbps: 500,
    },
    schedulerIntervals: {
      rssSyncMinutes: 20,
      availabilityCheckMinutes: 45,
      torrentMonitoringSeconds: 10,
    },
    pathVisibility: {
      showDownloadPath: true,
      showMediaPath: false,
    },
    apiKeys: {
      tmdbApiKey: 'tmdb-token',
      openSubtitlesApiKey: 'os-token',
    },
  });

  updateSettingsMock.mockImplementation(async payload => payload);

  mockedGetApiClients.mockReturnValue({
    eventsApi: {
      connectionState: 'idle',
      onStateChange: vi.fn(() => () => undefined),
    },
    settingsApi: {
      get: getSettingsMock,
      update: updateSettingsMock,
    },
  } as ReturnType<typeof getApiClients>);
});

describe('settings general page', () => {
  it('renders general settings sections and loads initial settings', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'General Settings' })).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Max Active Downloads')).toHaveValue(4);
    expect(screen.getByLabelText('Max Active Seeds')).toHaveValue(8);
    expect(screen.getByLabelText('RSS Sync (minutes)')).toHaveValue(20);
    expect(screen.getByLabelText('TMDB API Key')).toHaveValue('tmdb-token');
  });

  it('submits updated settings payload', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText('Max Active Downloads')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Max Active Downloads'), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('TMDB API Key'), { target: { value: 'new-token' } });
    fireEvent.click(screen.getByLabelText('Show media path in tables'));
    fireEvent.click(screen.getByRole('button', { name: 'Save General Settings' }));

    await waitFor(() => {
      expect(updateSettingsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          torrentLimits: expect.objectContaining({ maxActiveDownloads: 6 }),
          pathVisibility: expect.objectContaining({ showMediaPath: true }),
          apiKeys: expect.objectContaining({ tmdbApiKey: 'new-token' }),
        }),
      );
    });
  });

  it('submits settings with cmd/ctrl+s shortcut', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText('Max Active Downloads')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Max Active Downloads'), { target: { value: '9' } });
    fireEvent.keyDown(window, { key: 's', metaKey: true });

    await waitFor(() => {
      expect(updateSettingsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          torrentLimits: expect.objectContaining({ maxActiveDownloads: 9 }),
        }),
      );
    });
  });
});
