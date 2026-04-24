import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FilesystemBrowser } from './FilesystemBrowser';
import { ToastProvider } from '@/components/providers/ToastProvider';

const { mockFilesystemList } = vi.hoisted(() => ({
  mockFilesystemList: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({
    filesystemApi: {
      list: mockFilesystemList,
    },
  })),
}));

const rootResponse = {
  path: '/',
  entries: [
    { name: 'home', path: '/home', isDirectory: true, readable: true, writable: true },
    { name: 'tmp', path: '/tmp', isDirectory: true, readable: true, writable: true },
    { name: 'etc', path: '/etc', isDirectory: true, readable: true, writable: false },
  ],
};

const homeResponse = {
  path: '/home',
  entries: [
    { name: 'user', path: '/home/user', isDirectory: true, readable: true, writable: true },
  ],
};

function renderWithToast(ui: React.ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('FilesystemBrowser', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelect: vi.fn(),
    initialPath: '/',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFilesystemList.mockResolvedValue(rootResponse);
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders the modal when open', () => {
    renderWithToast(<FilesystemBrowser {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithToast(<FilesystemBrowser {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows directory entries after load', async () => {
    await act(async () => {
      renderWithToast(<FilesystemBrowser {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('home')).toBeInTheDocument();
      expect(screen.getByText('tmp')).toBeInTheDocument();
      expect(screen.getByText('etc')).toBeInTheDocument();
    });
  });

  it('shows breadcrumb for root path', async () => {
    await act(async () => {
      renderWithToast(<FilesystemBrowser {...defaultProps} />);
    });

    await waitFor(() => expect(screen.getByText('home')).toBeInTheDocument());
    // Root breadcrumb should be present
    expect(screen.getByRole('button', { name: /root|^\/$/ })).toBeInTheDocument();
  });

  // ── Navigation ────────────────────────────────────────────────────────────

  it('navigates into a directory on click', async () => {
    mockFilesystemList
      .mockResolvedValueOnce(rootResponse)
      .mockResolvedValueOnce(homeResponse);

    await act(async () => {
      renderWithToast(<FilesystemBrowser {...defaultProps} />);
    });

    await waitFor(() => expect(screen.getByText('home')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('home'));
    });

    await waitFor(() => {
      expect(mockFilesystemList).toHaveBeenCalledWith('/home');
      expect(screen.getByText('user')).toBeInTheDocument();
    });
  });

  it('updates breadcrumb when navigating deeper', async () => {
    mockFilesystemList
      .mockResolvedValueOnce(rootResponse)
      .mockResolvedValueOnce(homeResponse);

    await act(async () => {
      renderWithToast(<FilesystemBrowser {...defaultProps} />);
    });

    await waitFor(() => expect(screen.getByText('home')).toBeInTheDocument());
    
    await act(async () => {
      fireEvent.click(screen.getByText('home'));
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'home' })).toBeInTheDocument();
    });
  });

  it('navigates back via breadcrumb click', async () => {
    mockFilesystemList
      .mockResolvedValueOnce(rootResponse)
      .mockResolvedValueOnce(homeResponse)
      .mockResolvedValueOnce(rootResponse);

    await act(async () => {
      renderWithToast(<FilesystemBrowser {...defaultProps} />);
    });

    await waitFor(() => expect(screen.getByText('home')).toBeInTheDocument());

    // Navigate into /home
    await act(async () => {
      fireEvent.click(screen.getByText('home'));
    });

    await waitFor(() => {
      expect(screen.getByText('user')).toBeInTheDocument();
    });

    // Click root breadcrumb to navigate back
    const rootCrumb = screen.getByRole('button', { name: /root|^\/$/ });
    
    await act(async () => {
      fireEvent.click(rootCrumb);
    });

    await waitFor(() => {
      expect(mockFilesystemList).toHaveBeenLastCalledWith('/');
      expect(screen.getByText('home')).toBeInTheDocument();
    });
  });

  // ── Selection ─────────────────────────────────────────────────────────────

  it('calls onSelect with exact path when Select button is clicked', async () => {
    const onSelect = vi.fn();
    mockFilesystemList.mockResolvedValue(homeResponse);

    await act(async () => {
      renderWithToast(<FilesystemBrowser {...defaultProps} onSelect={onSelect} initialPath="/home" />);
    });

    await waitFor(() => expect(screen.getByText('user')).toBeInTheDocument());

    // Click Select button
    const selectButton = screen.getByRole('button', { name: /select/i });
    
    await act(async () => {
      fireEvent.click(selectButton);
    });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('/home');
  });

  it('calls onSelect with updated path after navigation', async () => {
    const onSelect = vi.fn();
    mockFilesystemList
      .mockResolvedValueOnce(rootResponse)
      .mockResolvedValueOnce(homeResponse);

    await act(async () => {
      renderWithToast(<FilesystemBrowser {...defaultProps} onSelect={onSelect} />);
    });

    await waitFor(() => expect(screen.getByText('home')).toBeInTheDocument());

    // Navigate into /home
    await act(async () => {
      fireEvent.click(screen.getByText('home'));
    });

    await waitFor(() => {
      expect(screen.getByText('user')).toBeInTheDocument();
    });

    // Click Select button
    const selectButton = screen.getByRole('button', { name: /select/i });
    
    await act(async () => {
      fireEvent.click(selectButton);
    });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('/home');
  });

  it('calls onClose when the Cancel button is clicked', async () => {
    const onClose = vi.fn();

    await act(async () => {
      renderWithToast(<FilesystemBrowser {...defaultProps} onClose={onClose} />);
    });

    await waitFor(() => expect(screen.getByText('home')).toBeInTheDocument());

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    
    await act(async () => {
      fireEvent.click(cancelButton);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when a directory is selected', async () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();

    await act(async () => {
      renderWithToast(
        <FilesystemBrowser {...defaultProps} onClose={onClose} onSelect={onSelect} />,
      );
    });

    await waitFor(() => expect(screen.getByText('home')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /select/i }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── Error Handling ────────────────────────────────────────────────────────

  it('displays error message when directory loading fails', async () => {
    mockFilesystemList.mockRejectedValue(new Error('Permission denied'));

    await act(async () => {
      renderWithToast(<FilesystemBrowser {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Permission denied')).toBeInTheDocument();
    });
  });

  it('displays generic error for non-Error throws', async () => {
    mockFilesystemList.mockRejectedValue('String error');

    await act(async () => {
      renderWithToast(<FilesystemBrowser {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to load directory')).toBeInTheDocument();
    });
  });

  // ── Loading State ─────────────────────────────────────────────────────────

  it('shows loading skeletons while loading', async () => {
    // Create a delayed promise so loading state is visible
    let resolvePromise: (value: typeof rootResponse) => void = () => {};
    mockFilesystemList.mockImplementation(
      () => new Promise(resolve => {
        resolvePromise = resolve;
      }),
    );

    await act(async () => {
      renderWithToast(<FilesystemBrowser {...defaultProps} />);
    });

    // Should show skeletons while loading
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);

    // Resolve the promise
    await act(async () => {
      resolvePromise(rootResponse);
    });

    // Should show actual content after loading
    await waitFor(() => {
      expect(screen.getByText('home')).toBeInTheDocument();
    });
  });

  // ── Initial Path ──────────────────────────────────────────────────────────

  it('loads initialPath on open', async () => {
    mockFilesystemList.mockResolvedValue(homeResponse);

    await act(async () => {
      renderWithToast(<FilesystemBrowser {...defaultProps} initialPath="/home" />);
    });

    await waitFor(() => {
      expect(mockFilesystemList).toHaveBeenCalledWith('/home');
      expect(screen.getByText('user')).toBeInTheDocument();
    });
  });

  it('displays empty state when directory has no subdirectories', async () => {
    mockFilesystemList.mockResolvedValue({
      path: '/empty',
      entries: [],
    });

    await act(async () => {
      renderWithToast(<FilesystemBrowser {...defaultProps} initialPath="/empty" />);
    });

    await waitFor(() => {
      expect(screen.getByText('No subdirectories found.')).toBeInTheDocument();
    });
  });

  it('filters out non-directory entries', async () => {
    mockFilesystemList.mockResolvedValue({
      path: '/mixed',
      entries: [
        { name: 'file.txt', path: '/mixed/file.txt', isDirectory: false, readable: true, writable: true },
        { name: 'folder', path: '/mixed/folder', isDirectory: true, readable: true, writable: true },
      ],
    });

    await act(async () => {
      renderWithToast(<FilesystemBrowser {...defaultProps} initialPath="/mixed" />);
    });

    await waitFor(() => {
      expect(screen.getByText('folder')).toBeInTheDocument();
      expect(screen.queryByText('file.txt')).not.toBeInTheDocument();
    });
  });
});
