import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MovieActionsToolbar } from './MovieActionsToolbar';

describe('MovieActionsToolbar', () => {
  const mockHandlers = {
    onSync: vi.fn(),
    onScan: vi.fn(),
    onSearch: vi.fn(),
    onManualSearch: vi.fn(),
    onUpload: vi.fn(),
    onHistory: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all action buttons', () => {
    render(<MovieActionsToolbar {...mockHandlers} />);

    expect(screen.getByRole('button', { name: /sync movie/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /scan disk/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search all/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manual search/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
  });

  it('calls onSync when Sync button is clicked', () => {
    render(<MovieActionsToolbar {...mockHandlers} />);

    fireEvent.click(screen.getByRole('button', { name: /sync movie/i }));
    expect(mockHandlers.onSync).toHaveBeenCalledTimes(1);
  });

  it('calls onScan when Scan Disk button is clicked', () => {
    render(<MovieActionsToolbar {...mockHandlers} />);

    fireEvent.click(screen.getByRole('button', { name: /scan disk/i }));
    expect(mockHandlers.onScan).toHaveBeenCalledTimes(1);
  });

  it('calls onSearch when Search All button is clicked', () => {
    render(<MovieActionsToolbar {...mockHandlers} />);

    fireEvent.click(screen.getByRole('button', { name: /search all/i }));
    expect(mockHandlers.onSearch).toHaveBeenCalledTimes(1);
  });

  it('calls onManualSearch when Manual Search button is clicked', () => {
    render(<MovieActionsToolbar {...mockHandlers} />);

    fireEvent.click(screen.getByRole('button', { name: /manual search/i }));
    expect(mockHandlers.onManualSearch).toHaveBeenCalledTimes(1);
  });

  it('calls onUpload when Upload button is clicked', () => {
    render(<MovieActionsToolbar {...mockHandlers} />);

    fireEvent.click(screen.getByRole('button', { name: /upload/i }));
    expect(mockHandlers.onUpload).toHaveBeenCalledTimes(1);
  });

  it('opens more menu and calls onHistory when History is clicked', () => {
    render(<MovieActionsToolbar {...mockHandlers} />);

    const menuButton = screen.getByRole('button', { name: /more actions/i });
    fireEvent.click(menuButton);

    expect(screen.getByRole('menu', { name: /more actions/i })).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();

    fireEvent.click(screen.getByText('History'));
    expect(mockHandlers.onHistory).toHaveBeenCalledTimes(1);
  });

  it('disables Sync button when isSyncing is true', () => {
    render(<MovieActionsToolbar {...mockHandlers} isSyncing />);

    const syncButton = screen.getByRole('button', { name: /sync movie/i });
    expect(syncButton).toBeDisabled();
  });

  it('disables Scan Disk button when isScanning is true', () => {
    render(<MovieActionsToolbar {...mockHandlers} isScanning />);

    const scanButton = screen.getByRole('button', { name: /scan disk/i });
    expect(scanButton).toBeDisabled();
  });

  it('disables Search All button when isSearching is true', () => {
    render(<MovieActionsToolbar {...mockHandlers} isSearching />);

    const searchButton = screen.getByRole('button', { name: /search all/i });
    expect(searchButton).toBeDisabled();
  });

  it('adds spinning animation to refresh icon when syncing', () => {
    const { container } = render(<MovieActionsToolbar {...mockHandlers} isSyncing />);

    const syncButton = screen.getByRole('button', { name: /sync movie/i });
    expect(syncButton).toContainHTML('animate-spin');
  });

  it('adds spinning animation to disk icon when scanning', () => {
    const { container } = render(<MovieActionsToolbar {...mockHandlers} isScanning />);

    const scanButton = screen.getByRole('button', { name: /scan disk/i });
    expect(scanButton).toContainHTML('animate-spin');
  });

  it('adds spinning animation to search icon when searching', () => {
    const { container } = render(<MovieActionsToolbar {...mockHandlers} isSearching />);

    const searchButton = screen.getByRole('button', { name: /search all/i });
    expect(searchButton).toContainHTML('animate-spin');
  });

  it('does not disable buttons when loading states are false', () => {
    render(
      <MovieActionsToolbar {...mockHandlers} isSyncing={false} isScanning={false} isSearching={false} />
    );

    expect(screen.getByRole('button', { name: /sync movie/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /scan disk/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /search all/i })).not.toBeDisabled();
  });

  it('has correct accessibility attributes', () => {
    render(<MovieActionsToolbar {...mockHandlers} />);

    expect(screen.getByRole('button', { name: /sync movie/i })).toHaveAttribute('aria-label', 'Sync movie');
    expect(screen.getByRole('button', { name: /scan disk/i })).toHaveAttribute('aria-label', 'Scan disk');
    expect(screen.getByRole('button', { name: /search all/i })).toHaveAttribute(
      'aria-label',
      'Search all subtitles'
    );
    expect(screen.getByRole('button', { name: /manual search/i })).toHaveAttribute(
      'aria-label',
      'Manual search'
    );
    expect(screen.getByRole('button', { name: /upload/i })).toHaveAttribute(
      'aria-label',
      'Upload subtitles'
    );
  });

  it('applies correct button styles', () => {
    const { container } = render(<MovieActionsToolbar {...mockHandlers} />);

    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      expect(button).toHaveClass(
        'rounded-sm',
        'border',
        'border-border-subtle',
        'px-3',
        'py-1.5',
        'text-sm',
        'transition-colors'
      );
    });
  });
});
