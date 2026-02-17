import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FileBrowser, type FileBrowserItem } from './FileBrowser';

describe('FileBrowser component', () => {
  it('renders modal with file list', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(
      <FileBrowser
        isOpen={true}
        title="Select Download Folder"
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Select Download Folder' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(
      <FileBrowser
        isOpen={false}
        title="Hidden File Browser"
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays root directory items', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(
      <FileBrowser
        isOpen={true}
        title="Root Directory"
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText('data')).toBeInTheDocument();
    expect(screen.getByText('config')).toBeInTheDocument();
    expect(screen.getByText('downloads')).toBeInTheDocument();
    expect(screen.getByText('media')).toBeInTheDocument();
  });

  it('navigates into folders on double click', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(
      <FileBrowser
        isOpen={true}
        title="Navigate Test"
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );

    const dataFolder = screen.getByText('data');
    fireEvent.doubleClick(dataFolder);

    // Should now show contents of /data
    expect(screen.getByText('media')).toBeInTheDocument();
    expect(screen.getByText('backups')).toBeInTheDocument();
    expect(screen.getByText('downloads')).toBeInTheDocument();
  });

  it('navigates using breadcrumbs', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(
      <FileBrowser
        isOpen={true}
        title="Breadcrumb Test"
        initialPath="/data/media"
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );

    // Should show path navigation elements
    expect(screen.getByRole('button', { name: 'Go to root' })).toBeInTheDocument();
    expect(screen.getByText('data')).toBeInTheDocument();
    expect(screen.getByText('media')).toBeInTheDocument();

    // Check breadcrumb section exists
    const breadcrumbSection = screen.getByRole('dialog').querySelector('.overflow-x-auto') as HTMLElement;
    expect(breadcrumbSection).toBeInTheDocument();
  });

  it('navigates up to parent directory', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(
      <FileBrowser
        isOpen={true}
        title="Up Navigation Test"
        initialPath="/data/media"
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );

    const upButton = screen.getByRole('button', { name: 'Go to parent directory' });
    expect(upButton).not.toBeDisabled();

    fireEvent.click(upButton);

    // Should now show contents of /data
    expect(screen.getByText('backups')).toBeInTheDocument();
  });

  it('disables up button at root directory', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(
      <FileBrowser
        isOpen={true}
        title="Root Up Test"
        initialPath="/"
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );

    const upButton = screen.getByRole('button', { name: 'Go to parent directory' });
    expect(upButton).toBeDisabled();
  });

  it('navigates to root directory via home button', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(
      <FileBrowser
        isOpen={true}
        title="Home Navigation Test"
        initialPath="/data/media/movies"
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );

    const homeButton = screen.getByRole('button', { name: 'Go to root' });
    fireEvent.click(homeButton);

    // Should show root directory contents
    expect(screen.getByText('data')).toBeInTheDocument();
    expect(screen.getByText('config')).toBeInTheDocument();
    expect(screen.getByText('downloads')).toBeInTheDocument();
  });

  it('selects files in file selection mode', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(
      <FileBrowser
        isOpen={true}
        title="File Selection Test"
        initialPath="/data/media/movies"
        selectFolder={false}
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );

    // Click on a file to select it
    const fileItem = screen.getByText('Inception.mkv');
    fireEvent.click(fileItem);

    // Should show selection info
    expect(screen.getByText(/Selected:/i)).toBeInTheDocument();
    expect(screen.getByText('/data/media/movies/Inception.mkv')).toBeInTheDocument();

    // Select button should be enabled
    const selectButton = screen.getByRole('button', { name: 'Select' });
    expect(selectButton).not.toBeDisabled();

    // Click select button
    fireEvent.click(selectButton);

    expect(onSelect).toHaveBeenCalledWith('/data/media/movies/Inception.mkv');
  });

  it('selects current folder in folder selection mode', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(
      <FileBrowser
        isOpen={true}
        title="Folder Selection Test"
        initialPath="/data/media/movies"
        selectFolder={true}
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );

    // Should show current folder info
    expect(screen.getByText(/Current folder:/i)).toBeInTheDocument();
    expect(screen.getByText('/data/media/movies')).toBeInTheDocument();

    // Select button should be enabled in folder mode
    const selectButton = screen.getByRole('button', { name: 'Select' });
    expect(selectButton).not.toBeDisabled();

    // Click select button
    fireEvent.click(selectButton);

    expect(onSelect).toHaveBeenCalledWith('/data/media/movies');
  });

  it('disables select button when no file is selected in file mode', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(
      <FileBrowser
        isOpen={true}
        title="No Selection Test"
        initialPath="/data/media"
        selectFolder={false}
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );

    const selectButton = screen.getByRole('button', { name: 'Select' });
    expect(selectButton).toBeDisabled();
  });

  it('displays file metadata correctly', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(
      <FileBrowser
        isOpen={true}
        title="Metadata Test"
        initialPath="/data/media/movies"
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );

    // Check file type column - check files are present
    expect(screen.getByText('Inception.mkv')).toBeInTheDocument();
    expect(screen.getByText('The Matrix.mkv')).toBeInTheDocument();

    // Check file sizes (format should show GB/MB/KB)
    const sizes = screen.getAllByText(/GB|MB/);
    expect(sizes.length).toBeGreaterThan(0);

    // Check modified dates
    const dates = screen.getAllByText(/2024/);
    expect(dates.length).toBeGreaterThan(0);
  });

  it('shows empty state for empty directories', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(
      <FileBrowser
        isOpen={true}
        title="Empty Directory Test"
        initialPath="/media/external" // Assume this is empty
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText('This folder is empty')).toBeInTheDocument();
  });

  it('displays item count', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(
      <FileBrowser
        isOpen={true}
        title="Item Count Test"
        initialPath="/"
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText('4 items')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(
      <FileBrowser
        isOpen={true}
        title="Cancel Test"
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('supports keyboard navigation with Enter key', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(
      <FileBrowser
        isOpen={true}
        title="Keyboard Test"
        initialPath="/data/media"
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );

    const folder = screen.getByText('movies');
    folder.focus();
    fireEvent.keyDown(folder, { key: 'Enter' });

    // Should navigate to movies folder
    expect(screen.getByText('Inception.mkv')).toBeInTheDocument();
  });

  it('supports keyboard navigation with Space key', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(
      <FileBrowser
        isOpen={true}
        title="Space Key Test"
        initialPath="/data/media"
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );

    const folder = screen.getByText('movies');
    folder.focus();
    fireEvent.keyDown(folder, { key: ' ' });

    // Should navigate to movies folder
    expect(screen.getByText('Inception.mkv')).toBeInTheDocument();
  });

  it('highlights selected file', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(
      <FileBrowser
        isOpen={true}
        title="Highlight Test"
        initialPath="/data/media/movies"
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );

    const fileText = screen.getByText('Inception.mkv');
    const fileRow = fileText.closest('.grid');
    if (!fileRow) throw new Error('File row not found');

    // Initially not highlighted
    expect(fileRow.classList.contains('bg-surface-2')).toBe(false);

    // Click to select
    fireEvent.click(fileText);

    // Should be highlighted
    expect(fileRow.classList.contains('bg-surface-2')).toBe(true);
  });

  it('renders table headers correctly', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(
      <FileBrowser
        isOpen={true}
        title="Header Test"
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );

    // Check that all header text elements are present
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('Modified')).toBeInTheDocument();
  });

  it('displays folder icons', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(
      <FileBrowser
        isOpen={true}
        title="Folder Icon Test"
        initialPath="/data"
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );

    // Check for folder icons by looking for elements with folder class/name
    const folderItems = screen.getAllByText('folder');
    expect(folderItems.length).toBeGreaterThan(0);
  });

  it('navigates through multiple levels', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(
      <FileBrowser
        isOpen={true}
        title="Multi-level Test"
        initialPath="/"
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );

    // Navigate: / -> data -> media -> movies
    fireEvent.doubleClick(screen.getByText('data'));
    fireEvent.doubleClick(screen.getByText('media'));
    fireEvent.doubleClick(screen.getByText('movies'));

    // Should be in /data/media/movies
    expect(screen.getByText('Inception.mkv')).toBeInTheDocument();
    expect(screen.getByText('The Matrix.mkv')).toBeInTheDocument();

    // Breadcrumb should reflect the path
    expect(screen.getByRole('button', { name: 'data' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'media' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'movies' })).toBeInTheDocument();
  });
});
