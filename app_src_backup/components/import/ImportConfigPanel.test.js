import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ImportConfigPanel } from './ImportConfigPanel';
describe('ImportConfigPanel', () => {
    const defaultConfig = {
        qualityProfileId: 1,
        monitored: true,
        monitorNewItems: 'all',
        rootFolder: '/media/tv',
        seriesType: 'standard',
        seasonFolder: true,
    };
    const mockOnChange = vi.fn();
    const mockRootFolders = ['/media/tv', '/media/series', '/data/tv'];
    beforeEach(() => {
        mockOnChange.mockClear();
    });
    it('renders all configuration options', () => {
        render(_jsx(ImportConfigPanel, { config: defaultConfig, onChange: mockOnChange, rootFolders: mockRootFolders }));
        expect(screen.getByText('Import Configuration')).toBeInTheDocument();
        expect(screen.getByText('Quality Profile')).toBeInTheDocument();
        expect(screen.getByText('Root Folder')).toBeInTheDocument();
        expect(screen.getByText('Series Type')).toBeInTheDocument();
        expect(screen.getByText('Monitor Series')).toBeInTheDocument();
        expect(screen.getByText('Use Season Folders')).toBeInTheDocument();
        expect(screen.getByText('Monitor New Items')).toBeInTheDocument();
    });
    it('renders quality profile options', () => {
        render(_jsx(ImportConfigPanel, { config: defaultConfig, onChange: mockOnChange, rootFolders: mockRootFolders }));
        const qualitySelect = screen.getByLabelText('Quality Profile');
        expect(qualitySelect).toBeInTheDocument();
        // Check options are rendered
        expect(screen.getByRole('option', { name: 'HD-1080p' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'UltraHD-4K' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Any' })).toBeInTheDocument();
    });
    it('calls onChange when quality profile is changed', () => {
        render(_jsx(ImportConfigPanel, { config: defaultConfig, onChange: mockOnChange, rootFolders: mockRootFolders }));
        const qualitySelect = screen.getByLabelText('Quality Profile');
        fireEvent.change(qualitySelect, { target: { value: '2' } });
        expect(mockOnChange).toHaveBeenCalledWith({
            ...defaultConfig,
            qualityProfileId: 2,
        });
    });
    it('renders root folder options', () => {
        render(_jsx(ImportConfigPanel, { config: defaultConfig, onChange: mockOnChange, rootFolders: mockRootFolders }));
        const rootFolderSelect = screen.getByLabelText('Root Folder');
        expect(rootFolderSelect).toBeInTheDocument();
        // Check options are rendered
        expect(screen.getByRole('option', { name: '/media/tv' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: '/media/series' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: '/data/tv' })).toBeInTheDocument();
    });
    it('calls onChange when root folder is changed', () => {
        render(_jsx(ImportConfigPanel, { config: defaultConfig, onChange: mockOnChange, rootFolders: mockRootFolders }));
        const rootFolderSelect = screen.getByLabelText('Root Folder');
        fireEvent.change(rootFolderSelect, { target: { value: '/data/tv' } });
        expect(mockOnChange).toHaveBeenCalledWith({
            ...defaultConfig,
            rootFolder: '/data/tv',
        });
    });
    it('renders series type options', () => {
        render(_jsx(ImportConfigPanel, { config: defaultConfig, onChange: mockOnChange, rootFolders: mockRootFolders }));
        const seriesTypeSelect = screen.getByLabelText('Series Type');
        expect(seriesTypeSelect).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Standard' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Anime' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Daily' })).toBeInTheDocument();
    });
    it('toggles monitored checkbox correctly', () => {
        render(_jsx(ImportConfigPanel, { config: defaultConfig, onChange: mockOnChange, rootFolders: mockRootFolders }));
        const monitoredCheckbox = screen.getByLabelText('Monitor Series');
        expect(monitoredCheckbox).toBeChecked();
        fireEvent.click(monitoredCheckbox);
        expect(mockOnChange).toHaveBeenCalledWith({
            ...defaultConfig,
            monitored: false,
        });
    });
    it('toggles season folder checkbox correctly', () => {
        render(_jsx(ImportConfigPanel, { config: defaultConfig, onChange: mockOnChange, rootFolders: mockRootFolders }));
        const seasonFolderCheckbox = screen.getByLabelText('Use Season Folders');
        expect(seasonFolderCheckbox).toBeChecked();
        fireEvent.click(seasonFolderCheckbox);
        expect(mockOnChange).toHaveBeenCalledWith({
            ...defaultConfig,
            seasonFolder: false,
        });
    });
    it('renders monitor new items buttons', () => {
        render(_jsx(ImportConfigPanel, { config: defaultConfig, onChange: mockOnChange, rootFolders: mockRootFolders }));
        expect(screen.getByRole('button', { name: 'All Episodes' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Future Episodes' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'None' })).toBeInTheDocument();
    });
    it('highlights selected monitor new items option', () => {
        render(_jsx(ImportConfigPanel, { config: { ...defaultConfig, monitorNewItems: 'future' }, onChange: mockOnChange, rootFolders: mockRootFolders }));
        const futureButton = screen.getByRole('button', { name: 'Future Episodes' });
        const allButton = screen.getByRole('button', { name: 'All Episodes' });
        // Future should be selected (has accent border class)
        expect(futureButton).toHaveClass('border-accent-primary');
        // All should not be selected
        expect(allButton).not.toHaveClass('border-accent-primary');
    });
    it('calls onChange when monitor new items is changed', () => {
        render(_jsx(ImportConfigPanel, { config: defaultConfig, onChange: mockOnChange, rootFolders: mockRootFolders }));
        const futureButton = screen.getByRole('button', { name: 'Future Episodes' });
        fireEvent.click(futureButton);
        expect(mockOnChange).toHaveBeenCalledWith({
            ...defaultConfig,
            monitorNewItems: 'future',
        });
    });
    it('uses default folder option when no root folders provided', () => {
        render(_jsx(ImportConfigPanel, { config: defaultConfig, onChange: mockOnChange, rootFolders: [] }));
        expect(screen.getByRole('option', { name: '/media/tv (default)' })).toBeInTheDocument();
    });
});
//# sourceMappingURL=ImportConfigPanel.test.js.map