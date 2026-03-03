import { jsx as _jsx } from "react/jsx-runtime";
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ManualSearchModal } from './ManualSearchModal';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
// Mock the API clients
const mockManualSearch = vi.fn().mockResolvedValue([
    {
        languageCode: 'en',
        isForced: false,
        isHi: false,
        provider: 'OpenSubtitles',
        score: 95,
        extension: 'srt',
    },
    {
        languageCode: 'es',
        isForced: true,
        isHi: true,
        provider: 'Subscene',
        score: 88,
        extension: 'ass',
    },
]);
const mockManualDownload = vi.fn().mockResolvedValue({
    storedPath: '/path/to/subtitle.srt',
});
vi.mock('@/lib/api/client', () => ({
    getApiClients: vi.fn(() => ({
        subtitleApi: {
            manualSearch: mockManualSearch,
            manualDownload: mockManualDownload,
        },
    })),
}));
function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
            mutations: {
                retry: false,
            },
        },
    });
    return function Wrapper({ children }) {
        return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(ToastProvider, { children: children }) }));
    };
}
describe('ManualSearchModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe('with movieId', () => {
        it('renders when open with movieId', () => {
            const wrapper = createWrapper();
            render(_jsx(ManualSearchModal, { isOpen: true, movieId: 123, onClose: vi.fn() }), { wrapper });
            expect(screen.getByText('Manual Subtitle Search')).toBeInTheDocument();
        });
        it('does not render when closed', () => {
            const wrapper = createWrapper();
            render(_jsx(ManualSearchModal, { isOpen: false, movieId: 123, onClose: vi.fn() }), { wrapper });
            expect(screen.queryByText('Manual Subtitle Search')).not.toBeInTheDocument();
        });
        it('calls manualSearch with movieId when opened', async () => {
            const wrapper = createWrapper();
            render(_jsx(ManualSearchModal, { isOpen: true, movieId: 123, onClose: vi.fn() }), { wrapper });
            await waitFor(() => {
                expect(mockManualSearch).toHaveBeenCalledWith({ movieId: 123 });
            });
        });
        it('calls manualDownload with movieId when download is clicked', async () => {
            const user = userEvent.setup();
            const onClose = vi.fn();
            const wrapper = createWrapper();
            render(_jsx(ManualSearchModal, { isOpen: true, movieId: 456, onClose: onClose }), { wrapper });
            await waitFor(() => {
                expect(screen.getAllByText('Download')).toHaveLength(2);
            });
            const downloadButtons = screen.getAllByText('Download');
            await user.click(downloadButtons[0]);
            await waitFor(() => {
                expect(mockManualDownload).toHaveBeenCalledWith({
                    movieId: 456,
                    candidate: expect.objectContaining({
                        languageCode: 'en',
                        provider: 'OpenSubtitles',
                    }),
                });
            });
            expect(onClose).toHaveBeenCalled();
        });
        it('renders subtitle candidates from search results', async () => {
            const wrapper = createWrapper();
            render(_jsx(ManualSearchModal, { isOpen: true, movieId: 789, onClose: vi.fn() }), { wrapper });
            await waitFor(() => {
                expect(screen.getByText('en')).toBeInTheDocument();
                expect(screen.getByText('es')).toBeInTheDocument();
            });
            expect(screen.getByText('OpenSubtitles')).toBeInTheDocument();
            expect(screen.getByText('Subscene')).toBeInTheDocument();
        });
        it('shows forced indicator for forced subtitles', async () => {
            const wrapper = createWrapper();
            render(_jsx(ManualSearchModal, { isOpen: true, movieId: 123, onClose: vi.fn() }), { wrapper });
            await waitFor(() => {
                expect(screen.getByText('(F)')).toBeInTheDocument();
            });
        });
        it('shows HI indicator for hearing impaired subtitles', async () => {
            const wrapper = createWrapper();
            render(_jsx(ManualSearchModal, { isOpen: true, movieId: 123, onClose: vi.fn() }), { wrapper });
            await waitFor(() => {
                expect(screen.getByText('(HI)')).toBeInTheDocument();
            });
        });
    });
    describe('with episodeId', () => {
        it('renders when open with episodeId', () => {
            const wrapper = createWrapper();
            render(_jsx(ManualSearchModal, { isOpen: true, episodeId: 456, onClose: vi.fn() }), { wrapper });
            expect(screen.getByText('Manual Subtitle Search')).toBeInTheDocument();
        });
        it('calls manualSearch with episodeId when opened', async () => {
            const wrapper = createWrapper();
            render(_jsx(ManualSearchModal, { isOpen: true, episodeId: 456, onClose: vi.fn() }), { wrapper });
            await waitFor(() => {
                expect(mockManualSearch).toHaveBeenCalledWith({ episodeId: 456 });
            });
        });
        it('calls manualDownload with episodeId when download is clicked', async () => {
            const user = userEvent.setup();
            const onClose = vi.fn();
            const wrapper = createWrapper();
            render(_jsx(ManualSearchModal, { isOpen: true, episodeId: 789, onClose: onClose }), { wrapper });
            await waitFor(() => {
                expect(screen.getAllByText('Download')).toHaveLength(2);
            });
            const downloadButtons = screen.getAllByText('Download');
            await user.click(downloadButtons[0]);
            await waitFor(() => {
                expect(mockManualDownload).toHaveBeenCalledWith({
                    episodeId: 789,
                    candidate: expect.objectContaining({
                        languageCode: 'en',
                        provider: 'OpenSubtitles',
                    }),
                });
            });
            expect(onClose).toHaveBeenCalled();
        });
    });
    describe('common behavior', () => {
        it('calls onClose when Close button is clicked', async () => {
            const user = userEvent.setup();
            const onClose = vi.fn();
            const wrapper = createWrapper();
            render(_jsx(ManualSearchModal, { isOpen: true, movieId: 123, onClose: onClose }), { wrapper });
            const closeButtons = screen.getAllByText('Close');
            await user.click(closeButtons[0]);
            expect(onClose).toHaveBeenCalled();
        });
        it('shows empty state when no results found', async () => {
            mockManualSearch.mockResolvedValueOnce([]);
            const wrapper = createWrapper();
            render(_jsx(ManualSearchModal, { isOpen: true, movieId: 123, onClose: vi.fn() }), { wrapper });
            await waitFor(() => {
                expect(screen.getByText('No subtitles found')).toBeInTheDocument();
                expect(screen.getByText('No subtitle candidates found. Try adjusting your provider settings.')).toBeInTheDocument();
            });
        });
        it('does not enable search when neither movieId nor episodeId is provided', () => {
            const wrapper = createWrapper();
            render(_jsx(ManualSearchModal, { isOpen: true, onClose: vi.fn() }), { wrapper });
            // Search should not be called
            expect(mockManualSearch).not.toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=ManualSearchModal.test.js.map