import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MovieActionsToolbar } from './MovieActionsToolbar';

describe('MovieActionsToolbar', () => {
  it('renders all action buttons', () => {
    const handlers = {
      onRefresh: vi.fn(),
      onSearch: vi.fn(),
      onInteractiveSearch: vi.fn(),
      onPreviewRename: vi.fn(),
      onManageFiles: vi.fn(),
      onHistory: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    };

    render(<MovieActionsToolbar {...handlers} />);

    expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search Movie/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Interactive Search/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Preview Rename/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Manage Files/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /History/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit Movie/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete Movie/i })).toBeInTheDocument();
  });

  it('calls onRefresh when refresh button is clicked', () => {
    const handleRefresh = vi.fn();
    render(<MovieActionsToolbar onRefresh={handleRefresh} />);

    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));
    expect(handleRefresh).toHaveBeenCalledTimes(1);
  });

  it('calls onSearch when search movie button is clicked', () => {
    const handleSearch = vi.fn();
    render(<MovieActionsToolbar onSearch={handleSearch} />);

    fireEvent.click(screen.getByRole('button', { name: /Search Movie/i }));
    expect(handleSearch).toHaveBeenCalledTimes(1);
  });

  it('disables refresh button when isRefreshing is true', () => {
    render(<MovieActionsToolbar onRefresh={vi.fn()} isRefreshing={true} />);

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    expect(refreshButton).toBeDisabled();
  });

  it('disables search button when isSearching is true', () => {
    render(<MovieActionsToolbar onSearch={vi.fn()} isSearching={true} />);

    const searchButton = screen.getByRole('button', { name: /Search Movie/i });
    expect(searchButton).toBeDisabled();
  });

  it('does not render delete button when onDelete not provided', () => {
    render(<MovieActionsToolbar />);

    expect(screen.queryByRole('button', { name: /Delete Movie/i })).not.toBeInTheDocument();
  });
});
