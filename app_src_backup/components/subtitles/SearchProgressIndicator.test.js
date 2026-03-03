import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchProgressIndicator } from './SearchProgressIndicator';
describe('SearchProgressIndicator', () => {
    it('should not render when not searching', () => {
        const { container } = render(_jsx(SearchProgressIndicator, { isSearching: false, progress: { total: 0, completed: 0, failed: 0 } }));
        expect(container.firstChild).toBeNull();
    });
    it('should render when searching', () => {
        render(_jsx(SearchProgressIndicator, { isSearching: true, progress: { total: 10, completed: 5, failed: 1 } }));
        expect(screen.getByText(/Searching for subtitles/i)).toBeInTheDocument();
        expect(screen.getByText(/5 of 10 completed, 1 failed/i)).toBeInTheDocument();
        // There are two 50% elements - one in header, one from ProgressBar
        expect(screen.getAllByText(/50%/i)).toHaveLength(2);
    });
    it('should calculate correct percentage', () => {
        render(_jsx(SearchProgressIndicator, { isSearching: true, progress: { total: 20, completed: 10, failed: 0 } }));
        expect(screen.getByText(/50%/i)).toBeInTheDocument();
    });
    it('should handle zero total', () => {
        render(_jsx(SearchProgressIndicator, { isSearching: true, progress: { total: 0, completed: 0, failed: 0 } }));
        expect(screen.getByText(/0%/i)).toBeInTheDocument();
    });
    it('should not show failed count when zero', () => {
        render(_jsx(SearchProgressIndicator, { isSearching: true, progress: { total: 10, completed: 5, failed: 0 } }));
        expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
        expect(screen.getByText(/5 of 10 completed/i)).toBeInTheDocument();
    });
    it('should call onDismiss when button is clicked', () => {
        const onDismiss = vi.fn();
        render(_jsx(SearchProgressIndicator, { isSearching: true, progress: { total: 10, completed: 5, failed: 0 }, onDismiss: onDismiss }));
        const dismissButton = screen.getByRole('button', { name: /dismiss progress/i });
        fireEvent.click(dismissButton);
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });
    it('should not show dismiss button when onDismiss not provided', () => {
        render(_jsx(SearchProgressIndicator, { isSearching: true, progress: { total: 10, completed: 5, failed: 0 } }));
        expect(screen.queryByRole('button', { name: /dismiss progress/i })).not.toBeInTheDocument();
    });
});
//# sourceMappingURL=SearchProgressIndicator.test.js.map