import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MovieFileTable } from './MovieFileTable';
const mockFiles = [
    {
        id: 1,
        path: '/Movies/Test/Test.Movie.2024.1080p.BluRay.x264.mkv',
        quality: 'Bluray-1080p',
        size: 2_147_483_648,
        language: 'English',
    },
    {
        id: 2,
        path: '/Movies/Test/Test.Movie.2024.720p.WEB-DL.x264.mkv',
        quality: 'WEB-DL-720p',
        size: 1_073_741_824,
        language: 'English',
    },
];
describe('MovieFileTable', () => {
    it('renders list of movie files', () => {
        render(_jsx(MovieFileTable, { files: mockFiles }));
        expect(screen.getByText('Path')).toBeInTheDocument();
        expect(screen.getByText('Quality')).toBeInTheDocument();
        expect(screen.getByText('Size')).toBeInTheDocument();
        expect(screen.getByText('Language')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
        expect(screen.getByText(mockFiles[0].path)).toBeInTheDocument();
        expect(screen.getByText('2.0 GB')).toBeInTheDocument();
        expect(screen.getAllByText('English')).toHaveLength(2);
    });
    it('calls onEdit when edit button is clicked', async () => {
        const handleEdit = vi.fn();
        render(_jsx(MovieFileTable, { files: mockFiles, onEdit: handleEdit }));
        const editButtons = screen.getAllByRole('button', { name: /Edit/i });
        fireEvent.click(editButtons[0]);
        expect(handleEdit).toHaveBeenCalledWith(mockFiles[0]);
    });
    it('calls onDelete when delete button is clicked', async () => {
        const handleDelete = vi.fn();
        render(_jsx(MovieFileTable, { files: mockFiles, onDelete: handleDelete }));
        const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
        fireEvent.click(deleteButtons[0]);
        expect(handleDelete).toHaveBeenCalledWith(mockFiles[0]);
    });
    it('shows empty message when no files', () => {
        render(_jsx(MovieFileTable, { files: [] }));
        expect(screen.getByText('No movie files found')).toBeInTheDocument();
    });
    it('does not show edit/delete buttons when handlers not provided', () => {
        render(_jsx(MovieFileTable, { files: mockFiles }));
        expect(screen.queryByRole('button', { name: /Edit/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument();
    });
});
//# sourceMappingURL=MovieFileTable.test.js.map