import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SeriesInteractiveSearchModal } from './SeriesInteractiveSearchModal';
import { ToastProvider } from '@/components/providers/ToastProvider';

const { mockSearchReleases, mockGrabRelease } = vi.hoisted(() => ({
  mockSearchReleases: vi.fn(),
  mockGrabRelease: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({
    seriesApi: {
      searchReleases: mockSearchReleases,
    },
    releaseApi: {
      grabRelease: mockGrabRelease,
    },
  })),
}));

const mockReleaseCandidates = [
  {
    indexer: 'TestIndexer',
    indexerId: 1,
    guid: 'series-guid-1',
    title: 'Test.Show.S01E01.1080p.BluRay.x264',
    size: 1500000000,
    seeders: 80,
    leechers: 20,
    quality: 'Bluray-1080p',
    age: 12,
    publishDate: new Date().toISOString(),
    protocol: 'torrent' as const,
    customFormatScore: 10,
    indexerFlags: undefined,
  },
  {
    indexer: 'TestIndexer2',
    indexerId: 2,
    guid: 'series-guid-2',
    title: 'Test.Show.S01E01.720p.WEB-DL.x264',
    size: 600000000,
    seeders: 30,
    leechers: 5,
    quality: 'WEBDL-720p',
    age: 36,
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

describe('SeriesInteractiveSearchModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    seriesId: 10,
    seriesTitle: 'Test Show',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchReleases.mockResolvedValue(paginatedResponse);
    mockGrabRelease.mockResolvedValue({ success: true, downloadId: 'dl-1', message: 'Grabbed' });
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders the modal when open', () => {
    renderWithToast(<SeriesInteractiveSearchModal {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Interactive Search - Test Show/)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithToast(<SeriesInteractiveSearchModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders search level selector with Series / Season / Episode options', () => {
    renderWithToast(<SeriesInteractiveSearchModal {...defaultProps} />);

    expect(screen.getByRole('combobox', { name: /level/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Series' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Season' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Episode' })).toBeInTheDocument();
  });

  it('hides season/episode selectors at Series level', () => {
    renderWithToast(<SeriesInteractiveSearchModal {...defaultProps} />);

    expect(screen.queryByLabelText(/season number/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/episode number/i)).not.toBeInTheDocument();
  });

  it('shows season selector (but not episode) at Season level', () => {
    renderWithToast(<SeriesInteractiveSearchModal {...defaultProps} />);

    const levelSelect = screen.getByRole('combobox', { name: /level/i });
    fireEvent.change(levelSelect, { target: { value: 'season' } });

    expect(screen.getByLabelText(/season number/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/episode number/i)).not.toBeInTheDocument();
  });

  it('shows both season and episode selectors at Episode level', () => {
    renderWithToast(<SeriesInteractiveSearchModal {...defaultProps} />);

    const levelSelect = screen.getByRole('combobox', { name: /level/i });
    fireEvent.change(levelSelect, { target: { value: 'episode' } });

    expect(screen.getByLabelText(/season number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/episode number/i)).toBeInTheDocument();
  });

  // ── Search API wiring ─────────────────────────────────────────────────────

  it('calls seriesApi.searchReleases on open at Series level (no season/episode)', async () => {
    renderWithToast(<SeriesInteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(mockSearchReleases).toHaveBeenCalledTimes(1);
      expect(mockSearchReleases).toHaveBeenCalledWith(10, expect.not.objectContaining({
        seasonNumber: expect.anything(),
      }));
    });
  });

  it('passes seasonNumber when searching at Season level', async () => {
    renderWithToast(<SeriesInteractiveSearchModal {...defaultProps} />);

    // Wait for the initial auto-search to complete so the button is enabled
    await waitFor(() => expect(screen.getByRole('button', { name: /^Search$/i })).not.toBeDisabled());

    const levelSelect = screen.getByRole('combobox', { name: /level/i });
    fireEvent.change(levelSelect, { target: { value: 'season' } });

    const seasonInput = screen.getByLabelText(/season number/i);
    fireEvent.change(seasonInput, { target: { value: '2' } });

    mockSearchReleases.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /^Search$/i }));

    await waitFor(() => {
      expect(mockSearchReleases).toHaveBeenCalledWith(10, expect.objectContaining({ seasonNumber: 2 }));
    });
  });

  it('passes seasonNumber and episodeNumber when searching at Episode level', async () => {
    renderWithToast(<SeriesInteractiveSearchModal {...defaultProps} />);

    // Wait for the initial auto-search to complete so the button is enabled
    await waitFor(() => expect(screen.getByRole('button', { name: /^Search$/i })).not.toBeDisabled());

    const levelSelect = screen.getByRole('combobox', { name: /level/i });
    fireEvent.change(levelSelect, { target: { value: 'episode' } });

    fireEvent.change(screen.getByLabelText(/season number/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/episode number/i), { target: { value: '5' } });

    mockSearchReleases.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /^Search$/i }));

    await waitFor(() => {
      expect(mockSearchReleases).toHaveBeenCalledWith(10, expect.objectContaining({
        seasonNumber: 3,
        episodeNumber: 5,
      }));
    });
  });

  it('renders release results after API responds', async () => {
    renderWithToast(<SeriesInteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Test\.Show\.S01E01\.1080p\.BluRay\.x264/)).toBeInTheDocument();
    });

    expect(screen.getAllByText('TestIndexer').length).toBeGreaterThan(0);
  });

  it('shows empty state when no releases are returned', async () => {
    mockSearchReleases.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
    });

    renderWithToast(<SeriesInteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No releases found')).toBeInTheDocument();
    });
  });

  it('shows inline error when searchReleases fails', async () => {
    mockSearchReleases.mockRejectedValue(new Error('Indexer timeout'));

    renderWithToast(<SeriesInteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getAllByText('Indexer timeout').length).toBeGreaterThan(0);
    });
  });

  it('re-runs search when the Search button is clicked', async () => {
    renderWithToast(<SeriesInteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('TestIndexer')).toBeInTheDocument();
    });

    mockSearchReleases.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));

    await waitFor(() => {
      expect(mockSearchReleases).toHaveBeenCalledTimes(1);
    });
  });

  // ── Grab wiring ───────────────────────────────────────────────────────────

  it('calls releaseApi.grabRelease with correct guid and indexerId', async () => {
    renderWithToast(<SeriesInteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Test\.Show\.S01E01\.1080p\.BluRay\.x264/)).toBeInTheDocument();
    });

    const grabButtons = screen.getAllByRole('button', { name: /Grab/i });
    fireEvent.click(grabButtons[0]!);

    await waitFor(() => {
      expect(mockGrabRelease).toHaveBeenCalledTimes(1);
      expect(mockGrabRelease).toHaveBeenCalledWith('series-guid-1', 1);
    });
  });

  it('shows grabbing spinner while grab is in-flight', async () => {
    mockGrabRelease.mockImplementation(() => new Promise(() => {}));

    renderWithToast(<SeriesInteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Test\.Show\.S01E01\.1080p\.BluRay\.x264/)).toBeInTheDocument();
    });

    const grabButtons = screen.getAllByRole('button', { name: /Grab/i });
    fireEvent.click(grabButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText('Grabbing...')).toBeInTheDocument();
    });
  });

  it('shows Grabbed success state after successful grab', async () => {
    renderWithToast(<SeriesInteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Test\.Show\.S01E01\.1080p\.BluRay\.x264/)).toBeInTheDocument();
    });

    const grabButtons = screen.getAllByRole('button', { name: /Grab/i });
    fireEvent.click(grabButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText('Grabbed')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows rejection reason for releases with indexerFlags', async () => {
    renderWithToast(<SeriesInteractiveSearchModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Quality not in profile')).toBeInTheDocument();
    });
  });

  // ── Modal controls ────────────────────────────────────────────────────────

  it('calls onClose when the Close button is clicked', () => {
    const onClose = vi.fn();
    renderWithToast(<SeriesInteractiveSearchModal {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByText('Close').closest('button');
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape key press', () => {
    const onClose = vi.fn();
    renderWithToast(<SeriesInteractiveSearchModal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on backdrop click', () => {
    const onClose = vi.fn();
    renderWithToast(<SeriesInteractiveSearchModal {...defaultProps} onClose={onClose} />);

    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── Pre-fill props ────────────────────────────────────────────────────────

  it('pre-fills season when initialSeason prop is provided', () => {
    renderWithToast(
      <SeriesInteractiveSearchModal {...defaultProps} initialLevel="season" initialSeason={4} />,
    );

    const seasonInput = screen.getByLabelText(/season number/i);
    expect((seasonInput as HTMLInputElement).value).toBe('4');
  });

  it('pre-fills season and episode when initialLevel is episode', () => {
    renderWithToast(
      <SeriesInteractiveSearchModal
        {...defaultProps}
        initialLevel="episode"
        initialSeason={2}
        initialEpisode={7}
      />,
    );

    expect((screen.getByLabelText(/season number/i) as HTMLInputElement).value).toBe('2');
    expect((screen.getByLabelText(/episode number/i) as HTMLInputElement).value).toBe('7');
  });
});
