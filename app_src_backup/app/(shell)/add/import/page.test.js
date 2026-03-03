import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ImportSeriesPage from './page';
// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));
// Mock the API client
const mockScanFolder = vi.fn();
const mockImportSeries = vi.fn();
const mockBulkImportSeries = vi.fn();
vi.mock('@/lib/api/client', () => ({
    getApiClients: () => ({
        importApi: {
            scanFolder: mockScanFolder,
            importSeries: mockImportSeries,
            bulkImportSeries: mockBulkImportSeries,
        },
    }),
}));
// Mock the ToastProvider
const mockPushToast = vi.fn();
vi.mock('@/components/providers/ToastProvider', () => ({
    useToast: () => ({
        pushToast: mockPushToast,
    }),
}));
describe('ImportSeriesPage', () => {
    beforeEach(() => {
        mockPush.mockClear();
        mockScanFolder.mockClear();
        mockImportSeries.mockClear();
        mockBulkImportSeries.mockClear();
        mockPushToast.mockClear();
    });
    it('renders the import series page header', () => {
        render(_jsx(ImportSeriesPage, {}));
        expect(screen.getByRole('heading', { name: 'Import Series' })).toBeInTheDocument();
        expect(screen.getByText('Scan your existing TV series library and import them into Mediarr.')).toBeInTheDocument();
    });
    it('renders the folder scanner component', () => {
        render(_jsx(ImportSeriesPage, {}));
        expect(screen.getByText('Import Series from Disk')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('/path/to/tv/folder')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /scan/i })).toBeInTheDocument();
    });
    it('renders back to add media button', () => {
        render(_jsx(ImportSeriesPage, {}));
        const backButton = screen.getByRole('button', { name: /back to add media/i });
        expect(backButton).toBeInTheDocument();
        fireEvent.click(backButton);
        expect(mockPush).toHaveBeenCalledWith('/add');
    });
    it('starts scanning when scan button is clicked', async () => {
        mockScanFolder.mockResolvedValue([]);
        render(_jsx(ImportSeriesPage, {}));
        const input = screen.getByPlaceholderText('/path/to/tv/folder');
        fireEvent.change(input, { target: { value: '/media/tv' } });
        const scanButton = screen.getByRole('button', { name: /scan/i });
        fireEvent.click(scanButton);
        expect(mockScanFolder).toHaveBeenCalledWith({ path: '/media/tv' });
        // Should show scanning state
        await waitFor(() => {
            expect(screen.getByText('Scanning folder...')).toBeInTheDocument();
        });
    });
    it('shows results after scanning', async () => {
        const mockSeries = [
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
        ];
        mockScanFolder.mockResolvedValue(mockSeries);
        render(_jsx(ImportSeriesPage, {}));
        const input = screen.getByPlaceholderText('/path/to/tv/folder');
        fireEvent.change(input, { target: { value: '/media/tv' } });
        const scanButton = screen.getByRole('button', { name: /scan/i });
        fireEvent.click(scanButton);
        // Wait for scan to complete and show results
        await waitFor(() => {
            expect(screen.getByText('Detected Series')).toBeInTheDocument();
        }, { timeout: 3000 });
        expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
    });
    it('shows import configuration panel after scan', async () => {
        mockScanFolder.mockResolvedValue([
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
        ]);
        render(_jsx(ImportSeriesPage, {}));
        const input = screen.getByPlaceholderText('/path/to/tv/folder');
        fireEvent.change(input, { target: { value: '/media/tv' } });
        const scanButton = screen.getByRole('button', { name: /scan/i });
        fireEvent.click(scanButton);
        await waitFor(() => {
            expect(screen.getByText('Import Configuration')).toBeInTheDocument();
        }, { timeout: 3000 });
    });
    it('shows empty state when no series are found', async () => {
        mockScanFolder.mockResolvedValue([]);
        render(_jsx(ImportSeriesPage, {}));
        const input = screen.getByPlaceholderText('/path/to/tv/folder');
        fireEvent.change(input, { target: { value: '/empty/path' } });
        const scanButton = screen.getByRole('button', { name: /scan/i });
        fireEvent.click(scanButton);
        // Wait for scan to complete
        await waitFor(() => {
            expect(screen.getByText('No series detected')).toBeInTheDocument();
        }, { timeout: 3000 });
    });
    it('has correct page structure', () => {
        render(_jsx(ImportSeriesPage, {}));
        // Check for header section
        const header = screen.getByRole('heading', { name: 'Import Series' });
        expect(header).toBeInTheDocument();
        // Check for folder scanner
        expect(screen.getByText('Import Series from Disk')).toBeInTheDocument();
    });
    it('imports a single series', async () => {
        const mockSeries = [
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
        ];
        mockScanFolder.mockResolvedValue(mockSeries);
        mockImportSeries.mockResolvedValue({ id: 1 });
        render(_jsx(ImportSeriesPage, {}));
        const input = screen.getByPlaceholderText('/path/to/tv/folder');
        fireEvent.change(input, { target: { value: '/media/tv' } });
        const scanButton = screen.getByRole('button', { name: /scan/i });
        fireEvent.click(scanButton);
        await waitFor(() => {
            expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
        }, { timeout: 3000 });
        const importButton = screen.getAllByRole('button', { name: 'Import' })[0];
        fireEvent.click(importButton);
        await waitFor(() => {
            expect(mockImportSeries).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=page.test.js.map