import { jsx as _jsx } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import IndexersPage from './page';
vi.mock('@/lib/api/client', () => ({
    getApiClients: vi.fn(),
}));
function buildIndexer(overrides) {
    return {
        id: 1,
        name: 'Indexer 1',
        implementation: 'Torznab',
        configContract: 'TorznabSettings',
        settings: '{"url":"https://indexer.test","apiKey":"abc"}',
        protocol: 'torrent',
        enabled: true,
        supportsRss: true,
        supportsSearch: true,
        priority: 25,
        health: { failureCount: 0, lastErrorMessage: null },
        ...overrides,
    };
}
function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                staleTime: 0,
            },
            mutations: {
                retry: false,
            },
        },
    });
}
function renderPage(queryClient) {
    return render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(ToastProvider, { children: _jsx(IndexersPage, {}) }) }));
}
const mockedGetApiClients = vi.mocked(getApiClients);
const listMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const removeMock = vi.fn();
const testMock = vi.fn();
const testDraftMock = vi.fn();
const cloneMock = vi.fn();
const listFiltersMock = vi.fn();
const createFilterMock = vi.fn();
const updateFilterMock = vi.fn();
const deleteFilterMock = vi.fn();
beforeEach(() => {
    vi.clearAllMocks();
    listMock.mockResolvedValue([]);
    createMock.mockResolvedValue(buildIndexer({ id: 11, name: 'Created Indexer' }));
    updateMock.mockImplementation((id, input) => {
        return Promise.resolve(buildIndexer({
            id,
            enabled: typeof input.enabled === 'boolean' ? input.enabled : true,
            priority: typeof input.priority === 'number' ? input.priority : 25,
        }));
    });
    removeMock.mockResolvedValue({ id: 1 });
    testMock.mockResolvedValue({
        success: true,
        message: 'Connectivity check succeeded.',
        diagnostics: { remediationHints: ['No remediation needed.'] },
        healthSnapshot: null,
    });
    testDraftMock.mockResolvedValue({
        success: true,
        message: 'Connectivity check succeeded.',
        diagnostics: { remediationHints: ['No remediation needed.'] },
        healthSnapshot: null,
    });
    cloneMock.mockImplementation((id) => {
        return Promise.resolve(buildIndexer({
            id: id + 1000,
            name: `Indexer ${id} (Copy)`,
        }));
    });
    listFiltersMock.mockResolvedValue([]);
    createFilterMock.mockResolvedValue({
        id: 9001,
        name: 'Saved Indexer Filter',
        type: 'indexer',
        conditions: {
            operator: 'and',
            conditions: [{ field: 'protocol', operator: 'equals', value: 'torrent' }],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
    updateFilterMock.mockResolvedValue({
        id: 9001,
        name: 'Saved Indexer Filter',
        type: 'indexer',
        conditions: {
            operator: 'and',
            conditions: [{ field: 'protocol', operator: 'equals', value: 'torrent' }],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
    deleteFilterMock.mockResolvedValue({ id: 9001, deleted: true });
    mockedGetApiClients.mockReturnValue({
        indexerApi: {
            list: listMock,
            create: createMock,
            update: updateMock,
            remove: removeMock,
            test: testMock,
            testDraft: testDraftMock,
            clone: cloneMock,
        },
        filtersApi: {
            list: listFiltersMock,
            create: createFilterMock,
            update: updateFilterMock,
            delete: deleteFilterMock,
        },
    });
});
describe('indexers page', () => {
    it('renders indexer table columns for the index view contract', async () => {
        listMock.mockResolvedValue([buildIndexer({ id: 31, name: 'Alpha Hub' })]);
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await screen.findByText('Alpha Hub');
        expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Protocol' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Capabilities' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Enabled' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Priority' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Health' })).toBeInTheDocument();
    });
    it('renders page toolbar actions and executes refresh/sync/select-mode controls', async () => {
        listMock.mockResolvedValue([buildIndexer({ id: 41, name: 'Toolbar Indexer' })]);
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await screen.findByText('Toolbar Indexer');
        const addButton = screen.getByRole('button', { name: 'Add' });
        const refreshButton = screen.getByRole('button', { name: 'Refresh' });
        const syncButton = screen.getByRole('button', { name: 'Sync' });
        const selectModeButton = screen.getByRole('button', { name: 'Select Mode' });
        expect(addButton).toBeInTheDocument();
        expect(refreshButton).toBeInTheDocument();
        expect(syncButton).toBeInTheDocument();
        expect(selectModeButton).toBeInTheDocument();
        fireEvent.click(refreshButton);
        fireEvent.click(syncButton);
        await waitFor(() => {
            expect(listMock.mock.calls.length).toBeGreaterThanOrEqual(3);
        });
        fireEvent.click(selectModeButton);
        expect(screen.getByText('Selection mode enabled')).toBeInTheDocument();
    });
    it('applies saved filters to the indexer list', async () => {
        listMock.mockResolvedValue([
            buildIndexer({ id: 151, name: 'Torrent One', protocol: 'torrent' }),
            buildIndexer({ id: 152, name: 'Usenet One', protocol: 'usenet' }),
        ]);
        listFiltersMock.mockResolvedValue([
            {
                id: 6001,
                name: 'Torrent only',
                type: 'indexer',
                conditions: {
                    operator: 'and',
                    conditions: [{ field: 'protocol', operator: 'equals', value: 'torrent' }],
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ]);
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await screen.findByText('Torrent One');
        expect(screen.getByText('Usenet One')).toBeInTheDocument();
        fireEvent.change(screen.getByRole('combobox', { name: 'Saved Filter' }), {
            target: { value: '6001' },
        });
        expect(screen.getByText('Torrent One')).toBeInTheDocument();
        expect(screen.queryByText('Usenet One')).not.toBeInTheDocument();
    });
    it('opens filter builder and saves an indexer filter', async () => {
        listMock.mockResolvedValue([buildIndexer({ id: 161, name: 'Filter Builder Target' })]);
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await screen.findByText('Filter Builder Target');
        fireEvent.click(screen.getByRole('button', { name: 'Build Filter' }));
        const modal = await screen.findByText('Custom Filter Builder');
        expect(modal).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Filter Name'), {
            target: { value: 'Torrent Enabled' },
        });
        fireEvent.change(screen.getByLabelText('Field 1'), { target: { value: 'protocol' } });
        fireEvent.change(screen.getByLabelText('Operator 1'), { target: { value: 'equals' } });
        fireEvent.change(screen.getByLabelText('Value 1'), { target: { value: 'torrent' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save Filter' }));
        await waitFor(() => {
            expect(createFilterMock).toHaveBeenCalledWith({
                name: 'Torrent Enabled',
                type: 'indexer',
                conditions: {
                    operator: 'and',
                    conditions: [{ field: 'protocol', operator: 'equals', value: 'torrent' }],
                },
            });
        });
    });
    it('filters visible rows by alphabet jump bar selection', async () => {
        listMock.mockResolvedValue([
            buildIndexer({ id: 51, name: 'Alpha Hub' }),
            buildIndexer({ id: 52, name: 'Beta Vault' }),
            buildIndexer({ id: 53, name: '1337 Mirror' }),
        ]);
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await screen.findByText('Alpha Hub');
        expect(screen.getByText('Beta Vault')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'B' }));
        expect(screen.queryByText('Alpha Hub')).not.toBeInTheDocument();
        expect(screen.getByText('Beta Vault')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '#' }));
        expect(screen.getByText('1337 Mirror')).toBeInTheDocument();
        expect(screen.queryByText('Beta Vault')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'All' }));
        expect(screen.getByText('Alpha Hub')).toBeInTheDocument();
        expect(screen.getByText('Beta Vault')).toBeInTheDocument();
    });
    it('opens edit modal with pre-populated values and supports cancel reset', async () => {
        listMock.mockResolvedValue([
            buildIndexer({
                id: 61,
                name: 'Editable Indexer',
                settings: JSON.stringify({ url: 'https://editable.example', apiKey: 'edit-key' }),
            }),
        ]);
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        const row = (await screen.findByText('Editable Indexer')).closest('tr');
        expect(row).not.toBeNull();
        fireEvent.click(within(row).getByRole('button', { name: 'Edit' }));
        const modal = screen.getByRole('dialog', { name: 'Edit indexer' });
        expect(within(modal).getByDisplayValue('Editable Indexer')).toBeInTheDocument();
        expect(within(modal).getByDisplayValue('https://editable.example')).toBeInTheDocument();
        fireEvent.click(within(modal).getByRole('button', { name: 'Cancel' }));
        expect(screen.queryByRole('dialog', { name: 'Edit indexer' })).not.toBeInTheDocument();
    });
    it('submits edited indexer payload through modal save action', async () => {
        listMock.mockResolvedValue([
            buildIndexer({
                id: 91,
                name: 'Updater Indexer',
                settings: JSON.stringify({ url: 'https://old.example', apiKey: 'old-key' }),
            }),
        ]);
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        const row = (await screen.findByText('Updater Indexer')).closest('tr');
        expect(row).not.toBeNull();
        fireEvent.click(within(row).getByRole('button', { name: 'Edit' }));
        const modal = await screen.findByRole('dialog', { name: 'Edit indexer' });
        fireEvent.change(within(modal).getByLabelText('Name'), { target: { value: 'Updater Indexer v2' } });
        fireEvent.change(within(modal).getByLabelText('Indexer URL'), { target: { value: 'https://new.example' } });
        fireEvent.click(within(modal).getByRole('button', { name: 'Save Indexer' }));
        await waitFor(() => {
            expect(updateMock).toHaveBeenCalledWith(91, expect.objectContaining({
                name: 'Updater Indexer v2',
                settings: JSON.stringify({
                    url: 'https://new.example',
                    apiKey: 'old-key',
                }),
            }));
        });
    });
    it('deletes an indexer row and shows deletion confirmation toast', async () => {
        listMock.mockResolvedValue([buildIndexer({ id: 71, name: 'Delete Me' })]);
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        const row = (await screen.findByText('Delete Me')).closest('tr');
        expect(row).not.toBeNull();
        fireEvent.click(within(row).getByRole('button', { name: 'Delete' }));
        await waitFor(() => {
            expect(removeMock).toHaveBeenCalledWith(71);
        });
        expect(await screen.findByText('Indexer deleted')).toBeInTheDocument();
    });
    it('clones an indexer row', async () => {
        listMock.mockResolvedValue([buildIndexer({ id: 111, name: 'Clone Source' })]);
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        const row = (await screen.findByText('Clone Source')).closest('tr');
        expect(row).not.toBeNull();
        fireEvent.click(within(row).getByRole('button', { name: 'Clone' }));
        await waitFor(() => {
            expect(cloneMock).toHaveBeenCalledWith(111);
        });
        expect(await screen.findByText('Indexer cloned')).toBeInTheDocument();
    });
    it('displays capability badges and opens indexer info modal', async () => {
        listMock.mockResolvedValue([
            buildIndexer({
                id: 211,
                name: 'Info Indexer',
                protocol: 'torrent',
                supportsRss: true,
                supportsSearch: false,
                settings: JSON.stringify({
                    url: 'https://info.example',
                    apiKey: 'abc123',
                    privacy: 'private',
                    categories: ['2000', '5000'],
                }),
                health: { failureCount: 2, lastErrorMessage: 'Timeout contacting endpoint' },
            }),
        ]);
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        const row = (await screen.findByText('Info Indexer')).closest('tr');
        expect(row).not.toBeNull();
        expect(within(row).getByText('RSS')).toBeInTheDocument();
        expect(within(row).getByText('Private')).toBeInTheDocument();
        expect(within(row).getByText('Torrent')).toBeInTheDocument();
        fireEvent.click(within(row).getByRole('button', { name: 'Info' }));
        const modal = await screen.findByRole('dialog', { name: 'Indexer information' });
        expect(within(modal).getByText('Info Indexer')).toBeInTheDocument();
        expect(within(modal).getByText('Protocol')).toBeInTheDocument();
        expect(within(modal).getByText('torrent')).toBeInTheDocument();
        expect(within(modal).getByText('Categories')).toBeInTheDocument();
        expect(within(modal).getByText('2000, 5000')).toBeInTheDocument();
        expect(within(modal).getByText('Health failures')).toBeInTheDocument();
        expect(within(modal).getByText('2')).toBeInTheDocument();
        expect(within(modal).getByText('Timeout contacting endpoint')).toBeInTheDocument();
    });
    it('surfaces save errors from create mutation failures', async () => {
        createMock.mockRejectedValueOnce(new Error('save exploded'));
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        fireEvent.click(screen.getByRole('button', { name: 'Add' }));
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Broken Indexer' } });
        fireEvent.change(screen.getByLabelText('Base URL'), { target: { value: 'https://broken.example' } });
        // First preset (IPTorrents) uses Cookie instead of API Key
        fireEvent.change(screen.getByLabelText('Cookie'), { target: { value: 'broken-cookie' } });
        fireEvent.click(screen.getByRole('button', { name: 'Add Indexer' }));
        expect(await screen.findByRole('status')).toHaveTextContent('Save failed');
        expect(await screen.findByRole('status')).toHaveTextContent('save exploded');
    });
    it('rolls back the enabled toggle when optimistic mutation fails', async () => {
        listMock.mockResolvedValue([
            buildIndexer({ id: 7, name: 'Fallback Indexer', enabled: true }),
        ]);
        let rejectUpdate;
        updateMock.mockImplementationOnce(() => {
            return new Promise((_resolve, reject) => {
                rejectUpdate = reject;
            });
        });
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        const rowLabel = await screen.findByText('Fallback Indexer');
        const row = rowLabel.closest('tr');
        expect(row).not.toBeNull();
        const enabledCheckbox = within(row).getByRole('checkbox');
        expect(enabledCheckbox).toBeChecked();
        fireEvent.click(enabledCheckbox);
        await waitFor(() => {
            expect(queryClient.getQueryData(queryKeys.indexers())?.[0]?.enabled).toBe(false);
        });
        rejectUpdate?.(new Error('timeout'));
        expect(await screen.findByText('Could not update indexer enabled state.')).toBeInTheDocument();
        await waitFor(() => {
            expect(queryClient.getQueryData(queryKeys.indexers())?.[0]?.enabled).toBe(true);
        });
        expect(within(row).getByRole('checkbox')).toBeChecked();
    });
    it('applies priority edits optimistically before the server responds', async () => {
        listMock.mockResolvedValue([
            buildIndexer({ id: 3, name: 'Speed Indexer', priority: 10 }),
        ]);
        let resolveUpdate;
        updateMock.mockImplementationOnce((id, input) => {
            return new Promise(resolve => {
                resolveUpdate = resolve;
            }).then(() => {
                return buildIndexer({
                    id,
                    name: 'Speed Indexer',
                    priority: typeof input.priority === 'number' ? input.priority : 10,
                });
            });
        });
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        const rowLabel = await screen.findByText('Speed Indexer');
        const row = rowLabel.closest('tr');
        expect(row).not.toBeNull();
        const priorityInput = within(row).getByDisplayValue('10');
        fireEvent.change(priorityInput, { target: { value: '42' } });
        fireEvent.blur(priorityInput);
        await waitFor(() => {
            expect(updateMock).toHaveBeenCalledWith(3, { priority: 42 });
            expect(queryClient.getQueryData(queryKeys.indexers())?.[0]?.priority).toBe(42);
        });
        resolveUpdate?.(buildIndexer({ id: 3, name: 'Speed Indexer', priority: 42 }));
    });
    it('renders test success/failure diagnostics and remediation hints', async () => {
        listMock.mockResolvedValue([
            buildIndexer({ id: 1, name: 'Healthy Indexer' }),
            buildIndexer({ id: 2, name: 'Flaky Indexer', health: { failureCount: 3, lastErrorMessage: 'HTTP timeout' } }),
        ]);
        testMock.mockImplementation((id) => {
            if (id === 1) {
                return Promise.resolve({
                    success: true,
                    message: 'Connectivity check succeeded.',
                    diagnostics: { remediationHints: ['No remediation needed.'] },
                    healthSnapshot: null,
                });
            }
            return Promise.resolve({
                success: false,
                message: 'HTTP timeout contacting indexer.',
                diagnostics: { remediationHints: ['Verify API key', 'Check firewall rules'] },
                healthSnapshot: { failureCount: 3, lastErrorMessage: 'HTTP timeout' },
            });
        });
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        const healthyRow = (await screen.findByText('Healthy Indexer')).closest('tr');
        const flakyRow = screen.getByText('Flaky Indexer').closest('tr');
        expect(healthyRow).not.toBeNull();
        expect(flakyRow).not.toBeNull();
        fireEvent.click(within(healthyRow).getByRole('button', { name: 'Test' }));
        fireEvent.click(within(flakyRow).getByRole('button', { name: 'Test' }));
        expect(await screen.findByText('Indexer test passed')).toBeInTheDocument();
        expect(await screen.findByText('Indexer test failed')).toBeInTheDocument();
        expect(await screen.findByText('Indexer #1: Connectivity check succeeded.')).toBeInTheDocument();
        expect(await screen.findByText('Indexer #2: HTTP timeout contacting indexer.')).toBeInTheDocument();
        expect(await screen.findByText('Verify API key')).toBeInTheDocument();
        expect(await screen.findByText('Check firewall rules')).toBeInTheDocument();
    });
    it('shows per-row health status badges from indexer health snapshots', async () => {
        listMock.mockResolvedValue([
            buildIndexer({ id: 11, name: 'Healthy', health: { failureCount: 0, lastErrorMessage: null } }),
            buildIndexer({ id: 12, name: 'Degraded', health: { failureCount: 1, lastErrorMessage: 'slow response' } }),
            buildIndexer({ id: 13, name: 'Broken', health: { failureCount: 4, lastErrorMessage: 'auth failed' } }),
        ]);
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        const healthyRow = (await screen.findByText('Healthy')).closest('tr');
        const degradedRow = screen.getByText('Degraded').closest('tr');
        const brokenRow = screen.getByText('Broken').closest('tr');
        expect(within(healthyRow).getByText('completed')).toBeInTheDocument();
        expect(within(degradedRow).getByText('warning')).toBeInTheDocument();
        expect(within(brokenRow).getByText('error')).toBeInTheDocument();
    });
    it('creates indexers from modal presets and runs draft connection tests', async () => {
        listMock.mockResolvedValue([buildIndexer({ id: 21, name: 'Any Indexer' })]);
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        await screen.findByText('Any Indexer');
        fireEvent.click(screen.getByRole('button', { name: 'Add' }));
        expect(screen.getByRole('dialog', { name: 'Add Indexer' })).toBeInTheDocument();
        // First preset (IPTorrents) uses Base URL
        expect(screen.getByLabelText('Base URL')).toBeInTheDocument();
        // Test Generic Torznab (still in presets)
        fireEvent.click(screen.getByRole('button', { name: /Generic Torznab/ }));
        expect(screen.getByLabelText('Indexer URL')).toBeInTheDocument();
        expect(screen.getByLabelText(/^API Key$/)).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Custom Torznab' } });
        fireEvent.change(screen.getByLabelText('Indexer URL'), { target: { value: 'https://custom.torznab' } });
        fireEvent.change(screen.getByLabelText(/^API Key$/), { target: { value: 'torznab-key' } });
        fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));
        await waitFor(() => {
            expect(testDraftMock).toHaveBeenCalledWith(expect.objectContaining({
                protocol: 'torrent',
                settings: JSON.stringify({ url: 'https://custom.torznab', apiKey: 'torznab-key' }),
            }));
        });
        fireEvent.click(screen.getByRole('button', { name: 'Add Indexer' }));
        await waitFor(() => {
            expect(createMock).toHaveBeenCalledTimes(1);
            expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
                protocol: 'torrent',
                settings: JSON.stringify({ url: 'https://custom.torznab', apiKey: 'torznab-key' }),
            }));
        });
    });
    it('confirms and deletes selected indexers in bulk mode', async () => {
        listMock.mockResolvedValue([
            buildIndexer({ id: 201, name: 'Bulk Alpha' }),
            buildIndexer({ id: 202, name: 'Bulk Beta' }),
            buildIndexer({ id: 203, name: 'Bulk Gamma' }),
        ]);
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        const alphaRow = (await screen.findByText('Bulk Alpha')).closest('tr');
        const betaRow = screen.getByText('Bulk Beta').closest('tr');
        expect(alphaRow).not.toBeNull();
        expect(betaRow).not.toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Select Mode' }));
        const alphaSelectableRow = screen.getByText('Bulk Alpha').closest('tr');
        const betaSelectableRow = screen.getByText('Bulk Beta').closest('tr');
        fireEvent.click(within(alphaSelectableRow).getByRole('checkbox', { name: 'Select row' }));
        fireEvent.click(within(betaSelectableRow).getByRole('checkbox', { name: 'Select row' }));
        fireEvent.click(screen.getByRole('button', { name: 'Delete Selected' }));
        const confirmModal = await screen.findByRole('dialog', { name: 'Delete selected indexers' });
        fireEvent.click(within(confirmModal).getByRole('button', { name: 'Delete 2 Indexers' }));
        await waitFor(() => {
            expect(removeMock).toHaveBeenCalledTimes(2);
            expect(removeMock).toHaveBeenCalledWith(201);
            expect(removeMock).toHaveBeenCalledWith(202);
        });
        expect(await screen.findByText('Deleted 2 indexers')).toBeInTheDocument();
    });
    it('runs bulk test operations for selected indexers', async () => {
        listMock.mockResolvedValue([
            buildIndexer({ id: 301, name: 'Test Alpha' }),
            buildIndexer({ id: 302, name: 'Test Beta' }),
        ]);
        testMock.mockImplementation((id) => {
            if (id === 301) {
                return Promise.resolve({
                    success: true,
                    message: 'Alpha healthy',
                    diagnostics: { remediationHints: ['No remediation needed.'] },
                    healthSnapshot: null,
                });
            }
            return Promise.resolve({
                success: false,
                message: 'Beta timeout',
                diagnostics: { remediationHints: ['Check DNS'] },
                healthSnapshot: { failureCount: 3, lastErrorMessage: 'timeout' },
            });
        });
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        const alphaRow = (await screen.findByText('Test Alpha')).closest('tr');
        const betaRow = screen.getByText('Test Beta').closest('tr');
        expect(alphaRow).not.toBeNull();
        expect(betaRow).not.toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Select Mode' }));
        const alphaSelectableRow = screen.getByText('Test Alpha').closest('tr');
        const betaSelectableRow = screen.getByText('Test Beta').closest('tr');
        fireEvent.click(within(alphaSelectableRow).getByRole('checkbox', { name: 'Select row' }));
        fireEvent.click(within(betaSelectableRow).getByRole('checkbox', { name: 'Select row' }));
        fireEvent.click(screen.getByRole('button', { name: 'Test Selected' }));
        await waitFor(() => {
            expect(testMock).toHaveBeenCalledTimes(2);
            expect(testMock).toHaveBeenCalledWith(301);
            expect(testMock).toHaveBeenCalledWith(302);
        });
        expect(await screen.findByText('Bulk indexer test complete')).toBeInTheDocument();
        expect(await screen.findByText('1 passed, 1 failed')).toBeInTheDocument();
    });
    it('opens bulk edit modal and applies updates to selected indexers', async () => {
        listMock.mockResolvedValue([
            buildIndexer({ id: 401, name: 'Edit Alpha', enabled: false, priority: 5 }),
            buildIndexer({ id: 402, name: 'Edit Beta', enabled: false, priority: 10 }),
        ]);
        const queryClient = createTestQueryClient();
        renderPage(queryClient);
        const alphaRow = (await screen.findByText('Edit Alpha')).closest('tr');
        const betaRow = screen.getByText('Edit Beta').closest('tr');
        expect(alphaRow).not.toBeNull();
        expect(betaRow).not.toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Select Mode' }));
        const alphaSelectableRow = screen.getByText('Edit Alpha').closest('tr');
        const betaSelectableRow = screen.getByText('Edit Beta').closest('tr');
        fireEvent.click(within(alphaSelectableRow).getByRole('checkbox', { name: 'Select row' }));
        fireEvent.click(within(betaSelectableRow).getByRole('checkbox', { name: 'Select row' }));
        fireEvent.click(screen.getByRole('button', { name: 'Bulk Edit' }));
        const modal = await screen.findByRole('dialog', { name: 'Bulk edit indexers' });
        fireEvent.click(within(modal).getByRole('checkbox', { name: 'Enable selected indexers' }));
        fireEvent.change(within(modal).getByLabelText('Priority'), { target: { value: '77' } });
        fireEvent.click(within(modal).getByRole('button', { name: 'Apply Changes' }));
        await waitFor(() => {
            expect(updateMock).toHaveBeenCalledWith(401, { enabled: true, priority: 77 });
            expect(updateMock).toHaveBeenCalledWith(402, { enabled: true, priority: 77 });
        });
        expect(await screen.findByText('Updated 2 indexers')).toBeInTheDocument();
    });
});
//# sourceMappingURL=page.test.js.map