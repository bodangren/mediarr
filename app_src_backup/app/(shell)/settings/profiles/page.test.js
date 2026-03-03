import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/components/shell/AppShell';
import { getApiClients } from '@/lib/api/client';
import QualityProfilesPage from './page';
// Mock eventsApi
const mockEventsApi = {
    connectionState: 'disconnected',
    onStateChange: vi.fn(() => () => { }),
};
// Mock the API clients
vi.mock('@/lib/api/client', () => ({
    getApiClients: vi.fn(() => ({
        qualityProfileApi: {
            list: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        eventsApi: mockEventsApi,
    })),
}));
// Mock useToast
vi.mock('@/components/providers/ToastProvider', () => ({
    useToast: vi.fn(() => ({
        pushToast: vi.fn(),
    })),
}));
// Create a test QueryClient
const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
        mutations: {
            retry: false,
        },
    },
});
function renderPage() {
    const queryClient = createTestQueryClient();
    return render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(AppShell, { pathname: "/settings/profiles", children: _jsx(QualityProfilesPage, {}) }) }));
}
describe('quality profiles page', () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.clearAllMocks();
    });
    it('renders quality profiles page with header and add button', async () => {
        vi.mocked(getApiClients).mockReturnValue({
            qualityProfileApi: {
                list: vi.fn().mockResolvedValue([]),
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
            eventsApi: mockEventsApi,
        });
        renderPage();
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Quality Profiles' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Add New Profile' })).toBeInTheDocument();
            expect(screen.getByText('Manage quality profiles for controlling download quality preferences.')).toBeInTheDocument();
        });
    });
    it('shows empty state when no profiles exist', async () => {
        vi.mocked(getApiClients).mockReturnValue({
            qualityProfileApi: {
                list: vi.fn().mockResolvedValue([]),
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
            eventsApi: mockEventsApi,
        });
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('No quality profiles configured. Click "Add New Profile" to create one.')).toBeInTheDocument();
        });
    });
    it('displays list of quality profiles', async () => {
        vi.mocked(getApiClients).mockReturnValue({
            qualityProfileApi: {
                list: vi.fn().mockResolvedValue([
                    {
                        id: 1,
                        name: 'HD - 1080p/720p',
                        cutoffId: 0,
                        qualities: [
                            { id: 1, name: 'Bluray-1080p', resolution: '1080p', source: 'Bluray' },
                            { id: 2, name: 'Bluray-720p', resolution: '720p', source: 'Bluray' },
                        ],
                        languageProfileId: 1,
                    },
                    {
                        id: 2,
                        name: 'SD Only',
                        cutoffId: 0,
                        qualities: [
                            { id: 3, name: 'DVD-SD', resolution: 'SD', source: 'DVD' },
                        ],
                    },
                ]),
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
            eventsApi: mockEventsApi,
        });
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('HD - 1080p/720p')).toBeInTheDocument();
            expect(screen.getByText('SD Only')).toBeInTheDocument();
            expect(screen.getAllByRole('button', { name: 'Edit' }).length).toBe(2);
            expect(screen.getAllByRole('button', { name: 'Delete' }).length).toBe(2);
        });
    });
    it('opens add profile modal when Add New Profile is clicked', async () => {
        vi.mocked(getApiClients).mockReturnValue({
            qualityProfileApi: {
                list: vi.fn().mockResolvedValue([]),
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
            eventsApi: mockEventsApi,
        });
        renderPage();
        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Add New Profile' })).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole('button', { name: 'Add New Profile' }));
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Add Quality Profile' })).toBeInTheDocument();
            expect(screen.getByLabelText(/Profile Name/i)).toBeInTheDocument();
            expect(screen.getByText('Allowed Qualities')).toBeInTheDocument();
            expect(screen.getByText('Cutoff Quality')).toBeInTheDocument();
        });
    });
    it('opens edit profile modal when Edit is clicked', async () => {
        vi.mocked(getApiClients).mockReturnValue({
            qualityProfileApi: {
                list: vi.fn().mockResolvedValue([
                    {
                        id: 1,
                        name: 'HD - 1080p/720p',
                        cutoffId: 0,
                        qualities: [
                            { id: 1, name: 'Bluray-1080p', resolution: '1080p', source: 'Bluray' },
                            { id: 2, name: 'Bluray-720p', resolution: '720p', source: 'Bluray' },
                        ],
                    },
                ]),
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
            eventsApi: mockEventsApi,
        });
        renderPage();
        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
        });
        fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Edit Quality Profile' })).toBeInTheDocument();
            expect(screen.getByDisplayValue('HD - 1080p/720p')).toBeInTheDocument();
        });
    });
    it('shows custom format scores in edit profile modal', async () => {
        vi.mocked(getApiClients).mockReturnValue({
            qualityProfileApi: {
                list: vi.fn().mockResolvedValue([
                    {
                        id: 1,
                        name: 'HD - 1080p/720p',
                        cutoffId: 0,
                        qualities: [
                            { id: 1, name: 'Bluray-1080p', resolution: '1080p', source: 'Bluray' },
                            { id: 2, name: 'Bluray-720p', resolution: '720p', source: 'Bluray' },
                        ],
                    },
                ]),
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
            appProfilesApi: {
                list: vi.fn().mockResolvedValue([]),
                create: vi.fn(),
                update: vi.fn(),
                clone: vi.fn(),
                remove: vi.fn(),
            },
            customFormatApi: {
                list: vi.fn().mockResolvedValue([
                    {
                        id: 101,
                        name: 'HDR10',
                        includeCustomFormatWhenRenaming: false,
                        conditions: [],
                        scores: [{ id: 1, qualityProfileId: 1, score: 10 }],
                    },
                    {
                        id: 102,
                        name: 'Dolby Vision',
                        includeCustomFormatWhenRenaming: false,
                        conditions: [],
                        scores: [{ id: 2, qualityProfileId: 1, score: 5 }],
                    },
                ]),
            },
            eventsApi: mockEventsApi,
        });
        renderPage();
        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Edit Quality Profile' })).toBeInTheDocument();
            expect(screen.getByText('Custom Format Scores')).toBeInTheDocument();
            expect(screen.getByText('HDR10')).toBeInTheDocument();
            expect(screen.getByText('+10')).toBeInTheDocument();
            expect(screen.getByText('Dolby Vision')).toBeInTheDocument();
            expect(screen.getByText('+5')).toBeInTheDocument();
        });
    });
    it('opens delete confirmation modal when Delete is clicked', async () => {
        vi.mocked(getApiClients).mockReturnValue({
            qualityProfileApi: {
                list: vi.fn().mockResolvedValue([
                    {
                        id: 1,
                        name: 'Test Profile',
                        cutoffId: 0,
                        qualities: [
                            { id: 1, name: 'Bluray-1080p', resolution: '1080p', source: 'Bluray' },
                        ],
                    },
                ]),
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
            eventsApi: mockEventsApi,
        });
        renderPage();
        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
        });
        fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
        await waitFor(() => {
            const dialog = screen.getByRole('dialog', { name: 'Delete Quality Profile' });
            expect(dialog).toBeInTheDocument();
            expect(within(dialog).getByText(/Are you sure you want to delete the quality profile/)).toBeInTheDocument();
            expect(within(dialog).getByText('Test Profile')).toBeInTheDocument();
            expect(within(dialog).getByRole('button', { name: 'Delete Profile' })).toBeInTheDocument();
            expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        });
    });
    it('displays profile details correctly', async () => {
        vi.mocked(getApiClients).mockReturnValue({
            qualityProfileApi: {
                list: vi.fn().mockResolvedValue([
                    {
                        id: 1,
                        name: 'HD - 1080p/720p',
                        cutoffId: 0,
                        qualities: [
                            { id: 1, name: 'Bluray-1080p', resolution: '1080p', source: 'Bluray' },
                            { id: 2, name: 'Bluray-720p', resolution: '720p', source: 'Bluray' },
                            { id: 3, name: 'Web-DL-720p', resolution: '720p', source: 'Web-DL' },
                        ],
                        languageProfileId: 1,
                    },
                ]),
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
            eventsApi: mockEventsApi,
        });
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('HD - 1080p/720p')).toBeInTheDocument();
            expect(screen.getByText('Cutoff:')).toBeInTheDocument();
            expect(screen.getByText('Qualities:')).toBeInTheDocument();
            expect(screen.getByText('Language Profile:')).toBeInTheDocument();
            expect(screen.getByText('ID 1')).toBeInTheDocument();
        });
    });
    it('shows loading state', async () => {
        vi.mocked(getApiClients).mockReturnValue({
            qualityProfileApi: {
                list: vi.fn(() => new Promise(() => { })), // Never resolves
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
            eventsApi: mockEventsApi,
        });
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('Loading quality profiles...')).toBeInTheDocument();
        });
    });
    it('shows error state when API fails', async () => {
        vi.mocked(getApiClients).mockReturnValue({
            qualityProfileApi: {
                list: vi.fn().mockRejectedValue(new Error('API Error')),
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
            eventsApi: mockEventsApi,
        });
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('Failed to load quality profiles. Please try again later.')).toBeInTheDocument();
        });
    });
    it('closes add modal on cancel', async () => {
        vi.mocked(getApiClients).mockReturnValue({
            qualityProfileApi: {
                list: vi.fn().mockResolvedValue([]),
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
            eventsApi: mockEventsApi,
        });
        renderPage();
        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Add New Profile' })).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole('button', { name: 'Add New Profile' }));
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Add Quality Profile' })).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        await waitFor(() => {
            expect(screen.queryByRole('dialog', { name: 'Add Quality Profile' })).not.toBeInTheDocument();
        });
    });
    it('closes delete modal on cancel', async () => {
        vi.mocked(getApiClients).mockReturnValue({
            qualityProfileApi: {
                list: vi.fn().mockResolvedValue([
                    {
                        id: 1,
                        name: 'Test Profile',
                        cutoffId: 0,
                        qualities: [
                            { id: 1, name: 'Bluray-1080p', resolution: '1080p', source: 'Bluray' },
                        ],
                    },
                ]),
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
            eventsApi: mockEventsApi,
        });
        renderPage();
        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
        });
        fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Delete Quality Profile' })).toBeInTheDocument();
        });
        fireEvent.click(within(screen.getByRole('dialog', { name: 'Delete Quality Profile' })).getByRole('button', { name: 'Cancel' }));
        await waitFor(() => {
            expect(screen.queryByRole('dialog', { name: 'Delete Quality Profile' })).not.toBeInTheDocument();
        });
    });
});
//# sourceMappingURL=page.test.js.map