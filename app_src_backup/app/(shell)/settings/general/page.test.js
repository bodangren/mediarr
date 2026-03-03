import { jsx as _jsx } from "react/jsx-runtime";
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
    return render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(AppShell, { pathname: "/settings/general", children: _jsx(GeneralSettingsPage, {}) }) }));
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
        host: {
            port: 9696,
            bindAddress: '*',
            urlBase: '/mediarr',
            sslPort: 9697,
            enableSsl: false,
            sslCertPath: '',
            sslKeyPath: '',
        },
        security: {
            apiKey: 'api-key-123',
            authenticationMethod: 'form',
            authenticationRequired: true,
        },
        logging: {
            logLevel: 'info',
            logSizeLimit: 1048576,
            logRetentionDays: 30,
        },
        update: {
            branch: 'master',
            autoUpdateEnabled: false,
            mechanicsEnabled: false,
            updateScriptPath: '',
        },
    });
    updateSettingsMock.mockImplementation(async (payload) => payload);
    mockedGetApiClients.mockReturnValue({
        eventsApi: {
            connectionState: 'idle',
            onStateChange: vi.fn(() => () => undefined),
        },
        settingsApi: {
            get: getSettingsMock,
            update: updateSettingsMock,
        },
    });
});
describe('settings general page', () => {
    it('renders general settings sections including new host, security, logging, and update sections', async () => {
        renderPage();
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'General Settings' })).toBeInTheDocument();
        });
        // Existing torrent limits section
        expect(screen.getByLabelText('Max Active Downloads')).toHaveValue(4);
        expect(screen.getByLabelText('Max Active Seeds')).toHaveValue(8);
        expect(screen.getByLabelText('Global Download Limit (KB/s)')).toHaveValue(1000);
        expect(screen.getByLabelText('Global Upload Limit (KB/s)')).toHaveValue(500);
        // Scheduler section
        expect(screen.getByLabelText('RSS Sync (minutes)')).toHaveValue(20);
        expect(screen.getByLabelText('Availability Check (minutes)')).toHaveValue(45);
        expect(screen.getByLabelText('Torrent Monitor (seconds)')).toHaveValue(10);
        // API keys section
        expect(screen.getByLabelText('TMDB API Key')).toHaveValue('tmdb-token');
        expect(screen.getByLabelText('OpenSubtitles API Key')).toHaveValue('os-token');
        // New host configuration section
        expect(screen.getByRole('heading', { name: 'Host Configuration' })).toBeInTheDocument();
        expect(screen.getByLabelText('Port')).toHaveValue(9696);
        expect(screen.getByLabelText('Bind Address')).toHaveValue('*');
        expect(screen.getByLabelText('URL Base')).toHaveValue('/mediarr');
        expect(screen.getByLabelText('SSL Port')).toHaveValue(9697);
        expect(screen.getByLabelText('Enable SSL')).not.toBeChecked();
        // New security section
        expect(screen.getByRole('heading', { name: 'Security' })).toBeInTheDocument();
        expect(screen.getByLabelText('Authentication Required')).toBeChecked();
        expect(screen.getByLabelText('Authentication Method')).toHaveValue('form');
        expect(screen.getByLabelText('API Key')).toHaveValue('api-key-123');
        // New logging section
        expect(screen.getByRole('heading', { name: 'Logging' })).toBeInTheDocument();
        expect(screen.getByLabelText('Log Level')).toHaveValue('info');
        expect(screen.getByLabelText('Log Size Limit (MB)')).toHaveValue(1);
        expect(screen.getByLabelText('Retention (Days)')).toHaveValue(30);
        // New update section
        expect(screen.getByRole('heading', { name: 'Updates' })).toBeInTheDocument();
        expect(screen.getByLabelText('Enable Automatic Updates')).not.toBeChecked();
        expect(screen.getByLabelText('Enable Update Mechanics')).not.toBeChecked();
        expect(screen.getByLabelText('Update Branch')).toHaveValue('master');
    });
    it('submits updated settings payload including new fields', async () => {
        renderPage();
        await waitFor(() => {
            expect(screen.getByLabelText('Max Active Downloads')).toBeInTheDocument();
        });
        fireEvent.change(screen.getByLabelText('Max Active Downloads'), { target: { value: '6' } });
        fireEvent.change(screen.getByLabelText('TMDB API Key'), { target: { value: 'new-token' } });
        fireEvent.click(screen.getByLabelText('Show media path in tables'));
        // Host settings
        fireEvent.change(screen.getByLabelText('Port'), { target: { value: '8080' } });
        fireEvent.click(screen.getByLabelText('Enable SSL'));
        // Security settings
        fireEvent.change(screen.getByLabelText('Authentication Method'), { target: { value: 'none' } });
        fireEvent.click(screen.getByLabelText('Authentication Required'));
        // Logging settings
        fireEvent.change(screen.getByLabelText('Log Level'), { target: { value: 'debug' } });
        fireEvent.change(screen.getByLabelText('Log Size Limit (MB)'), { target: { value: '10' } });
        // Update settings
        fireEvent.click(screen.getByLabelText('Enable Automatic Updates'));
        fireEvent.change(screen.getByLabelText('Update Branch'), { target: { value: 'develop' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save General Settings' }));
        await waitFor(() => {
            expect(updateSettingsMock).toHaveBeenCalledWith(expect.objectContaining({
                torrentLimits: expect.objectContaining({ maxActiveDownloads: 6 }),
                pathVisibility: expect.objectContaining({ showMediaPath: true }),
                apiKeys: expect.objectContaining({ tmdbApiKey: 'new-token' }),
                host: expect.objectContaining({
                    port: 8080,
                    enableSsl: true,
                }),
                security: expect.objectContaining({
                    authenticationRequired: false,
                    authenticationMethod: 'none',
                }),
                logging: expect.objectContaining({
                    logLevel: 'debug',
                    logSizeLimit: 10485760,
                }),
                update: expect.objectContaining({
                    autoUpdateEnabled: true,
                    branch: 'develop',
                }),
            }));
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
            expect(updateSettingsMock).toHaveBeenCalledWith(expect.objectContaining({
                torrentLimits: expect.objectContaining({ maxActiveDownloads: 9 }),
            }));
        });
    });
});
//# sourceMappingURL=page.test.js.map