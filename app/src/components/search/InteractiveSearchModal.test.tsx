import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { InteractiveSearchModal } from './InteractiveSearchModal';
import { ToastProvider } from '@/components/providers/ToastProvider';

// The component calls seriesApi.searchReleases and releaseApi.grabCandidate.
// Use vi.hoisted so the references are available when vi.mock's factory is hoisted.
const { mockSearchReleases, mockGrabRelease, mockGrabCandidate } = vi.hoisted(() => ({
  mockSearchReleases: vi.fn(),
  mockGrabRelease: vi.fn(),
  mockGrabCandidate: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({
    seriesApi: {
      searchReleases: mockSearchReleases,
    },
    releaseApi: {
      grabRelease: mockGrabRelease,
      grabCandidate: mockGrabCandidate,
    },
  })),
}));

// ReleaseCandidate shape (as returned by seriesApi.searchReleases).
const mockReleaseCandidates = [
  {
    indexerId: 1,
    guid: 'guid-a',
    indexer: 'Indexer A',
    title: 'Series.Name.S01E01.1080p.WEB-DL.DDP5.1.H.264-GRP',
    size: 1573741824,
    seeders: 150,
    leechers: 0,
    indexerFlags: undefined,
    quality: 'WEBDL-1080p',
    age: 48,
    publishDate: new Date().toISOString(),
    protocol: 'torrent' as const,
    customFormatScore: 10,
    magnetUrl: 'magnet:?xt=urn:btih:guid-a',
  },
  {
    indexerId: 2,
    guid: 'guid-b',
    indexer: 'Indexer B',
    title: 'Series.Name.S01E01.720p.HDTV.x264-EVOLVE',
    size: 1073741824,
    seeders: 89,
    leechers: 5,
    indexerFlags: undefined,
    quality: 'HDTV-720p',
    age: 24,
    publishDate: new Date().toISOString(),
    protocol: 'torrent' as const,
    customFormatScore: 0,
    magnetUrl: 'magnet:?xt=urn:btih:guid-b',
  },
  {
    indexerId: 3,
    guid: 'guid-c',
    indexer: 'Indexer C',
    title: 'Series.Name.S01E01.2160p.UHD.BluRay.x265.10bit.HDR.DTS-HD.MA.5.1-DEFLATE',
    size: 15737418240,
    seeders: 45,
    leechers: 2,
    indexerFlags: undefined,
    quality: 'Bluray-2160p',
    age: 72,
    publishDate: new Date().toISOString(),
    protocol: 'torrent' as const,
    customFormatScore: 20,
    magnetUrl: 'magnet:?xt=urn:btih:guid-c',
  },
  {
    indexerId: 4,
    guid: 'guid-d',
    indexer: 'Indexer D',
    title: 'Series.Name.S01E01.480p.WEBrip.x264-BOOP',
    size: 367001600,
    seeders: 12,
    leechers: 1,
    indexerFlags: 'Quality not in profile',
    quality: 'WEBRip-480p',
    age: 6,
    publishDate: new Date().toISOString(),
    protocol: 'torrent' as const,
    customFormatScore: -10,
    magnetUrl: 'magnet:?xt=urn:btih:guid-d',
  },
];

const paginatedResponse = {
  items: mockReleaseCandidates,
  meta: { page: 1, pageSize: 20, totalCount: mockReleaseCandidates.length, totalPages: 1 },
};

