import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ImportWizard } from './ImportWizard';

const mockScan = vi.fn();
const mockSearch = vi.fn();
const mockExecute = vi.fn();

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({
    importApi: {
      scan: mockScan,
      search: mockSearch,
      execute: mockExecute,
    },
    filesystemApi: {
      list: vi.fn().mockResolvedValue({ path: '/', entries: [], writable: true }),
    },
  })),
}));

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  mediaType: 'movie' as const,
};

describe('ImportWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<ImportWizard {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders folder selection step when open', () => {
    render(<ImportWizard {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Import Existing Movies')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('/path/to/media')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /scan folder/i })).toBeInTheDocument();
  });

  it('disables Scan button when no path is entered', () => {
    render(<ImportWizard {...defaultProps} />);
    expect(screen.getByRole('button', { name: /scan folder/i })).toBeDisabled();
  });

  it('enables Scan button when a path is entered', () => {
    render(<ImportWizard {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('/path/to/media'), {
      target: { value: '/media/movies' },
    });
    expect(screen.getByRole('button', { name: /scan folder/i })).toBeEnabled();
  });

  it('shows scanning state after clicking Scan Folder', async () => {
    mockScan.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ImportWizard {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('/path/to/media'), {
      target: { value: '/media/movies' },
    });
    fireEvent.click(screen.getByRole('button', { name: /scan folder/i }));
    await waitFor(() => {
      expect(screen.getByText(/scanning folder/i)).toBeInTheDocument();
    });
  });

  it('shows review step after scan returns results', async () => {
    mockScan.mockResolvedValue({
      rootPath: '/media/movies',
      folders: [
        {
          path: '/media/movies/The Matrix (1999)',
          type: 'movie',
          files: [{ path: '/media/movies/The Matrix (1999)/movie.mkv', size: 1000, extension: 'mkv' }],
          matchCandidates: [
            { id: 603, title: 'The Matrix', year: 1999, confidence: 0.95, matchSource: 'search' },
          ],
          selectedMatchId: 603,
        },
      ],
      totalFiles: 1,
      scanDurationMs: 200,
    });

    render(<ImportWizard {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('/path/to/media'), {
      target: { value: '/media/movies' },
    });
    fireEvent.click(screen.getByRole('button', { name: /scan folder/i }));

    await waitFor(() => {
      expect(screen.getByText(/found 1 movie folder/i)).toBeInTheDocument();
    });
    expect(screen.getByText('The Matrix (1999)')).toBeInTheDocument();
  });

  it('shows error when scan fails', async () => {
    mockScan.mockRejectedValue(new Error('Network error'));
    render(<ImportWizard {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('/path/to/media'), {
      target: { value: '/media/movies' },
    });
    fireEvent.click(screen.getByRole('button', { name: /scan folder/i }));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('uses series label for series mediaType', () => {
    render(<ImportWizard {...defaultProps} mediaType="series" />);
    expect(screen.getByText('Import Existing Series')).toBeInTheDocument();
    expect(screen.getByText(/tv series/i)).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<ImportWizard {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
