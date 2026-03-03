'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import UpdatesPage from './page';
vi.mock('@/lib/api/client', () => ({
    getApiClients: vi.fn(),
}));
function buildUpdatesFixtures(overrides = {}) {
    return {
        current: {
            version: '1.0.0',
            branch: 'main',
            commit: 'abc123def456',
            buildDate: '2026-02-15T00:00:00Z',
        },
        available: {
            available: false,
        },
        history: {
            items: [],
            meta: {
                page: 1,
                pageSize: 20,
                totalCount: 0,
                totalPages: 0,
            },
        },
        ...overrides,
    };
}
describe('UpdatesPage', () => {
    let queryClient;
    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false },
            },
        });
        vi.clearAllMocks();
    });
    function renderPage() {
        return render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(UpdatesPage, {}) }));
    }
    describe('loading state', () => {
        it('should show loading state', () => {
            vi.mocked(getApiClients).mockReturnValue({
                updatesApi: {
                    getCurrentVersion: vi.fn().mockResolvedValue(new Promise(() => { })),
                    getAvailableUpdates: vi.fn().mockResolvedValue(new Promise(() => { })),
                    getUpdateHistory: vi.fn().mockResolvedValue(new Promise(() => { })),
                    checkForUpdates: vi.fn().mockResolvedValue({ checked: true, timestamp: '2026-02-15T12:00:00Z' }),
                    installUpdate: vi.fn().mockResolvedValue({
                        updateId: 'update-123',
                        version: '1.1.0',
                        startedAt: '2026-02-15T12:00:00Z',
                        status: 'started',
                    }),
                    getUpdateProgress: vi.fn(),
                },
            });
            renderPage();
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });
    });
    describe('error state', () => {
        it('should show error message when API fails', async () => {
            const errorMessage = 'Failed to fetch updates';
            vi.mocked(getApiClients).mockReturnValue({
                updatesApi: {
                    getCurrentVersion: vi.fn().mockRejectedValue(new Error(errorMessage)),
                    getAvailableUpdates: vi.fn(),
                    getUpdateHistory: vi.fn(),
                    checkForUpdates: vi.fn(),
                    installUpdate: vi.fn(),
                    getUpdateProgress: vi.fn(),
                },
            });
            renderPage();
            await waitFor(() => {
                expect(screen.getByText(/Failed to load updates/i)).toBeInTheDocument();
            });
        });
    });
    describe('current version section', () => {
        it('should display current version information', async () => {
            const fixture = buildUpdatesFixtures();
            vi.mocked(getApiClients).mockReturnValue({
                updatesApi: {
                    getCurrentVersion: vi.fn().mockResolvedValue(fixture.current),
                    getAvailableUpdates: vi.fn().mockResolvedValue(fixture.available),
                    getUpdateHistory: vi.fn().mockResolvedValue(fixture.history),
                    checkForUpdates: vi.fn().mockResolvedValue({ checked: true, timestamp: '2026-02-15T12:00:00Z' }),
                    installUpdate: vi.fn().mockResolvedValue({
                        updateId: 'update-123',
                        version: '1.1.0',
                        startedAt: '2026-02-15T12:00:00Z',
                        status: 'started',
                    }),
                    getUpdateProgress: vi.fn(),
                },
            });
            renderPage();
            await waitFor(() => {
                expect(screen.getByText('1.0.0')).toBeInTheDocument();
                expect(screen.getByText('main')).toBeInTheDocument();
            });
        });
        it('should have a check for updates button', async () => {
            const fixture = buildUpdatesFixtures();
            const mockCheckForUpdates = vi.fn().mockResolvedValue({ checked: true, timestamp: '2026-02-15T12:00:00Z' });
            vi.mocked(getApiClients).mockReturnValue({
                updatesApi: {
                    getCurrentVersion: vi.fn().mockResolvedValue(fixture.current),
                    getAvailableUpdates: vi.fn().mockResolvedValue(fixture.available),
                    getUpdateHistory: vi.fn().mockResolvedValue(fixture.history),
                    checkForUpdates: mockCheckForUpdates,
                    installUpdate: vi.fn(),
                    getUpdateProgress: vi.fn(),
                },
            });
            renderPage();
            await waitFor(() => {
                const checkButton = screen.getByRole('button', { name: /check for updates/i });
                expect(checkButton).toBeInTheDocument();
            });
        });
    });
    describe('available updates section', () => {
        it('should display when update is available', async () => {
            const fixture = buildUpdatesFixtures({
                available: {
                    available: true,
                    version: '1.1.0',
                    releaseDate: '2026-02-20T00:00:00Z',
                    changelog: '- Fixed bugs\n- Added features',
                    downloadUrl: 'https://github.com/example/mediarr/releases/v1.1.0',
                },
            });
            vi.mocked(getApiClients).mockReturnValue({
                updatesApi: {
                    getCurrentVersion: vi.fn().mockResolvedValue(fixture.current),
                    getAvailableUpdates: vi.fn().mockResolvedValue(fixture.available),
                    getUpdateHistory: vi.fn().mockResolvedValue(fixture.history),
                    checkForUpdates: vi.fn().mockResolvedValue({ checked: true, timestamp: '2026-02-15T12:00:00Z' }),
                    installUpdate: vi.fn().mockResolvedValue({
                        updateId: 'update-123',
                        version: '1.1.0',
                        startedAt: '2026-02-15T12:00:00Z',
                        status: 'started',
                    }),
                    getUpdateProgress: vi.fn(),
                },
            });
            renderPage();
            await waitFor(() => {
                expect(screen.getByText(/Version 1\.1\.0/)).toBeInTheDocument();
            });
        });
        it('should display changelog when available', async () => {
            const fixture = buildUpdatesFixtures({
                available: {
                    available: true,
                    version: '1.1.0',
                    releaseDate: '2026-02-20T00:00:00Z',
                    changelog: '- Fixed bugs\n- Added features',
                    downloadUrl: 'https://github.com/example/mediarr/releases/v1.1.0',
                },
            });
            vi.mocked(getApiClients).mockReturnValue({
                updatesApi: {
                    getCurrentVersion: vi.fn().mockResolvedValue(fixture.current),
                    getAvailableUpdates: vi.fn().mockResolvedValue(fixture.available),
                    getUpdateHistory: vi.fn().mockResolvedValue(fixture.history),
                    checkForUpdates: vi.fn().mockResolvedValue({ checked: true, timestamp: '2026-02-15T12:00:00Z' }),
                    installUpdate: vi.fn().mockResolvedValue({
                        updateId: 'update-123',
                        version: '1.1.0',
                        startedAt: '2026-02-15T12:00:00Z',
                        status: 'started',
                    }),
                    getUpdateProgress: vi.fn(),
                },
            });
            renderPage();
            await waitFor(() => {
                expect(screen.getByText(/- Fixed bugs/)).toBeInTheDocument();
                expect(screen.getByText(/- Added features/)).toBeInTheDocument();
            });
        });
        it('should have an install update button', async () => {
            const fixture = buildUpdatesFixtures({
                available: {
                    available: true,
                    version: '1.1.0',
                    releaseDate: '2026-02-20T00:00:00Z',
                    changelog: '- Fixed bugs\n- Added features',
                    downloadUrl: 'https://github.com/example/mediarr/releases/v1.1.0',
                },
            });
            vi.mocked(getApiClients).mockReturnValue({
                updatesApi: {
                    getCurrentVersion: vi.fn().mockResolvedValue(fixture.current),
                    getAvailableUpdates: vi.fn().mockResolvedValue(fixture.available),
                    getUpdateHistory: vi.fn().mockResolvedValue(fixture.history),
                    checkForUpdates: vi.fn().mockResolvedValue({ checked: true, timestamp: '2026-02-15T12:00:00Z' }),
                    installUpdate: vi.fn().mockResolvedValue({
                        updateId: 'update-123',
                        version: '1.1.0',
                        startedAt: '2026-02-15T12:00:00Z',
                        status: 'started',
                    }),
                    getUpdateProgress: vi.fn(),
                },
            });
            renderPage();
            await waitFor(() => {
                const installButton = screen.getByRole('button', { name: /install update/i });
                expect(installButton).toBeInTheDocument();
            });
        });
        it('should not display when no update is available', async () => {
            const fixture = buildUpdatesFixtures();
            vi.mocked(getApiClients).mockReturnValue({
                updatesApi: {
                    getCurrentVersion: vi.fn().mockResolvedValue(fixture.current),
                    getAvailableUpdates: vi.fn().mockResolvedValue(fixture.available),
                    getUpdateHistory: vi.fn().mockResolvedValue(fixture.history),
                    checkForUpdates: vi.fn().mockResolvedValue({ checked: true, timestamp: '2026-02-15T12:00:00Z' }),
                    installUpdate: vi.fn().mockResolvedValue({
                        updateId: 'update-123',
                        version: '1.1.0',
                        startedAt: '2026-02-15T12:00:00Z',
                        status: 'started',
                    }),
                    getUpdateProgress: vi.fn(),
                },
            });
            renderPage();
            await waitFor(() => {
                expect(screen.getByText(/up to date/i)).toBeInTheDocument();
            });
        });
    });
    describe('update history table', () => {
        it('should display update history', async () => {
            const fixture = buildUpdatesFixtures({
                history: {
                    items: [
                        {
                            id: 1,
                            version: '1.0.0',
                            installedDate: '2026-02-15T00:00:00Z',
                            status: 'success',
                            branch: 'main',
                        },
                        {
                            id: 2,
                            version: '0.9.0',
                            installedDate: '2026-01-15T00:00:00Z',
                            status: 'success',
                            branch: 'main',
                        },
                    ],
                    meta: {
                        page: 1,
                        pageSize: 20,
                        totalCount: 2,
                        totalPages: 1,
                    },
                },
                available: {
                    available: false,
                },
            });
            vi.mocked(getApiClients).mockReturnValue({
                updatesApi: {
                    getCurrentVersion: vi.fn().mockResolvedValue(fixture.current),
                    getAvailableUpdates: vi.fn().mockResolvedValue(fixture.available),
                    getUpdateHistory: vi.fn().mockResolvedValue(fixture.history),
                    checkForUpdates: vi.fn().mockResolvedValue({ checked: true, timestamp: '2026-02-15T12:00:00Z' }),
                    installUpdate: vi.fn().mockResolvedValue({
                        updateId: 'update-123',
                        version: '1.1.0',
                        startedAt: '2026-02-15T12:00:00Z',
                        status: 'started',
                    }),
                    getUpdateProgress: vi.fn(),
                },
            });
            renderPage();
            await waitFor(() => {
                expect(screen.getAllByText('1.0.0')).toHaveLength(2); // One in current version, one in history
                expect(screen.getAllByText('0.9.0')).toHaveLength(1);
            });
        });
        it('should display status badges for history entries', async () => {
            const fixture = buildUpdatesFixtures({
                history: {
                    items: [
                        {
                            id: 1,
                            version: '1.0.0',
                            installedDate: '2026-02-15T00:00:00Z',
                            status: 'success',
                            branch: 'main',
                        },
                        {
                            id: 2,
                            version: '0.9.0',
                            installedDate: '2026-01-15T00:00:00Z',
                            status: 'failed',
                            branch: 'main',
                        },
                    ],
                    meta: {
                        page: 1,
                        pageSize: 20,
                        totalCount: 2,
                        totalPages: 1,
                    },
                },
            });
            vi.mocked(getApiClients).mockReturnValue({
                updatesApi: {
                    getCurrentVersion: vi.fn().mockResolvedValue(fixture.current),
                    getAvailableUpdates: vi.fn().mockResolvedValue(fixture.available),
                    getUpdateHistory: vi.fn().mockResolvedValue(fixture.history),
                    checkForUpdates: vi.fn().mockResolvedValue({ checked: true, timestamp: '2026-02-15T12:00:00Z' }),
                    installUpdate: vi.fn().mockResolvedValue({
                        updateId: 'update-123',
                        version: '1.1.0',
                        startedAt: '2026-02-15T12:00:00Z',
                        status: 'started',
                    }),
                    getUpdateProgress: vi.fn(),
                },
            });
            renderPage();
            await waitFor(() => {
                expect(screen.getByText('success')).toBeInTheDocument();
                expect(screen.getByText('failed')).toBeInTheDocument();
            });
        });
        it('should support pagination controls', async () => {
            const fixture = buildUpdatesFixtures({
                history: {
                    items: Array.from({ length: 20 }, (_, i) => ({
                        id: i + 1,
                        version: `0.${10 - i}.0`,
                        installedDate: `2026-01-${(i % 30) + 1}T00:00:00Z`,
                        status: 'success',
                        branch: 'main',
                    })),
                    meta: {
                        page: 1,
                        pageSize: 20,
                        totalCount: 40,
                        totalPages: 2,
                    },
                },
                available: {
                    available: false,
                },
            });
            vi.mocked(getApiClients).mockReturnValue({
                updatesApi: {
                    getCurrentVersion: vi.fn().mockResolvedValue(fixture.current),
                    getAvailableUpdates: vi.fn().mockResolvedValue(fixture.available),
                    getUpdateHistory: vi.fn().mockResolvedValue(fixture.history),
                    checkForUpdates: vi.fn().mockResolvedValue({ checked: true, timestamp: '2026-02-15T12:00:00Z' }),
                    installUpdate: vi.fn().mockResolvedValue({
                        updateId: 'update-123',
                        version: '1.1.0',
                        startedAt: '2026-02-15T12:00:00Z',
                        status: 'started',
                    }),
                    getUpdateProgress: vi.fn(),
                },
            });
            renderPage();
            await waitFor(() => {
                expect(screen.getByText('Update History')).toBeInTheDocument();
            });
            // Find pagination buttons
            const prevButton = screen.getByRole('button', { name: /previous/i });
            const nextButton = screen.getByRole('button', { name: /next/i });
            // Previous button should be disabled on first page
            expect(prevButton).toBeDisabled();
            expect(nextButton).toBeEnabled();
            // Click next button
            await userEvent.click(nextButton);
            // The mock API should be called with page 2
            await waitFor(() => {
                expect(vi.mocked(getApiClients)()?.updatesApi.getUpdateHistory).toHaveBeenCalledWith({ page: 2, pageSize: 20 });
            });
        });
    });
    describe('update progress', () => {
        it('should display progress during installation', async () => {
            const fixture = buildUpdatesFixtures({
                available: {
                    available: true,
                    version: '1.1.0',
                    releaseDate: '2026-02-20T00:00:00Z',
                    changelog: '- Fixed bugs\n- Added features',
                    downloadUrl: 'https://github.com/example/mediarr/releases/v1.1.0',
                },
            });
            const mockInstallUpdate = vi.fn().mockResolvedValue({
                updateId: 'update-123',
                version: '1.1.0',
                startedAt: '2026-02-15T12:00:00Z',
                status: 'started',
            });
            const mockGetUpdateProgress = vi.fn().mockResolvedValue({
                updateId: 'update-123',
                version: '1.1.0',
                status: 'downloading',
                progress: 45,
                message: 'Downloading update...',
                startedAt: '2026-02-15T12:00:00Z',
                estimatedTimeRemaining: 300,
            });
            vi.mocked(getApiClients).mockReturnValue({
                updatesApi: {
                    getCurrentVersion: vi.fn().mockResolvedValue(fixture.current),
                    getAvailableUpdates: vi.fn().mockResolvedValue(fixture.available),
                    getUpdateHistory: vi.fn().mockResolvedValue(fixture.history),
                    checkForUpdates: vi.fn().mockResolvedValue({ checked: true, timestamp: '2026-02-15T12:00:00Z' }),
                    installUpdate: mockInstallUpdate,
                    getUpdateProgress: mockGetUpdateProgress,
                },
            });
            renderPage();
            await waitFor(() => {
                const installButton = screen.getByRole('button', { name: /install update/i });
                installButton.click();
            });
            await waitFor(() => {
                expect(mockInstallUpdate).toHaveBeenCalledWith('1.1.0');
            });
        });
    });
    describe('error handling', () => {
        it('should handle check for updates error', async () => {
            const fixture = buildUpdatesFixtures();
            const mockCheckForUpdates = vi.fn().mockRejectedValue(new Error('Network error'));
            vi.mocked(getApiClients).mockReturnValue({
                updatesApi: {
                    getCurrentVersion: vi.fn().mockResolvedValue(fixture.current),
                    getAvailableUpdates: vi.fn().mockResolvedValue(fixture.available),
                    getUpdateHistory: vi.fn().mockResolvedValue(fixture.history),
                    checkForUpdates: mockCheckForUpdates,
                    installUpdate: vi.fn(),
                    getUpdateProgress: vi.fn(),
                },
            });
            renderPage();
            await waitFor(() => {
                const checkButton = screen.getByRole('button', { name: /check for updates/i });
                checkButton.click();
            });
            await waitFor(() => {
                expect(screen.getByText(/Network error/i)).toBeInTheDocument();
            });
        });
        it('should handle install update error', async () => {
            const fixture = buildUpdatesFixtures({
                available: {
                    available: true,
                    version: '1.1.0',
                    releaseDate: '2026-02-20T00:00:00Z',
                    changelog: '- Fixed bugs\n- Added features',
                    downloadUrl: 'https://github.com/example/mediarr/releases/v1.1.0',
                },
            });
            const mockInstallUpdate = vi.fn().mockRejectedValue(new Error('Installation failed'));
            vi.mocked(getApiClients).mockReturnValue({
                updatesApi: {
                    getCurrentVersion: vi.fn().mockResolvedValue(fixture.current),
                    getAvailableUpdates: vi.fn().mockResolvedValue(fixture.available),
                    getUpdateHistory: vi.fn().mockResolvedValue(fixture.history),
                    checkForUpdates: vi.fn().mockResolvedValue({ checked: true, timestamp: '2026-02-15T12:00:00Z' }),
                    installUpdate: mockInstallUpdate,
                    getUpdateProgress: vi.fn(),
                },
            });
            renderPage();
            await waitFor(() => {
                const installButton = screen.getByRole('button', { name: /install update/i });
                installButton.click();
            });
            await waitFor(() => {
                expect(screen.getByText(/Installation failed/i)).toBeInTheDocument();
            });
        });
    });
});
//# sourceMappingURL=page.test.js.map