import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FileBrowser } from './FileBrowser';
// Test data for mock file system
const mockRootEntries = [
    { name: 'data', path: '/data', type: 'folder' },
    { name: 'config', path: '/config', type: 'folder' },
    { name: 'downloads', path: '/downloads', type: 'folder' },
    { name: 'media', path: '/media', type: 'folder' },
];
const mockDataEntries = [
    { name: 'media', path: '/data/media', type: 'folder' },
    { name: 'backups', path: '/data/backups', type: 'folder' },
    { name: 'downloads', path: '/data/downloads', type: 'folder' },
];
const mockMediaEntries = [
    { name: 'movies', path: '/data/media/movies', type: 'folder' },
    { name: 'tv', path: '/data/media/tv', type: 'folder' },
    { name: 'music', path: '/data/media/music', type: 'folder' },
];
const mockMoviesEntries = [
    { name: 'Inception.mkv', path: '/data/media/movies/Inception.mkv', type: 'file', size: 2147483648, modified: new Date('2024-01-15') },
    { name: 'The Matrix.mkv', path: '/data/media/movies/The Matrix.mkv', type: 'file', size: 1073741824, modified: new Date('2024-02-20') },
];
const mockConfigEntries = [
    { name: 'settings.json', path: '/config/settings.json', type: 'file', size: 1024, modified: new Date('2024-03-01') },
];
describe('FileBrowser component', () => {
    it('renders modal with file list', () => {
        const onSelect = vi.fn();
        const onCancel = vi.fn();
        render(_jsx(FileBrowser, { isOpen: true, title: "Select Download Folder", entries: mockRootEntries, onSelect: onSelect, onCancel: onCancel }));
        expect(screen.getByRole('dialog', { name: 'Select Download Folder' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument();
    });
    it('does not render when closed', () => {
        const onSelect = vi.fn();
        const onCancel = vi.fn();
        render(_jsx(FileBrowser, { isOpen: false, title: "Hidden File Browser", entries: mockRootEntries, onSelect: onSelect, onCancel: onCancel }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    it('displays provided entries', () => {
        const onSelect = vi.fn();
        const onCancel = vi.fn();
        render(_jsx(FileBrowser, { isOpen: true, title: "Root Directory", entries: mockRootEntries, onSelect: onSelect, onCancel: onCancel }));
        expect(screen.getByText('data')).toBeInTheDocument();
        expect(screen.getByText('config')).toBeInTheDocument();
        expect(screen.getByText('downloads')).toBeInTheDocument();
        expect(screen.getByText('media')).toBeInTheDocument();
    });
    it('navigates into folders on double click', () => {
        const onPathChange = vi.fn();
        const onSelect = vi.fn();
        const onCancel = vi.fn();
        render(_jsx(FileBrowser, { isOpen: true, title: "Navigate Test", entries: mockRootEntries, onPathChange: onPathChange, onSelect: onSelect, onCancel: onCancel }));
        const dataFolder = screen.getByText('data');
        fireEvent.doubleClick(dataFolder);
        // Should call onPathChange with the folder's path
        expect(onPathChange).toHaveBeenCalledWith('/data');
    });
    it('navigates using breadcrumbs', () => {
        const onSelect = vi.fn();
        const onCancel = vi.fn();
        render(_jsx(FileBrowser, { isOpen: true, title: "Breadcrumb Test", initialPath: "/data/media", entries: mockMediaEntries, onPathChange: vi.fn(), onSelect: onSelect, onCancel: onCancel }));
        // Should show path navigation elements
        expect(screen.getByRole('button', { name: 'Go to root' })).toBeInTheDocument();
        expect(screen.getByText('data')).toBeInTheDocument();
        expect(screen.getByText('media')).toBeInTheDocument();
        // Check breadcrumb section exists
        const breadcrumbSection = screen.getByRole('dialog').querySelector('.overflow-x-auto');
        expect(breadcrumbSection).toBeInTheDocument();
    });
    it('navigates up to parent directory', () => {
        const onPathChange = vi.fn();
        const onSelect = vi.fn();
        const onCancel = vi.fn();
        render(_jsx(FileBrowser, { isOpen: true, title: "Up Navigation Test", initialPath: "/data/media", entries: mockMediaEntries, onPathChange: onPathChange, onSelect: onSelect, onCancel: onCancel }));
        const upButton = screen.getByRole('button', { name: 'Go to parent directory' });
        expect(upButton).not.toBeDisabled();
        fireEvent.click(upButton);
        // Should call onPathChange with parent path
        expect(onPathChange).toHaveBeenCalledWith('/data');
    });
    it('disables up button at root directory', () => {
        const onSelect = vi.fn();
        const onCancel = vi.fn();
        render(_jsx(FileBrowser, { isOpen: true, title: "Root Up Test", initialPath: "/", entries: mockRootEntries, onSelect: onSelect, onCancel: onCancel }));
        const upButton = screen.getByRole('button', { name: 'Go to parent directory' });
        expect(upButton).toBeDisabled();
    });
    it('navigates to root directory via home button', () => {
        const onPathChange = vi.fn();
        const onSelect = vi.fn();
        const onCancel = vi.fn();
        render(_jsx(FileBrowser, { isOpen: true, title: "Home Navigation Test", initialPath: "/data/media/movies", entries: mockMoviesEntries, onPathChange: onPathChange, onSelect: onSelect, onCancel: onCancel }));
        const homeButton = screen.getByRole('button', { name: 'Go to root' });
        fireEvent.click(homeButton);
        // Should call onPathChange with root
        expect(onPathChange).toHaveBeenCalledWith('/');
    });
    it('selects files in file selection mode', () => {
        const onSelect = vi.fn();
        const onCancel = vi.fn();
        render(_jsx(FileBrowser, { isOpen: true, title: "File Selection Test", initialPath: "/data/media/movies", selectFolder: false, entries: mockMoviesEntries, onSelect: onSelect, onCancel: onCancel }));
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
        render(_jsx(FileBrowser, { isOpen: true, title: "Folder Selection Test", initialPath: "/data/media/movies", selectFolder: true, entries: mockMoviesEntries, onSelect: onSelect, onCancel: onCancel }));
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
        render(_jsx(FileBrowser, { isOpen: true, title: "No Selection Test", initialPath: "/data/media", selectFolder: false, entries: mockMediaEntries, onSelect: onSelect, onCancel: onCancel }));
        const selectButton = screen.getByRole('button', { name: 'Select' });
        expect(selectButton).toBeDisabled();
    });
    it('displays file metadata correctly', () => {
        const onSelect = vi.fn();
        const onCancel = vi.fn();
        render(_jsx(FileBrowser, { isOpen: true, title: "Metadata Test", initialPath: "/data/media/movies", entries: mockMoviesEntries, onSelect: onSelect, onCancel: onCancel }));
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
        render(_jsx(FileBrowser, { isOpen: true, title: "Empty Directory Test", initialPath: "/media/external", entries: [], onSelect: onSelect, onCancel: onCancel }));
        expect(screen.getByText('This folder is empty')).toBeInTheDocument();
    });
    it('displays item count', () => {
        const onSelect = vi.fn();
        const onCancel = vi.fn();
        render(_jsx(FileBrowser, { isOpen: true, title: "Item Count Test", initialPath: "/", entries: mockRootEntries, onSelect: onSelect, onCancel: onCancel }));
        expect(screen.getByText('4 items')).toBeInTheDocument();
    });
    it('calls onCancel when cancel button is clicked', () => {
        const onSelect = vi.fn();
        const onCancel = vi.fn();
        render(_jsx(FileBrowser, { isOpen: true, title: "Cancel Test", entries: mockRootEntries, onSelect: onSelect, onCancel: onCancel }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onSelect).not.toHaveBeenCalled();
    });
    it('supports keyboard navigation with Enter key', () => {
        const onPathChange = vi.fn();
        const onSelect = vi.fn();
        const onCancel = vi.fn();
        render(_jsx(FileBrowser, { isOpen: true, title: "Keyboard Test", initialPath: "/data/media", entries: mockMediaEntries, onPathChange: onPathChange, onSelect: onSelect, onCancel: onCancel }));
        const folder = screen.getByText('movies');
        folder.focus();
        fireEvent.keyDown(folder, { key: 'Enter' });
        // Should call onPathChange with the folder path
        expect(onPathChange).toHaveBeenCalledWith('/data/media/movies');
    });
    it('supports keyboard navigation with Space key', () => {
        const onPathChange = vi.fn();
        const onSelect = vi.fn();
        const onCancel = vi.fn();
        render(_jsx(FileBrowser, { isOpen: true, title: "Space Key Test", initialPath: "/data/media", entries: mockMediaEntries, onPathChange: onPathChange, onSelect: onSelect, onCancel: onCancel }));
        const folder = screen.getByText('movies');
        folder.focus();
        fireEvent.keyDown(folder, { key: ' ' });
        // Should call onPathChange with the folder path
        expect(onPathChange).toHaveBeenCalledWith('/data/media/movies');
    });
    it('highlights selected file', () => {
        const onSelect = vi.fn();
        const onCancel = vi.fn();
        render(_jsx(FileBrowser, { isOpen: true, title: "Highlight Test", initialPath: "/data/media/movies", entries: mockMoviesEntries, onSelect: onSelect, onCancel: onCancel }));
        const fileText = screen.getByText('Inception.mkv');
        const fileRow = fileText.closest('.grid');
        if (!fileRow)
            throw new Error('File row not found');
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
        render(_jsx(FileBrowser, { isOpen: true, title: "Header Test", entries: mockRootEntries, onSelect: onSelect, onCancel: onCancel }));
        // Check that all header text elements are present
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Type')).toBeInTheDocument();
        expect(screen.getByText('Size')).toBeInTheDocument();
        expect(screen.getByText('Modified')).toBeInTheDocument();
    });
    it('displays folder icons', () => {
        const onSelect = vi.fn();
        const onCancel = vi.fn();
        render(_jsx(FileBrowser, { isOpen: true, title: "Folder Icon Test", initialPath: "/data", entries: mockDataEntries, onSelect: onSelect, onCancel: onCancel }));
        // Check for folder icons by looking for elements with folder class/name
        const folderItems = screen.getAllByText('folder');
        expect(folderItems.length).toBeGreaterThan(0);
    });
    it('navigates through multiple levels', () => {
        const onPathChange = vi.fn();
        const onSelect = vi.fn();
        const onCancel = vi.fn();
        render(_jsx(FileBrowser, { isOpen: true, title: "Multi-level Test", initialPath: "/", entries: mockRootEntries, onPathChange: onPathChange, onSelect: onSelect, onCancel: onCancel }));
        // Navigate: / -> data
        fireEvent.doubleClick(screen.getByText('data'));
        expect(onPathChange).toHaveBeenCalledWith('/data');
        // Navigate: /data -> media (note: since entries don't change, we can't actually navigate to subdirectories)
        // In a real implementation, the parent would update the entries prop when path changes
        onPathChange.mockClear();
        fireEvent.doubleClick(screen.getByText('media'));
        // The item's path is /media (not /data/media), so that's what gets passed
        expect(onPathChange).toHaveBeenCalledWith('/media');
    });
    it('handles onPathChange for folder click', () => {
        const onPathChange = vi.fn();
        const onSelect = vi.fn();
        const onCancel = vi.fn();
        render(_jsx(FileBrowser, { isOpen: true, title: "Folder Click Test", entries: mockRootEntries, onPathChange: onPathChange, onSelect: onSelect, onCancel: onCancel }));
        // Single click on folder should trigger navigation
        fireEvent.click(screen.getByText('data'));
        expect(onPathChange).toHaveBeenCalledWith('/data');
    });
    it('handles file selection without navigation in file mode', () => {
        const onPathChange = vi.fn();
        const onSelect = vi.fn();
        const onCancel = vi.fn();
        render(_jsx(FileBrowser, { isOpen: true, title: "File Click Test", entries: mockMoviesEntries, onPathChange: onPathChange, selectFolder: false, onSelect: onSelect, onCancel: onCancel }));
        // Single click on file should NOT trigger navigation
        fireEvent.click(screen.getByText('Inception.mkv'));
        expect(onPathChange).not.toHaveBeenCalled();
        // But should allow selection
        fireEvent.click(screen.getByRole('button', { name: 'Select' }));
        expect(onSelect).toHaveBeenCalledWith('/data/media/movies/Inception.mkv');
    });
});
//# sourceMappingURL=FileBrowser.test.js.map