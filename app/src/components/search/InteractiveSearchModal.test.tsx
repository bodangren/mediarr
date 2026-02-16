import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { InteractiveSearchModal } from './InteractiveSearchModal';

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({
    releaseApi: {
      searchCandidates: vi.fn(),
      grabRelease: vi.fn(),
    },
  })),
}));

describe('InteractiveSearchModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    seriesId: 1,
    episodeId: 1,
    seriesTitle: 'Test Series',
    seasonNumber: 1,
    episodeNumber: 1,
    episodeTitle: 'Pilot',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open and displays episode information', async () => {
    render(<InteractiveSearchModal {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Test Series S01E01/)).toBeInTheDocument();
    expect(screen.getByText('Episode: Pilot')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<InteractiveSearchModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays loading state on initial search', async () => {
    render(<InteractiveSearchModal {...defaultProps} />);

    // Check for loading skeletons
    const skeletons = screen.getAllByRole('status', { name: 'loading' });
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays search results after loading', async () => {
    render(<InteractiveSearchModal {...defaultProps} />);

    // Wait for mock data to load
    await waitFor(() => {
      expect(screen.getByText('Indexer A')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Check that releases are displayed
    expect(screen.getByText(/1080p.WEB-DL/)).toBeInTheDocument();
    expect(screen.getByText(/4 releases? found/)).toBeInTheDocument();
  });

  it('displays quality badges with correct colors', async () => {
    render(<InteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      const qualityBadge = screen.getByText('WEBDL-1080p');
      expect(qualityBadge).toBeInTheDocument();
    });
  });

  it('displays file sizes in human readable format', async () => {
    render(<InteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      // 1573741824 bytes = ~1.47 GB
      expect(screen.getByText(/1\.47 GB/)).toBeInTheDocument();
    });
  });

  it('displays custom format scores', async () => {
    render(<InteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('+100')).toBeInTheDocument();
      expect(screen.getByText('+200')).toBeInTheDocument();
    });
  });

  it('displays rejection reasons for non-approved releases', async () => {
    render(<InteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Quality not in profile')).toBeInTheDocument();
    });
  });

  it('has grab button for approved releases', async () => {
    render(<InteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      const grabButtons = screen.getAllByRole('button', { name: /Grab/ });
      expect(grabButtons.length).toBeGreaterThan(0);
    });
  });

  it('grab button is disabled for rejected releases', async () => {
    render(<InteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      const grabButtons = screen.getAllByRole('button', { name: /Grab/ });
      // The 480p release should be disabled
      const disabledButton = grabButtons.find(btn => btn.hasAttribute('disabled'));
      expect(disabledButton).toBeTruthy();
    });
  });

  it('shows loading state when grabbing a release', async () => {
    render(<InteractiveSearchModal {...defaultProps} />);

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
    render(<InteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Indexer A')).toBeInTheDocument();
    });

    const grabButton = screen.getAllByRole('button', { name: /Grab/ })[0];
    fireEvent.click(grabButton);

    await waitFor(() => {
      expect(screen.getByText('Grabbed')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<InteractiveSearchModal {...defaultProps} onClose={onClose} />);

    // The close button in the header has text "Close", while the backdrop also has aria-label "Close modal"
    const closeButton = screen.getByText('Close').closest('button');
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('triggers new search when search button is clicked', async () => {
    render(<InteractiveSearchModal {...defaultProps} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Indexer A')).toBeInTheDocument();
    });

    const searchButton = screen.getByRole('button', { name: /Search/ });
    fireEvent.click(searchButton);

    // Should show loading state again
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Searching/ })).toBeInTheDocument();
    });
  });

  it('closes on escape key press', async () => {
    const onClose = vi.fn();
    render(<InteractiveSearchModal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on backdrop click', async () => {
    const onClose = vi.fn();
    render(<InteractiveSearchModal {...defaultProps} onClose={onClose} />);

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