function renderWithToast(ui: React.ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>);
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
    mockSearchReleases.mockResolvedValue(paginatedResponse);
    mockGrabRelease.mockResolvedValue({ success: true, downloadId: 'dl-1', message: 'Grabbed' });
    mockGrabCandidate.mockResolvedValue({ success: true, downloadId: 'dl-1', message: 'Grabbed' });
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders when open and displays episode information', () => {
    renderWithToast(<InteractiveSearchModal {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Test Series S01E01/)).toBeInTheDocument();
    expect(screen.getByText('Episode: Pilot')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithToast(<InteractiveSearchModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders season-level label when no episodeNumber provided', () => {
    renderWithToast(<InteractiveSearchModal {...defaultProps} episodeNumber={undefined} episodeId={null} />);

    expect(screen.getByText(/\(All Episodes\)/)).toBeInTheDocument();
  });

  // ── Search API wiring ─────────────────────────────────────────────────────

  it('calls seriesApi.searchReleases on initial open', async () => {
    renderWithToast(<InteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(mockSearchReleases).toHaveBeenCalledTimes(1);
      expect(mockSearchReleases).toHaveBeenCalledWith(1, expect.objectContaining({
        query: 'Test Series',
        seasonNumber: 1,
        episodeNumber: 1,
        episodeId: 1,
      }));
    });
  });

  it('does not include episodeId in search when episodeId is null (season-level)', async () => {
    renderWithToast(<InteractiveSearchModal {...defaultProps} episodeId={null} />);

    await waitFor(() => {
      expect(mockSearchReleases).toHaveBeenCalledWith(1, expect.not.objectContaining({
        episodeId: expect.anything(),
      }));
    });
  });

  it('displays search results after API returns data', async () => {
    renderWithToast(<InteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Indexer A')).toBeInTheDocument();
    });

    expect(screen.getByText(/1080p.WEB-DL/)).toBeInTheDocument();
    expect(screen.getByText(/4 releases? found/)).toBeInTheDocument();
  });

  it('renders quality badge from API response', async () => {
    renderWithToast(<InteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('WEBDL-1080p')).toBeInTheDocument();
    });
  });

  it('displays file sizes in human-readable format', async () => {
    renderWithToast(<InteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      // 1573741824 bytes ≈ 1.47 GB
      expect(screen.getByText(/1\.47 GB/)).toBeInTheDocument();
    });
  });

  it('displays rejection reasons for releases with indexerFlags', async () => {
    renderWithToast(<InteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Quality not in profile')).toBeInTheDocument();
    });
  });

  it('shows empty state when no releases are found', async () => {
    mockSearchReleases.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
    });

    renderWithToast(<InteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No releases found')).toBeInTheDocument();
    });
  });

  it('shows inline search error when searchReleases fails', async () => {
    mockSearchReleases.mockRejectedValue(new Error('Search backend unavailable'));

    renderWithToast(<InteractiveSearchModal {...defaultProps} />);

    // Error appears both inline and in the toast; getAllByText confirms presence.
    await waitFor(() => {
      expect(screen.getAllByText('Search backend unavailable').length).toBeGreaterThan(0);
    });
  });

  it('triggers a new search when the Search button is clicked', async () => {
    renderWithToast(<InteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Indexer A')).toBeInTheDocument();
    });

    mockSearchReleases.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /Search/ }));

    await waitFor(() => {
      expect(mockSearchReleases).toHaveBeenCalledTimes(1);
    });
  });

  // ── Grab wiring ───────────────────────────────────────────────────────────

  it('renders Grab buttons for approved releases', async () => {
    renderWithToast(<InteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      const grabButtons = screen.getAllByRole('button', { name: /Grab/ });
      expect(grabButtons.length).toBeGreaterThan(0);
    });
  });

  it('disables Grab button for releases with rejections', async () => {
    renderWithToast(<InteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      const grabButtons = screen.getAllByRole('button', { name: /Grab/ });
      const disabledButton = grabButtons.find(btn => btn.hasAttribute('disabled'));
      expect(disabledButton).toBeTruthy();
    });
  });

  it('calls releaseApi.grabCandidate with selected release details on grab click', async () => {
    renderWithToast(<InteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Indexer A')).toBeInTheDocument();
    });

    const [firstGrab] = screen.getAllByRole('button', { name: /Grab/ });
    fireEvent.click(firstGrab!);

    await waitFor(() => {
      expect(mockGrabCandidate).toHaveBeenCalledTimes(1);
      expect(mockGrabCandidate).toHaveBeenCalledWith(expect.objectContaining({
        guid: 'guid-a',
        indexerId: 1,
        title: 'Series.Name.S01E01.1080p.WEB-DL.DDP5.1.H.264-GRP',
        magnetUrl: 'magnet:?xt=urn:btih:guid-a',
      }));
    });
  });

  it('shows grabbing state while grab is in-flight', async () => {
    mockGrabCandidate.mockImplementation(() => new Promise(() => {})); // never resolve

    renderWithToast(<InteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Indexer A')).toBeInTheDocument();
    });

    const [firstGrab] = screen.getAllByRole('button', { name: /Grab/ });
    fireEvent.click(firstGrab!);

    await waitFor(() => {
      expect(screen.getByText('Grabbing...')).toBeInTheDocument();
    });
  });

  it('shows Grabbed success state after successful grab', async () => {
    renderWithToast(<InteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Indexer A')).toBeInTheDocument();
    });

    const [firstGrab] = screen.getAllByRole('button', { name: /Grab/ });
    fireEvent.click(firstGrab!);

    await waitFor(() => {
      expect(screen.getByText('Grabbed')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows inline grab error when grabCandidate fails', async () => {
    mockGrabCandidate.mockRejectedValue(new Error('Download client offline'));

    renderWithToast(<InteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Indexer A')).toBeInTheDocument();
    });

    const [firstGrab] = screen.getAllByRole('button', { name: /Grab/ });
    fireEvent.click(firstGrab!);

    // Error appears both as an inline row message and in the toast.
    await waitFor(() => {
      expect(screen.getAllByText('Download client offline').length).toBeGreaterThan(0);
    });
  });

  // ── Modal controls ────────────────────────────────────────────────────────

  it('calls onClose when the Close button is clicked', () => {
    const onClose = vi.fn();
    renderWithToast(<InteractiveSearchModal {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByText('Close').closest('button');
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape key press', () => {
    const onClose = vi.fn();
    renderWithToast(<InteractiveSearchModal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on backdrop click', () => {
    const onClose = vi.fn();
    renderWithToast(<InteractiveSearchModal {...defaultProps} onClose={onClose} />);

    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
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
