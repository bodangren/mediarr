import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ImportSeriesTable } from './ImportSeriesTable';
describe('ImportSeriesTable', () => {
    const mockDetectedSeries = [
        {
            id: 1,
            folderName: 'Breaking Bad',
            path: '/media/tv/Breaking Bad',
            fileCount: 62,
            matchedSeriesId: 123,
            matchedSeriesTitle: 'Breaking Bad',
            matchedSeriesYear: 2008,
            status: 'matched',
        },
        {
            id: 2,
            folderName: 'The Office US',
            path: '/media/tv/The Office US',
            fileCount: 201,
            matchedSeriesId: null,
            status: 'unmatched',
        },
        {
            id: 3,
            folderName: 'Game of Thrones',
            path: '/media/tv/Game of Thrones',
            fileCount: 73,
            matchedSeriesId: 456,
            matchedSeriesTitle: 'Game of Thrones',
            matchedSeriesYear: 2011,
            status: 'matched',
        },
    ];
    const mockOnManualMatch = vi.fn();
    const mockOnImport = vi.fn();
    const mockOnBulkImport = vi.fn();
    beforeEach(() => {
        mockOnManualMatch.mockClear();
        mockOnImport.mockClear();
        mockOnBulkImport.mockClear();
    });
    it('renders table with all series', () => {
        render(_jsx(ImportSeriesTable, { detectedSeries: mockDetectedSeries, onManualMatch: mockOnManualMatch, onImport: mockOnImport, onBulkImport: mockOnBulkImport }));
        expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
        expect(screen.getByText('The Office US')).toBeInTheDocument();
        expect(screen.getByText('Game of Thrones')).toBeInTheDocument();
    });
    it('renders table headers', () => {
        render(_jsx(ImportSeriesTable, { detectedSeries: mockDetectedSeries, onManualMatch: mockOnManualMatch, onImport: mockOnImport, onBulkImport: mockOnBulkImport }));
        expect(screen.getByText('Series Name')).toBeInTheDocument();
        expect(screen.getByText('Path')).toBeInTheDocument();
        expect(screen.getByText('Files')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
    });
    it('shows empty panel when no series detected', () => {
        render(_jsx(ImportSeriesTable, { detectedSeries: [], onManualMatch: mockOnManualMatch, onImport: mockOnImport, onBulkImport: mockOnBulkImport }));
        expect(screen.getByText('No series detected')).toBeInTheDocument();
        expect(screen.getByText('Enter a folder path and click Scan to detect series in that location.')).toBeInTheDocument();
    });
    it('shows summary counts', () => {
        render(_jsx(ImportSeriesTable, { detectedSeries: mockDetectedSeries, onManualMatch: mockOnManualMatch, onImport: mockOnImport, onBulkImport: mockOnBulkImport }));
        // Check the summary text at the bottom
        // "2 ready to import"
        expect(screen.getByText('ready to import')).toBeInTheDocument();
        // "1 need manual match"
        expect(screen.getByText(/need manual match/)).toBeInTheDocument();
    });
    it('allows selecting matched series', () => {
        render(_jsx(ImportSeriesTable, { detectedSeries: mockDetectedSeries, onManualMatch: mockOnManualMatch, onImport: mockOnImport, onBulkImport: mockOnBulkImport }));
        const checkboxes = screen.getAllByRole('checkbox');
        // First checkbox (for matched series) should be enabled
        expect(checkboxes[0]).not.toBeDisabled();
        // Second checkbox (for unmatched series) should be disabled
        expect(checkboxes[1]).toBeDisabled();
    });
    it('shows bulk actions when series are selected', async () => {
        render(_jsx(ImportSeriesTable, { detectedSeries: mockDetectedSeries, onManualMatch: mockOnManualMatch, onImport: mockOnImport, onBulkImport: mockOnBulkImport }));
        // Select first matched series
        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]);
        await waitFor(() => {
            expect(screen.getByText('1 series selected for import')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /import selected/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /clear selection/i })).toBeInTheDocument();
        });
    });
    it('calls onBulkImport with selected series IDs', async () => {
        render(_jsx(ImportSeriesTable, { detectedSeries: mockDetectedSeries, onManualMatch: mockOnManualMatch, onImport: mockOnImport, onBulkImport: mockOnBulkImport }));
        // Select first matched series (Breaking Bad, id: 1)
        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]);
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /import selected/i })).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole('button', { name: /import selected/i }));
        expect(mockOnBulkImport).toHaveBeenCalledWith([1]);
    });
    it('clears selection when Clear Selection is clicked', async () => {
        render(_jsx(ImportSeriesTable, { detectedSeries: mockDetectedSeries, onManualMatch: mockOnManualMatch, onImport: mockOnImport, onBulkImport: mockOnBulkImport }));
        // Select first matched series
        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]);
        await waitFor(() => {
            expect(screen.getByText('1 series selected for import')).toBeInTheDocument();
        });
        // Clear selection
        fireEvent.click(screen.getByRole('button', { name: /clear selection/i }));
        await waitFor(() => {
            expect(screen.queryByText('1 series selected for import')).not.toBeInTheDocument();
        });
    });
    it('shows file count for each series', () => {
        render(_jsx(ImportSeriesTable, { detectedSeries: mockDetectedSeries, onManualMatch: mockOnManualMatch, onImport: mockOnImport, onBulkImport: mockOnBulkImport }));
        expect(screen.getByText('62 files')).toBeInTheDocument();
        expect(screen.getByText('201 files')).toBeInTheDocument();
        expect(screen.getByText('73 files')).toBeInTheDocument();
    });
    it('shows status badges for series', () => {
        render(_jsx(ImportSeriesTable, { detectedSeries: mockDetectedSeries, onManualMatch: mockOnManualMatch, onImport: mockOnImport, onBulkImport: mockOnBulkImport }));
        // Matched statuses
        const matchedBadges = screen.getAllByText('Matched');
        expect(matchedBadges.length).toBe(2);
        // Unmatched status
        expect(screen.getByText('Unmatched')).toBeInTheDocument();
    });
});
//# sourceMappingURL=ImportSeriesTable.test.js.map