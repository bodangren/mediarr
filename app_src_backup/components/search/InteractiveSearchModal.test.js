import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { InteractiveSearchModal } from './InteractiveSearchModal';
import { ToastProvider } from '@/components/providers/ToastProvider';
// Mock the API client
const mockSearchCandidates = vi.fn();
const mockGrabRelease = vi.fn();
vi.mock('@/lib/api/client', () => ({
    getApiClients: vi.fn(() => ({
        releaseApi: {
            searchCandidates: mockSearchCandidates,
            grabRelease: mockGrabRelease,
        },
    })),
}));
// Mock API responses
const mockReleaseCandidates = [
    {
        indexerId: 1,
        guid: 'guid-a',
        indexer: 'Indexer A',
        title: 'Series.Name.S01E01.1080p.WEB-DL.DDP5.1.H.264-GRP',
        size: 1573741824,
        seeders: 150,
        indexerFlags: undefined,
        quality: 'WEBDL-1080p',
        age: 48,
    },
    {
        indexerId: 2,
        guid: 'guid-b',
        indexer: 'Indexer B',
        title: 'Series.Name.S01E01.720p.HDTV.x264-EVOLVE',
        size: 1073741824,
        seeders: 89,
        indexerFlags: undefined,
        quality: 'HDTV-720p',
        age: 24,
    },
    {
        indexerId: 3,
        guid: 'guid-c',
        indexer: 'Indexer C',
        title: 'Series.Name.S01E01.2160p.UHD.BluRay.x265.10bit.HDR.DTS-HD.MA.5.1-DEFLATE',
        size: 15737418240,
        seeders: 45,
        indexerFlags: undefined,
        quality: 'Bluray-2160p',
        age: 72,
    },
    {
        indexerId: 4,
        guid: 'guid-d',
        indexer: 'Indexer D',
        title: 'Series.Name.S01E01.480p.WEBrip.x264-BOOP',
        size: 367001600,
        seeders: 12,
        indexerFlags: 'Quality not in profile',
        quality: 'WEBRip-480p',
        age: 6,
    },
];
const mockGrabResult = {
    infoHash: 'abc123',
    name: 'Series.Name.S01E01.1080p.WEB-DL.DDP5.1.H.264-GRP',
};
function renderWithToast(ui) {
    return render(_jsx(ToastProvider, { children: ui }));
}
describe('InteractiveSearchModal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        seriesId: 1,
        episodeId: 1,
        tvdbId: 121361,
        seriesTitle: 'Test Series',
        seasonNumber: 1,
        episodeNumber: 1,
        episodeTitle: 'Pilot',
    };
    beforeEach(() => {
        vi.clearAllMocks();
        mockSearchCandidates.mockResolvedValue({
            items: mockReleaseCandidates,
            meta: {
                page: 1,
                pageSize: 20,
                totalCount: mockReleaseCandidates.length,
                totalPages: 1,
            },
        });
        mockGrabRelease.mockResolvedValue(mockGrabResult);
    });
    it('renders when open and displays episode information', async () => {
        renderWithToast(_jsx(InteractiveSearchModal, { ...defaultProps }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/Test Series S01E01/)).toBeInTheDocument();
        expect(screen.getByText('Episode: Pilot')).toBeInTheDocument();
    });
    it('does not render when closed', () => {
        renderWithToast(_jsx(InteractiveSearchModal, { ...defaultProps, isOpen: false }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    it('calls searchCandidates API on initial load', async () => {
        renderWithToast(_jsx(InteractiveSearchModal, { ...defaultProps }));
        await waitFor(() => {
            expect(mockSearchCandidates).toHaveBeenCalledTimes(1);
            expect(mockSearchCandidates).toHaveBeenCalledWith({
                type: 'tvsearch',
                tvdbId: 121361,
                season: 1,
                episode: 1,
            });
        });
    });
    it('displays loading state on initial search', async () => {
        mockSearchCandidates.mockImplementation(() => new Promise(() => { })); // Never resolve
        renderWithToast(_jsx(InteractiveSearchModal, { ...defaultProps }));
        // Check for loading skeletons
        const skeletons = screen.getAllByRole('status', { name: 'loading' });
        expect(skeletons.length).toBeGreaterThan(0);
    });
    it('displays search results after API returns data', async () => {
        renderWithToast(_jsx(InteractiveSearchModal, { ...defaultProps }));
        // Wait for mock data to load
        await waitFor(() => {
            expect(screen.getByText('Indexer A')).toBeInTheDocument();
        }, { timeout: 2000 });
        // Check that releases are displayed
        expect(screen.getByText(/1080p.WEB-DL/)).toBeInTheDocument();
        expect(screen.getByText(/4 releases? found/)).toBeInTheDocument();
    });
    it('displays quality badges with correct colors', async () => {
        renderWithToast(_jsx(InteractiveSearchModal, { ...defaultProps }));
        await waitFor(() => {
            const qualityBadge = screen.getByText('WEBDL-1080p');
            expect(qualityBadge).toBeInTheDocument();
        });
    });
    it('displays file sizes in human readable format', async () => {
        renderWithToast(_jsx(InteractiveSearchModal, { ...defaultProps }));
        await waitFor(() => {
            // 1573741824 bytes = ~1.47 GB
            expect(screen.getByText(/1\.47 GB/)).toBeInTheDocument();
        });
    });
    it('displays rejection reasons for non-approved releases', async () => {
        renderWithToast(_jsx(InteractiveSearchModal, { ...defaultProps }));
        await waitFor(() => {
            expect(screen.getByText('Quality not in profile')).toBeInTheDocument();
        });
    });
    it('has grab button for approved releases', async () => {
        renderWithToast(_jsx(InteractiveSearchModal, { ...defaultProps }));
        await waitFor(() => {
            const grabButtons = screen.getAllByRole('button', { name: /Grab/ });
            expect(grabButtons.length).toBeGreaterThan(0);
        });
    });
    it('grab button is disabled for rejected releases', async () => {
        renderWithToast(_jsx(InteractiveSearchModal, { ...defaultProps }));
        await waitFor(() => {
            const grabButtons = screen.getAllByRole('button', { name: /Grab/ });
            // The release with indexerFlags should be disabled
            const disabledButton = grabButtons.find(btn => btn.hasAttribute('disabled'));
            expect(disabledButton).toBeTruthy();
        });
    });
    it('calls grabRelease API when grab button is clicked', async () => {
        renderWithToast(_jsx(InteractiveSearchModal, { ...defaultProps }));
        await waitFor(() => {
            expect(screen.getByText('Indexer A')).toBeInTheDocument();
        });
        const grabButton = screen.getAllByRole('button', { name: /Grab/ })[0];
        fireEvent.click(grabButton);
        await waitFor(() => {
            expect(mockGrabRelease).toHaveBeenCalledTimes(1);
            expect(mockGrabRelease).toHaveBeenCalledWith('guid-a', 1);
        });
    });
    it('shows loading state when grabbing a release', async () => {
        mockGrabRelease.mockImplementation(() => new Promise(() => { })); // Never resolve
        renderWithToast(_jsx(InteractiveSearchModal, { ...defaultProps }));
        await waitFor(() => {
            expect(screen.getByText('Indexer A')).toBeInTheDocument();
        });
        const grabButton = screen.getAllByRole('button', { name: /Grab/ })[0];
        fireEvent.click(grabButton);
        await waitFor(() => {
            expect(screen.getByText('Grabbing...')).toBeInTheDocument();
        });
    });
    it('shows success state after successful grab', async () => {
        renderWithToast(_jsx(InteractiveSearchModal, { ...defaultProps }));
        await waitFor(() => {
            expect(screen.getByText('Indexer A')).toBeInTheDocument();
        });
        const grabButton = screen.getAllByRole('button', { name: /Grab/ })[0];
        fireEvent.click(grabButton);
        await waitFor(() => {
            expect(screen.getByText('Grabbed')).toBeInTheDocument();
        }, { timeout: 2000 });
    });
    it('displays error toast when search fails', async () => {
        mockSearchCandidates.mockRejectedValue(new Error('Search failed'));
        renderWithToast(_jsx(InteractiveSearchModal, { ...defaultProps }));
        await waitFor(() => {
            // Toast has a specific role="status" and specific classes
            const toast = screen.getByRole('status', { name: '' });
            expect(toast).toHaveTextContent('Search failed');
        });
    });
    it('displays error toast when grab fails', async () => {
        mockGrabRelease.mockRejectedValue(new Error('Grab failed'));
        renderWithToast(_jsx(InteractiveSearchModal, { ...defaultProps }));
        await waitFor(() => {
            expect(screen.getByText('Indexer A')).toBeInTheDocument();
        });
        const grabButton = screen.getAllByRole('button', { name: /Grab/ })[0];
        fireEvent.click(grabButton);
        await waitFor(() => {
            expect(screen.getByText('Failed to grab release')).toBeInTheDocument();
        });
    });
    it('calls onClose when close button is clicked', async () => {
        const onClose = vi.fn();
        renderWithToast(_jsx(InteractiveSearchModal, { ...defaultProps, onClose: onClose }));
        // The close button in the header has text "Close", while the backdrop also has aria-label "Close modal"
        const closeButton = screen.getByText('Close').closest('button');
        expect(closeButton).toBeTruthy();
        fireEvent.click(closeButton);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
    it('triggers new search when search button is clicked', async () => {
        renderWithToast(_jsx(InteractiveSearchModal, { ...defaultProps }));
        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByText('Indexer A')).toBeInTheDocument();
        });
        mockSearchCandidates.mockClear();
        const searchButton = screen.getByRole('button', { name: /Search/ });
        fireEvent.click(searchButton);
        // Should call search again
        await waitFor(() => {
            expect(mockSearchCandidates).toHaveBeenCalledTimes(1);
        });
    });
    it('closes on escape key press', async () => {
        const onClose = vi.fn();
        renderWithToast(_jsx(InteractiveSearchModal, { ...defaultProps, onClose: onClose }));
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });
    it('closes on backdrop click', async () => {
        const onClose = vi.fn();
        renderWithToast(_jsx(InteractiveSearchModal, { ...defaultProps, onClose: onClose }));
        const backdrop = screen.getByTestId('modal-backdrop');
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
    it('shows empty state when no releases are found', async () => {
        mockSearchCandidates.mockResolvedValue({
            items: [],
            meta: {
                page: 1,
                pageSize: 20,
                totalCount: 0,
                totalPages: 0,
            },
        });
        renderWithToast(_jsx(InteractiveSearchModal, { ...defaultProps }));
        await waitFor(() => {
            expect(screen.getByText('No releases found')).toBeInTheDocument();
        });
    });
});
describe('QualityBadge', () => {
    it('is exported from the module', async () => {
        const { QualityBadge } = await import('./QualityBadge');
        expect(QualityBadge).toBeDefined();
    });
});
describe('ReleaseTitle', () => {
    it('is exported from the module', async () => {
        const { ReleaseTitle } = await import('./ReleaseTitle');
        expect(ReleaseTitle).toBeDefined();
    });
});
describe('PeersCell', () => {
    it('is exported from the module', async () => {
        const { PeersCell } = await import('./PeersCell');
        expect(PeersCell).toBeDefined();
    });
});
describe('AgeCell', () => {
    it('is exported from the module', async () => {
        const { AgeCell } = await import('./AgeCell');
        expect(AgeCell).toBeDefined();
    });
});
//# sourceMappingURL=InteractiveSearchModal.test.js.map