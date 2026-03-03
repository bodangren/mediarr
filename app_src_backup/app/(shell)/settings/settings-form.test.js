import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, waitFor } from '@testing-library/react';
import { SettingsForm } from './settings-form';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Mock API Client
vi.mock('@/lib/api/client', () => ({
    getApiClients: () => ({
        settingsApi: {
            get: vi.fn().mockResolvedValue({
                torrentLimits: { maxActiveDownloads: 3, maxActiveSeeds: 3 },
                schedulerIntervals: { rssSyncMinutes: 15, availabilityCheckMinutes: 30, torrentMonitoringSeconds: 5 },
                pathVisibility: { showDownloadPath: true, showMediaPath: true },
                apiKeys: { tmdbApiKey: 'test-key' }
            }),
            update: vi.fn().mockResolvedValue({})
        }
    })
}));
const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: { retry: false },
    },
});
describe('SettingsForm', () => {
    it('renders all settings sections', async () => {
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(SettingsForm, {}) }));
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /General/i })).toBeInTheDocument();
        });
        expect(screen.getByRole('heading', { name: /API Keys/i })).toBeInTheDocument();
    });
    it('renders API key input', async () => {
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(SettingsForm, {}) }));
        await waitFor(() => {
            expect(screen.getByLabelText(/TMDB API Key/i)).toBeInTheDocument();
        });
        // Check if value is populated
        expect(screen.getByLabelText(/TMDB API Key/i)).toHaveValue('test-key');
    });
});
//# sourceMappingURL=settings-form.test.js.map