import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    renderWithToast(<FilesystemBrowser {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('home')).toBeInTheDocument();
      expect(screen.getByText('tmp')).toBeInTheDocument();
      expect(screen.getByText('etc')).toBeInTheDocument();
    });
  });

  it('shows breadcrumb for root path', async () => {
    renderWithToast(<FilesystemBrowser {...defaultProps} />);

    await waitFor(() => expect(screen.getByText('home')).toBeInTheDocument());
    // Root breadcrumb should be present
    expect(screen.getByRole('button', { name: /root|^\/$/ })).toBeInTheDocument();
  });

  // ── Navigation ────────────────────────────────────────────────────────────

  it('navigates into a directory on click', async () => {
    mockFilesystemList
      .mockResolvedValueOnce(rootResponse)
      .mockResolvedValueOnce(homeResponse);

    renderWithToast(<FilesystemBrowser {...defaultProps} />);

    await waitFor(() => expect(screen.getByText('home')).toBeInTheDocument());

    fireEvent.click(screen.getByText('home'));

    await waitFor(() => {
      expect(mockFilesystemList).toHaveBeenCalledWith('/home');
      expect(screen.getByText('user')).toBeInTheDocument();
    });
  });

  it('updates breadcrumb when navigating deeper', async () => {
    mockFilesystemList
      .mockResolvedValueOnce(rootResponse)
      .mockResolvedValueOnce(homeResponse);

    renderWithToast(<FilesystemBrowser {...defaultProps} />);

    await waitFor(() => expect(screen.getByText('home')).toBeInTheDocument());
    fireEvent.click(screen.getByText('home'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'home' })).toBeInTheDocument();
    });
  });

  // ── Selection ─────────────────────────────────────────────────────────────

  it('calls onSelect with the selected path when Select button is clicked', async () => {
    const onSelect = vi.fn();
    renderWithToast(<FilesystemBrowser {...defaultProps} onSelect={onSelect} />);

    await waitFor(() => expect(screen.getByText('home')).toBeInTheDocument());

    // Click a directory row to highlight it
    fireEvent.click(screen.getByText('home'));

    // Wait for navigation to complete
    mockFilesystemList.mockResolvedValueOnce(homeResponse);

    // Click Select button
    const selectButton = screen.getByRole('button', { name: /select/i });
    fireEvent.click(selectButton);

    expect(onSelect).toHaveBeenCalled();
  });

  it('calls onClose when the Cancel button is clicked', async () => {
    const onClose = vi.fn();
    renderWithToast(<FilesystemBrowser {...defaultProps} onClose={onClose} />);

    await waitFor(() => expect(screen.getByText('home')).toBeInTheDocument());

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
