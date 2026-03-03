import { jsx as _jsx } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getApiClients } from '@/lib/api/client';
import EventsPage from './page';
vi.mock('@/lib/api/client', () => ({
    getApiClients: vi.fn(),
}));
const mockedGetApiClients = vi.mocked(getApiClients);
const getEventsMock = vi.fn();
const clearEventsMock = vi.fn();
const exportEventsMock = vi.fn();
function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                staleTime: 0,
            },
        },
    });
}
function renderPage(queryClient) {
    return render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(EventsPage, {}) }));
}
const mockEvents = [
    {
        id: 1,
        timestamp: '2026-02-15T10:00:00.000Z',
        level: 'info',
        type: 'system',
        message: 'Application started',
        source: 'Mediarr',
    },
    {
        id: 2,
        timestamp: '2026-02-15T10:05:00.000Z',
        level: 'warning',
        type: 'indexer',
        message: 'Indexer connection slow',
        source: 'NZBGeek',
        details: { responseTime: 5000 },
    },
    {
        id: 3,
        timestamp: '2026-02-15T10:10:00.000Z',
        level: 'error',
        type: 'download',
        message: 'Download failed: timeout',
        source: 'Transmission',
        details: { infoHash: 'abc123', error: 'Connection timeout' },
    },
    {
        id: 4,
        timestamp: '2026-02-15T10:15:00.000Z',
        level: 'fatal',
        type: 'system',
        message: 'Database connection lost',
        source: 'Mediarr',
    },
];
beforeEach(() => {
    vi.clearAllMocks();
    getEventsMock.mockResolvedValue({
        items: mockEvents,
        meta: { page: 1, pageSize: 25, totalCount: 4, totalPages: 1 },
    });
    clearEventsMock.mockResolvedValue({
        cleared: 4,
    });
    const mockBlob = new Blob(['id,timestamp,level,type,message\n1,2026-02-15T10:00:00.000Z,info,system,Application started'], {
        type: 'text/csv',
    });
    exportEventsMock.mockResolvedValue(mockBlob);
    mockedGetApiClients.mockReturnValue({
        systemApi: {
            getEvents: getEventsMock,
            clearEvents: clearEventsMock,
            exportEvents: exportEventsMock,
        },
    });
});
describe('EventsPage', () => {
    it('should render page header', async () => {
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await waitFor(() => {
            expect(screen.getByText('System Events')).toBeInTheDocument();
            expect(screen.getByText('Application event log and notifications timeline.')).toBeInTheDocument();
        });
    });
    it('should display events table', async () => {
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await waitFor(() => {
            expect(screen.getByText('Application started')).toBeInTheDocument();
            expect(screen.getByText('Indexer connection slow')).toBeInTheDocument();
            expect(screen.getByText('Download failed: timeout')).toBeInTheDocument();
            expect(screen.getByText('Database connection lost')).toBeInTheDocument();
        });
    });
    it('should render event columns correctly', async () => {
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await waitFor(() => {
            const headers = screen.getAllByRole('columnheader').map(node => node.textContent);
            expect(headers).toEqual(expect.arrayContaining(['Timestamp', 'Level', 'Type', 'Message', 'Source']));
        });
    });
    it('should display filter controls', async () => {
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await waitFor(() => {
            expect(screen.getByLabelText(/Level/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Type/i)).toBeInTheDocument();
        });
    });
    it('should filter events by level', async () => {
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await waitFor(() => {
            expect(screen.getByLabelText(/Level/i)).toBeInTheDocument();
        });
        const levelSelect = screen.getByLabelText(/Level/i);
        fireEvent.change(levelSelect, { target: { value: 'error' } });
        await waitFor(() => {
            expect(getEventsMock).toHaveBeenCalledWith(expect.objectContaining({
                level: 'error',
            }));
        });
    });
    it('should filter events by type', async () => {
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await waitFor(() => {
            expect(screen.getByLabelText(/Type/i)).toBeInTheDocument();
        });
        const typeSelect = screen.getByLabelText(/Type/i);
        fireEvent.change(typeSelect, { target: { value: 'indexer' } });
        await waitFor(() => {
            expect(getEventsMock).toHaveBeenCalledWith(expect.objectContaining({
                type: 'indexer',
            }));
        });
    });
    it('should have export functionality', async () => {
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await waitFor(() => {
            expect(screen.getByText(/Export/i)).toBeInTheDocument();
        });
    });
    it('should export events as CSV when CSV export button clicked', async () => {
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await waitFor(() => {
            expect(screen.getByText(/Export/i)).toBeInTheDocument();
        });
        const exportButton = screen.getByLabelText(/Export events/i);
        fireEvent.click(exportButton);
        await waitFor(() => {
            expect(exportEventsMock).toHaveBeenCalledWith(expect.objectContaining({
                format: 'csv',
            }));
        });
    });
    it('should have clear events functionality', async () => {
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await waitFor(() => {
            expect(screen.getByText(/Clear Events/i)).toBeInTheDocument();
        });
    });
    it('should clear events when clear button clicked', async () => {
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await waitFor(() => {
            expect(screen.getByText(/Clear Events/i)).toBeInTheDocument();
        });
        const clearButton = screen.getByText(/Clear Events/i);
        fireEvent.click(clearButton);
        await waitFor(() => {
            expect(clearEventsMock).toHaveBeenCalled();
        });
    });
    it('should show event details modal when event is clicked', async () => {
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await waitFor(() => {
            expect(screen.getByText('Application started')).toBeInTheDocument();
        });
        const eventRow = screen.getByText('Application started');
        fireEvent.click(eventRow);
        const dialog = await screen.findByRole('dialog', { name: 'Event Details' });
        expect(within(dialog).getByText('Application started')).toBeInTheDocument();
        expect(within(dialog).getByText('INFO')).toBeInTheDocument();
        expect(within(dialog).getByText('SYSTEM')).toBeInTheDocument();
    });
    it('should close event details modal when close button clicked', async () => {
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await waitFor(() => {
            expect(screen.getByText('Application started')).toBeInTheDocument();
        });
        const eventRow = screen.getByText('Application started');
        fireEvent.click(eventRow);
        await waitFor(() => {
            expect(screen.getByText('Event Details')).toBeInTheDocument();
        });
        const closeButton = screen.getByLabelText('Close event details');
        fireEvent.click(closeButton);
        await waitFor(() => {
            expect(screen.queryByText('Event Details')).not.toBeInTheDocument();
        });
    });
    it('should show loading state', async () => {
        getEventsMock.mockImplementation(() => new Promise(() => { }));
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        expect(screen.getByText(/Loading events.../i)).toBeInTheDocument();
    });
    it('should show error state on API failure', async () => {
        getEventsMock.mockRejectedValue(new Error('Failed to fetch events'));
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await waitFor(() => {
            expect(screen.getByText(/Failed to load events/i)).toBeInTheDocument();
        });
    });
    it('should show empty state when no events', async () => {
        getEventsMock.mockResolvedValue({
            items: [],
            meta: { page: 1, pageSize: 25, totalCount: 0, totalPages: 1 },
        });
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await waitFor(() => {
            expect(screen.getByText(/No events found/i)).toBeInTheDocument();
        });
    });
    it('should support pagination', async () => {
        getEventsMock.mockResolvedValue({
            items: mockEvents,
            meta: { page: 1, pageSize: 25, totalCount: 100, totalPages: 4 },
        });
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await waitFor(() => {
            expect(screen.getByText('Page 1 of 4')).toBeInTheDocument();
        });
    });
    it('should navigate to next page', async () => {
        getEventsMock.mockResolvedValue({
            items: mockEvents,
            meta: { page: 1, pageSize: 25, totalCount: 100, totalPages: 4 },
        });
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await waitFor(() => {
            expect(screen.getByText('Page 1 of 4')).toBeInTheDocument();
        });
        const nextButton = screen.getByLabelText('Next page');
        fireEvent.click(nextButton);
        await waitFor(() => {
            expect(getEventsMock).toHaveBeenCalledWith(expect.objectContaining({
                page: 2,
            }));
        });
    });
    it('should navigate to previous page', async () => {
        getEventsMock.mockResolvedValue({
            items: mockEvents,
            meta: { page: 2, pageSize: 25, totalCount: 100, totalPages: 4 },
        });
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await waitFor(() => {
            expect(screen.getByText('Page 2 of 4')).toBeInTheDocument();
        });
        const prevButton = screen.getByLabelText('Previous page');
        fireEvent.click(prevButton);
        await waitFor(() => {
            expect(getEventsMock).toHaveBeenCalledWith(expect.objectContaining({
                page: 1,
            }));
        });
    });
    it('should display event details when available', async () => {
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await waitFor(() => {
            expect(screen.getByText('Download failed: timeout')).toBeInTheDocument();
        });
        const eventRow = screen.getByText('Download failed: timeout');
        fireEvent.click(eventRow);
        await waitFor(() => {
            expect(screen.getByText('Event Details')).toBeInTheDocument();
            expect(screen.getByText(/"infoHash": "abc123"/)).toBeInTheDocument();
        });
    });
});
//# sourceMappingURL=page.test.js.map