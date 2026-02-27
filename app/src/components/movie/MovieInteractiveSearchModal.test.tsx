import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MovieInteractiveSearchModal } from './MovieInteractiveSearchModal';
import { ToastProvider } from '@/components/providers/ToastProvider';

// The component calls movieApi.searchReleases and releaseApi.grabRelease.
// Use vi.hoisted so the references are available when vi.mock's factory is hoisted.
const { mockSearchReleases, mockGrabRelease } = vi.hoisted(() => ({
  mockSearchReleases: vi.fn(),
  mockGrabRelease: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({
    movieApi: {
      searchReleases: mockSearchReleases,
    },
    releaseApi: {
      grabRelease: mockGrabRelease,
    },
  })),
}));

// ReleaseCandidate shape (as returned by movieApi.searchReleases).
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
    protocol: 'torrent' as const,
    customFormatScore: 15,
    indexerFlags: undefined,
  },
  {
    indexer: 'TestIndexer2',
    indexerId: 2,
    guid: 'movie-guid-2',
    title: 'Test.Movie.2024.720p.WEB-DL.x264',
    size: 800000000,
    seeders: 50,
    leechers: 10,
    quality: 'WEBDL-720p',
    age: 48,
    publishDate: new Date().toISOString(),
    protocol: 'torrent' as const,
    customFormatScore: 0,
    indexerFlags: 'Quality not in profile',
  },
];

const paginatedResponse = {
  items: mockReleaseCandidates,
  meta: { page: 1, pageSize: 20, totalCount: 2, totalPages: 1 },
};

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
    mockSearchReleases.mockResolvedValue(paginatedResponse);
    mockGrabRelease.mockResolvedValue({ success: true, downloadId: 'download-123', message: 'Grabbed' });
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders the modal when open', () => {
    renderWithToast(<MovieInteractiveSearchModal {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Interactive Search - Test Movie/)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithToast(<MovieInteractiveSearchModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // ── Search API wiring ─────────────────────────────────────────────────────

  it('calls movieApi.searchReleases when modal opens', async () => {
    renderWithToast(<MovieInteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(mockSearchReleases).toHaveBeenCalledTimes(1);
      expect(mockSearchReleases).toHaveBeenCalledWith(123, expect.objectContaining({
        title: 'Test Movie',
        imdbId: 'tt1234567',
        year: 2024,
      }));
    });
  });

  it('uses tmdbId when imdbId is not provided', async () => {
    const props = { ...defaultProps, imdbId: undefined };
    renderWithToast(<MovieInteractiveSearchModal {...props} />);

    await waitFor(() => {
      expect(mockSearchReleases).toHaveBeenCalledWith(123, expect.objectContaining({
        tmdbId: 12345,
      }));
    });
  });

  it('renders release results after API responds', async () => {
    renderWithToast(<MovieInteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Test\.Movie\.2024\.1080p\.BluRay\.x264/)).toBeInTheDocument();
    });

    // The indexer name appears both in the results table and in the filter dropdown <option>.
    expect(screen.getAllByText('TestIndexer').length).toBeGreaterThan(0);
  });

  it('shows empty state when no releases are returned', async () => {
    mockSearchReleases.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
    });

    renderWithToast(<MovieInteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No releases found')).toBeInTheDocument();
    });
  });

  it('shows inline error when searchReleases fails', async () => {
    mockSearchReleases.mockRejectedValue(new Error('Indexer timeout'));

    renderWithToast(<MovieInteractiveSearchModal {...defaultProps} />);

    // Error appears both inline and in the toast; getAllByText confirms presence.
    await waitFor(() => {
      expect(screen.getAllByText('Indexer timeout').length).toBeGreaterThan(0);
    });
  });

  it('re-runs search when the Search button is clicked', async () => {
    renderWithToast(<MovieInteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('TestIndexer')).toBeInTheDocument();
    });

    mockSearchReleases.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /Search/ }));

    await waitFor(() => {
      expect(mockSearchReleases).toHaveBeenCalledTimes(1);
    });
  });

  // ── Grab wiring ───────────────────────────────────────────────────────────

  it('calls releaseApi.grabRelease with correct guid and indexerId', async () => {
    renderWithToast(<MovieInteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Test\.Movie\.2024\.1080p\.BluRay\.x264/)).toBeInTheDocument();
    });

    const grabButton = screen.getAllByRole('button', { name: /Grab/i })[0];
    fireEvent.click(grabButton!);

    await waitFor(() => {
      expect(mockGrabRelease).toHaveBeenCalledTimes(1);
      expect(mockGrabRelease).toHaveBeenCalledWith('movie-guid-1', 1);
    });
  });

  it('shows grabbing spinner while grab is in-flight', async () => {
    mockGrabRelease.mockImplementation(() => new Promise(() => {}));

    renderWithToast(<MovieInteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Test\.Movie\.2024\.1080p\.BluRay\.x264/)).toBeInTheDocument();
    });

    const grabButton = screen.getAllByRole('button', { name: /Grab/i })[0];
    fireEvent.click(grabButton!);

    await waitFor(() => {
      expect(screen.getByText('Grabbing...')).toBeInTheDocument();
    });
  });

  it('shows Grabbed success state after successful grab', async () => {
    renderWithToast(<MovieInteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Test\.Movie\.2024\.1080p\.BluRay\.x264/)).toBeInTheDocument();
    });

    const grabButton = screen.getAllByRole('button', { name: /Grab/i })[0];
    fireEvent.click(grabButton!);

    await waitFor(() => {
      expect(screen.getByText('Grabbed')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows grab error when releaseApi.grabRelease fails', async () => {
    mockGrabRelease.mockRejectedValue(new Error('Download client unreachable'));

    renderWithToast(<MovieInteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Test\.Movie\.2024\.1080p\.BluRay\.x264/)).toBeInTheDocument();
    });

    const grabButton = screen.getAllByRole('button', { name: /Grab/i })[0];
    fireEvent.click(grabButton!);

    // Error appears both as an inline row message and in the toast.
    await waitFor(() => {
      expect(screen.getAllByText('Download client unreachable').length).toBeGreaterThan(0);
    });
  });

  it('shows rejection reason for releases with indexerFlags', async () => {
    renderWithToast(<MovieInteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Quality not in profile')).toBeInTheDocument();
    });
  });

  // ── Modal controls ────────────────────────────────────────────────────────

  it('calls onClose when the Close button is clicked', () => {
    const onClose = vi.fn();
    renderWithToast(<MovieInteractiveSearchModal {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByText('Close').closest('button');
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape key press', () => {
    const onClose = vi.fn();
    renderWithToast(<MovieInteractiveSearchModal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on backdrop click', () => {
    const onClose = vi.fn();
    renderWithToast(<MovieInteractiveSearchModal {...defaultProps} onClose={onClose} />);

    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
