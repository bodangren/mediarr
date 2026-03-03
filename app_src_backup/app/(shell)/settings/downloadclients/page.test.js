import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/components/shell/AppShell';
import SettingsDownloadClientsPage from './page';
// Mock the eventsApi mock
const mockEventsApi = {
    connectionState: 'disconnected',
    onStateChange: vi.fn(() => () => { }),
};
// Mock the API client
vi.mock('@/lib/api/client', () => ({
    getApiClients: vi.fn(() => ({
        httpClient: {},
        mediaApi: {},
        releaseApi: {},
        torrentApi: {},
        indexerApi: {},
        applicationsApi: {},
        downloadClientApi: {
            list: vi.fn(() => Promise.resolve([])),
            create: vi.fn(() => Promise.resolve({ id: 1, name: 'Test Client' })),
            update: vi.fn(() => Promise.resolve({})),
            remove: vi.fn(() => Promise.resolve({ id: 1 })),
            test: vi.fn(() => Promise.resolve({ success: true, message: 'Connection successful', diagnostics: { remediationHints: [] } })),
            testDraft: vi.fn(() => Promise.resolve({ success: true, message: 'Connection successful', diagnostics: { remediationHints: [] } })),
        },
        tagsApi: {},
        subtitleApi: {},
        activityApi: {},
        calendarApi: {},
        blocklistApi: {},
        settingsApi: {},
        healthApi: {},
        notificationsApi: {},
        systemApi: {},
        backupApi: {},
        logsApi: {},
        updatesApi: {},
        eventsApi: mockEventsApi,
    })),
}));
// Mock the ToastProvider
vi.mock('@/components/providers/ToastProvider', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        ToastProvider: ({ children }) => _jsx(_Fragment, { children: children }),
        useToast: () => ({
            pushToast: vi.fn(),
        }),
    };
});
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
// Mock the toast provider
vi.mock('@/components/providers/ToastProvider', () => ({
    useToast: vi.fn(() => ({
        pushToast: vi.fn(),
    })),
}));
function renderPage() {
    const queryClient = createTestQueryClient();
    return render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(AppShell, { pathname: "/settings/downloadclients", children: _jsx(SettingsDownloadClientsPage, {}) }) }));
}
describe('settings download clients page', () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.clearAllMocks();
    });
    it('renders download clients settings page with all sections', async () => {
        renderPage();
        expect(screen.getByRole('heading', { name: 'Download Clients' })).toBeInTheDocument();
        expect(screen.getByText('Manage your torrent and usenet download clients.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add Client' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    });
    it('opens add download client modal when Add Client is clicked', async () => {
        renderPage();
        fireEvent.click(screen.getByRole('button', { name: 'Add Client' }));
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Add download client' })).toBeInTheDocument();
            expect(screen.getByRole('heading', { name: 'Add Download Client' })).toBeInTheDocument();
        });
    });
    it('displays empty state when no download clients configured', async () => {
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('No download clients configured')).toBeInTheDocument();
            expect(screen.getByText('Add your first download client to begin downloading media.')).toBeInTheDocument();
        });
    });
    it('closes modal on cancel', async () => {
        renderPage();
        fireEvent.click(screen.getByRole('button', { name: 'Add Client' }));
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Add download client' })).toBeInTheDocument();
        });
        // Find the Cancel button in the modal footer (not the Close modal button)
        const modalElement = screen.getByRole('dialog', { name: 'Add download client' });
        const cancelButton = within(modalElement).getByRole('button', { name: 'Cancel' });
        fireEvent.click(cancelButton);
        await waitFor(() => {
            expect(screen.queryByRole('dialog', { name: 'Add download client' })).not.toBeInTheDocument();
        });
    });
    it('shows client type options in modal', async () => {
        renderPage();
        fireEvent.click(screen.getByRole('button', { name: 'Add Client' }));
        await waitFor(() => {
            expect(screen.getByText('Transmission')).toBeInTheDocument();
            expect(screen.getByText('qBittorrent')).toBeInTheDocument();
            expect(screen.getByText('Deluge')).toBeInTheDocument();
            expect(screen.getByText('rTorrent')).toBeInTheDocument();
            expect(screen.getByText('SABnzbd')).toBeInTheDocument();
            expect(screen.getByText('NZBGet')).toBeInTheDocument();
        });
    });
    it('shows all form fields in modal', async () => {
        renderPage();
        fireEvent.click(screen.getByRole('button', { name: 'Add Client' }));
        await waitFor(() => {
            expect(screen.getByText('Client Type')).toBeInTheDocument();
            expect(screen.getByText('Name')).toBeInTheDocument();
            expect(screen.getByText('Host')).toBeInTheDocument();
            expect(screen.getByText('Port')).toBeInTheDocument();
            expect(screen.getByText('Category (Optional)')).toBeInTheDocument();
            expect(screen.getByText('Priority')).toBeInTheDocument();
            expect(screen.getByText('Enabled')).toBeInTheDocument();
        });
    });
    it('shows authentication fields for clients that require auth', async () => {
        renderPage();
        fireEvent.click(screen.getByRole('button', { name: 'Add Client' }));
        await waitFor(() => {
            expect(screen.getByText('Transmission')).toBeInTheDocument();
        });
        // Click on Transmission (requires auth)
        const transmissionButton = screen.getByText('Transmission').closest('button');
        if (transmissionButton) {
            fireEvent.click(transmissionButton);
        }
        await waitFor(() => {
            expect(screen.getByText('Username')).toBeInTheDocument();
            expect(screen.getByText('Password')).toBeInTheDocument();
        });
    });
    it('shows Test Connection and Add Client buttons in modal footer', async () => {
        renderPage();
        fireEvent.click(screen.getByRole('button', { name: 'Add Client' }));
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Add download client' })).toBeInTheDocument();
        });
        // Find the modal and get buttons from within it
        const modalElement = screen.getByRole('dialog', { name: 'Add download client' });
        const withinModal = within(modalElement);
        expect(withinModal.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        expect(withinModal.getByRole('button', { name: 'Test Connection' })).toBeInTheDocument();
        expect(withinModal.getByRole('button', { name: 'Add Client' })).toBeInTheDocument();
    });
});
it('does not show authentication fields for clients that do not require auth', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Add Client' }));
    await waitFor(() => {
        expect(screen.getByText('Deluge')).toBeInTheDocument();
    });
    // Click on Deluge (does not require auth)
    const delugeButton = screen.getByText('Deluge').closest('button');
    if (delugeButton) {
        fireEvent.click(delugeButton);
    }
    await waitFor(() => {
        expect(screen.queryByText('Username')).not.toBeInTheDocument();
        expect(screen.queryByText('Password')).not.toBeInTheDocument();
    });
});
it('updates port when client type changes', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Add Client' }));
    await waitFor(() => {
        expect(screen.getByRole('dialog', { name: 'Add download client' })).toBeInTheDocument();
    });
    // Default port for Transmission should be 9091
    const portInput = screen.getByLabelText('Port');
    expect(portInput).toHaveValue(9091);
    // Click on qBittorrent (port 8080)
    const qbittorrentButton = screen.getByText('qBittorrent').closest('button');
    if (qbittorrentButton) {
        fireEvent.click(qbittorrentButton);
    }
    await waitFor(() => {
        expect(portInput).toHaveValue(8080);
    });
});
//# sourceMappingURL=page.test.js.map