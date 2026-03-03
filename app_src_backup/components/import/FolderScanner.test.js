import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FolderScanner } from './FolderScanner';
describe('FolderScanner', () => {
    const defaultScanProgress = {
        status: 'idle',
        scannedFolders: 0,
    };
    const mockOnScan = vi.fn();
    beforeEach(() => {
        mockOnScan.mockClear();
    });
    it('renders the scanner with default path', () => {
        render(_jsx(FolderScanner, { scanProgress: defaultScanProgress, onScan: mockOnScan }));
        expect(screen.getByText('Import Series from Disk')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('/path/to/tv/folder')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /scan/i })).toBeInTheDocument();
    });
    it('calls onScan with entered path when scan button is clicked', async () => {
        render(_jsx(FolderScanner, { scanProgress: defaultScanProgress, onScan: mockOnScan }));
        const input = screen.getByPlaceholderText('/path/to/tv/folder');
        fireEvent.change(input, { target: { value: '/media/tv' } });
        const scanButton = screen.getByRole('button', { name: /scan/i });
        fireEvent.click(scanButton);
        expect(mockOnScan).toHaveBeenCalledWith('/media/tv');
    });
    it('disables scan button while scanning', () => {
        const scanningProgress = {
            status: 'scanning',
            currentPath: '/media/tv',
            scannedFolders: 5,
        };
        render(_jsx(FolderScanner, { scanProgress: scanningProgress, onScan: mockOnScan }));
        const scanButton = screen.getByRole('button', { name: /scanning/i });
        expect(scanButton).toBeDisabled();
        expect(screen.getByText('Scanning...')).toBeInTheDocument();
    });
    it('shows scanning progress indicator', () => {
        const scanningProgress = {
            status: 'scanning',
            currentPath: '/media/tv/Breaking Bad',
            scannedFolders: 3,
        };
        render(_jsx(FolderScanner, { scanProgress: scanningProgress, onScan: mockOnScan }));
        expect(screen.getByText('Scanning folder...')).toBeInTheDocument();
        expect(screen.getByText('/media/tv/Breaking Bad')).toBeInTheDocument();
    });
    it('shows error message when scan fails', () => {
        const errorProgress = {
            status: 'error',
            scannedFolders: 0,
            errorMessage: 'Permission denied',
        };
        render(_jsx(FolderScanner, { scanProgress: errorProgress, onScan: mockOnScan }));
        expect(screen.getByText('Scan Error')).toBeInTheDocument();
        expect(screen.getByText('Permission denied')).toBeInTheDocument();
    });
    it('disables input while scanning', () => {
        const scanningProgress = {
            status: 'scanning',
            currentPath: '/media/tv',
            scannedFolders: 5,
        };
        render(_jsx(FolderScanner, { scanProgress: scanningProgress, onScan: mockOnScan }));
        const input = screen.getByPlaceholderText('/path/to/tv/folder');
        expect(input).toBeDisabled();
    });
    it('does not call onScan when path is empty', () => {
        render(_jsx(FolderScanner, { scanProgress: defaultScanProgress, onScan: mockOnScan, defaultPath: "" }));
        const scanButton = screen.getByRole('button', { name: /scan/i });
        fireEvent.click(scanButton);
        expect(mockOnScan).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=FolderScanner.test.js.map