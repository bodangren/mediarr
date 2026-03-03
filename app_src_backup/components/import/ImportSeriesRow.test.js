import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ImportSeriesRow } from './ImportSeriesRow';
describe('ImportSeriesRow', () => {
    const matchedSeries = {
        id: 1,
        folderName: 'Breaking Bad',
        path: '/media/tv/Breaking Bad',
        fileCount: 62,
        matchedSeriesId: 123,
        matchedSeriesTitle: 'Breaking Bad',
        matchedSeriesYear: 2008,
        status: 'matched',
    };
    const unmatchedSeries = {
        id: 2,
        folderName: 'The Office US',
        path: '/media/tv/The Office US',
        fileCount: 201,
        matchedSeriesId: null,
        status: 'unmatched',
    };
    const pendingSeries = {
        id: 3,
        folderName: 'Stranger Things',
        path: '/media/tv/Stranger Things',
        fileCount: 34,
        matchedSeriesId: null,
        status: 'pending',
    };
    const mockOnSelect = vi.fn();
    const mockOnManualMatch = vi.fn();
    const mockOnImport = vi.fn();
    beforeEach(() => {
        mockOnSelect.mockClear();
        mockOnManualMatch.mockClear();
        mockOnImport.mockClear();
    });
    it('renders matched series with correct information', () => {
        render(_jsx("table", { children: _jsx("tbody", { children: _jsx(ImportSeriesRow, { series: matchedSeries, isSelected: false, onSelect: mockOnSelect, onManualMatch: mockOnManualMatch, onImport: mockOnImport }) }) }));
        expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
        expect(screen.getByText('/media/tv/Breaking Bad')).toBeInTheDocument();
        expect(screen.getByText('62 files')).toBeInTheDocument();
        expect(screen.getByText('Matched')).toBeInTheDocument();
    });
    it('renders unmatched series with search button', () => {
        render(_jsx("table", { children: _jsx("tbody", { children: _jsx(ImportSeriesRow, { series: unmatchedSeries, isSelected: false, onSelect: mockOnSelect, onManualMatch: mockOnManualMatch, onImport: mockOnImport }) }) }));
        expect(screen.getByText('The Office US')).toBeInTheDocument();
        expect(screen.getByText('Unmatched')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /import/i })).not.toBeInTheDocument();
    });
    it('renders pending series with pending status', () => {
        render(_jsx("table", { children: _jsx("tbody", { children: _jsx(ImportSeriesRow, { series: pendingSeries, isSelected: false, onSelect: mockOnSelect, onManualMatch: mockOnManualMatch, onImport: mockOnImport }) }) }));
        expect(screen.getByText('Stranger Things')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();
    });
    it('calls onSelect when checkbox is clicked', () => {
        render(_jsx("table", { children: _jsx("tbody", { children: _jsx(ImportSeriesRow, { series: matchedSeries, isSelected: false, onSelect: mockOnSelect, onManualMatch: mockOnManualMatch, onImport: mockOnImport }) }) }));
        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);
        expect(mockOnSelect).toHaveBeenCalledWith(1);
    });
    it('disables checkbox for unmatched series', () => {
        render(_jsx("table", { children: _jsx("tbody", { children: _jsx(ImportSeriesRow, { series: unmatchedSeries, isSelected: false, onSelect: mockOnSelect, onManualMatch: mockOnManualMatch, onImport: mockOnImport }) }) }));
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeDisabled();
    });
    it('calls onManualMatch when search button is clicked', () => {
        render(_jsx("table", { children: _jsx("tbody", { children: _jsx(ImportSeriesRow, { series: unmatchedSeries, isSelected: false, onSelect: mockOnSelect, onManualMatch: mockOnManualMatch, onImport: mockOnImport }) }) }));
        const searchButton = screen.getByRole('button', { name: /search/i });
        fireEvent.click(searchButton);
        expect(mockOnManualMatch).toHaveBeenCalledWith(unmatchedSeries);
    });
    it('calls onImport when import button is clicked', () => {
        render(_jsx("table", { children: _jsx("tbody", { children: _jsx(ImportSeriesRow, { series: matchedSeries, isSelected: false, onSelect: mockOnSelect, onManualMatch: mockOnManualMatch, onImport: mockOnImport }) }) }));
        const importButton = screen.getByRole('button', { name: /import/i });
        fireEvent.click(importButton);
        expect(mockOnImport).toHaveBeenCalledWith(matchedSeries);
    });
    it('shows checkbox as checked when isSelected is true', () => {
        render(_jsx("table", { children: _jsx("tbody", { children: _jsx(ImportSeriesRow, { series: matchedSeries, isSelected: true, onSelect: mockOnSelect, onManualMatch: mockOnManualMatch, onImport: mockOnImport }) }) }));
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeChecked();
    });
    it('shows edit button for matched series', () => {
        render(_jsx("table", { children: _jsx("tbody", { children: _jsx(ImportSeriesRow, { series: matchedSeries, isSelected: false, onSelect: mockOnSelect, onManualMatch: mockOnManualMatch, onImport: mockOnImport }) }) }));
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });
});
//# sourceMappingURL=ImportSeriesRow.test.js.map