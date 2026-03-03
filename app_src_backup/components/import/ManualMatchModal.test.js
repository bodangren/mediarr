import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ManualMatchModal } from './ManualMatchModal';
describe('ManualMatchModal', () => {
    const mockSeries = {
        id: 1,
        folderName: 'The Office US',
        path: '/media/tv/The Office US',
        fileCount: 201,
        matchedSeriesId: null,
        status: 'unmatched',
    };
    // Use a series name that matches the mock search results
    const mockSeriesWithMatch = {
        id: 1,
        folderName: 'The Office',
        path: '/media/tv/The Office',
        fileCount: 201,
        matchedSeriesId: null,
        status: 'unmatched',
    };
    const mockSearchResult = {
        id: 101,
        title: 'The Office',
        year: 2005,
        overview: 'A mockumentary on a group of typical office workers.',
        network: 'NBC',
        status: 'ended',
        tvdbId: 73244,
    };
    const mockOnClose = vi.fn();
    const mockOnMatch = vi.fn();
    beforeEach(() => {
        mockOnClose.mockClear();
        mockOnMatch.mockClear();
    });
    it('does not render when isOpen is false', () => {
        render(_jsx(ManualMatchModal, { isOpen: false, onClose: mockOnClose, series: null, onMatch: mockOnMatch }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    it('renders modal with series information when open', async () => {
        render(_jsx(ManualMatchModal, { isOpen: true, onClose: mockOnClose, series: mockSeries, onMatch: mockOnMatch }));
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(screen.getByText('Match: The Office US')).toBeInTheDocument();
            expect(screen.getByText('/media/tv/The Office US')).toBeInTheDocument();
            expect(screen.getByText('201 files found')).toBeInTheDocument();
        });
    });
    it('renders search input', async () => {
        render(_jsx(ManualMatchModal, { isOpen: true, onClose: mockOnClose, series: mockSeries, onMatch: mockOnMatch }));
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Search for series...')).toBeInTheDocument();
        });
    });
    it('shows search results when searching with matching term', async () => {
        render(_jsx(ManualMatchModal, { isOpen: true, onClose: mockOnClose, series: mockSeriesWithMatch, onMatch: mockOnMatch }));
        // Wait for auto-search with "The Office" which matches mock data
        await waitFor(() => {
            expect(screen.getByText('The Office')).toBeInTheDocument();
            expect(screen.getByText('(2005)')).toBeInTheDocument();
        }, { timeout: 3000 });
    });
    it('allows selecting a search result', async () => {
        render(_jsx(ManualMatchModal, { isOpen: true, onClose: mockOnClose, series: mockSeriesWithMatch, onMatch: mockOnMatch }));
        await waitFor(() => {
            expect(screen.getByText('The Office')).toBeInTheDocument();
        }, { timeout: 3000 });
        // Click on a search result
        fireEvent.click(screen.getByText('The Office'));
        // Checkmark should appear
        expect(screen.getByText('✓')).toBeInTheDocument();
    });
    it('calls onMatch when confirm button is clicked with selection', async () => {
        render(_jsx(ManualMatchModal, { isOpen: true, onClose: mockOnClose, series: mockSeriesWithMatch, onMatch: mockOnMatch }));
        await waitFor(() => {
            expect(screen.getByText('The Office')).toBeInTheDocument();
        }, { timeout: 3000 });
        // Select a result
        fireEvent.click(screen.getByText('The Office'));
        // Click confirm
        fireEvent.click(screen.getByRole('button', { name: /confirm match/i }));
        expect(mockOnMatch).toHaveBeenCalledWith(1, expect.objectContaining({
            id: 101,
            title: 'The Office',
        }));
    });
    it('disables confirm button when nothing is selected', async () => {
        render(_jsx(ManualMatchModal, { isOpen: true, onClose: mockOnClose, series: mockSeries, onMatch: mockOnMatch }));
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
        const confirmButton = screen.getByRole('button', { name: /confirm match/i });
        expect(confirmButton).toBeDisabled();
    });
    it('calls onClose when cancel button is clicked', async () => {
        render(_jsx(ManualMatchModal, { isOpen: true, onClose: mockOnClose, series: mockSeries, onMatch: mockOnMatch }));
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
        expect(mockOnClose).toHaveBeenCalled();
    });
    it('shows network and status information for results when available', async () => {
        render(_jsx(ManualMatchModal, { isOpen: true, onClose: mockOnClose, series: mockSeriesWithMatch, onMatch: mockOnMatch }));
        // Wait for the search to complete and results to appear
        await waitFor(() => {
            expect(screen.getByText('The Office')).toBeInTheDocument();
        }, { timeout: 3000 });
        // Then check for network and status - they should be visible
        // Use getAllByText since there might be multiple elements with network/status
        const elements = screen.getAllByText((content, element) => {
            return element?.textContent?.includes('NBC') ?? false;
        });
        expect(elements.length).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=ManualMatchModal.test.js.map