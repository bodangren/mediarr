import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MovieInteractiveSearchModal } from './MovieInteractiveSearchModal';
import { ToastProvider } from '@/components/providers/ToastProvider';

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

const mockReleaseCandidates = [
  {
    indexer: 'TestIndexer',
    indexerId: 1,
    guid: 'movie-guid-1',
    title: 'Test.Movie.2024.1080p.BluRay.x264',
    size: 2000000000,
    seeders: 100,
    leechers: 50,
    quality: 'Bluray-1080p',
    age: 24,
    publishDate: new Date().toISOString(),
    protocol: 'torrent',
  },
];

function renderWithToast(ui: React.ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('MovieInteractiveSearchModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    movieId: 123,
    movieTitle: 'Test Movie',
    movieYear: 2024,
    imdbId: 'tt1234567',
    tmdbId: 12345,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchCandidates.mockResolvedValue({
      items: mockReleaseCandidates,
      meta: {
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      },
    });
    mockGrabRelease.mockResolvedValue({
      success: true,
      downloadId: 'download-123',
      message: 'Release grabbed successfully',
    });
  });

  it('searches for releases when modal opens', async () => {
    renderWithToast(<MovieInteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(mockSearchCandidates).toHaveBeenCalledTimes(1);
      expect(mockSearchCandidates).toHaveBeenCalledWith({
        type: 'movie',
        title: 'Test Movie',
        imdbId: 'tt1234567',
        year: 2024,
      });
    });
  });

  it('grabs selected release using guid and indexerId', async () => {
    renderWithToast(<MovieInteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Test\.Movie\.2024\.1080p\.BluRay\.x264/)).toBeInTheDocument();
    });

    const grabButton = screen.getByRole('button', { name: /Grab/i });
    fireEvent.click(grabButton);

    await waitFor(() => {
      expect(mockGrabRelease).toHaveBeenCalledTimes(1);
      expect(mockGrabRelease).toHaveBeenCalledWith('movie-guid-1', 1);
    });
  });
});
