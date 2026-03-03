import { jsx as _jsx } from "react/jsx-runtime";
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PageToolbarButton } from './PageToolbarButton';
import * as Icons from 'lucide-react';
describe('PageToolbarButton', () => {
    it('renders button with icon and label', () => {
        render(_jsx(PageToolbarButton, { icon: _jsx(Icons.Search, { className: "h-4 w-4" }), label: "Search" }));
        expect(screen.getByRole('button')).toBeInTheDocument();
        expect(screen.getByLabelText('Search')).toBeInTheDocument();
    });
    it('renders custom aria label when provided', () => {
        render(_jsx(PageToolbarButton, { icon: _jsx(Icons.Search, { className: "h-4 w-4" }), label: "Search", ariaLabel: "Search movies" }));
        expect(screen.getByRole('button', { name: 'Search movies' })).toBeInTheDocument();
    });
    it('calls onClick when clicked', () => {
        const handleClick = vi.fn();
        render(_jsx(PageToolbarButton, { icon: _jsx(Icons.Search, { className: "h-4 w-4" }), label: "Search", onClick: handleClick }));
        fireEvent.click(screen.getByRole('button'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });
    it('is disabled when disabled prop is true', () => {
        render(_jsx(PageToolbarButton, { icon: _jsx(Icons.Search, { className: "h-4 w-4" }), label: "Search", disabled: true }));
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
        // Check that the classes contain the disabled state classes
        expect(button.className).toContain('cursor-not-allowed');
        expect(button.className).toContain('opacity-50');
    });
    it('does not call onClick when disabled', () => {
        const handleClick = vi.fn();
        render(_jsx(PageToolbarButton, { icon: _jsx(Icons.Search, { className: "h-4 w-4" }), label: "Search", onClick: handleClick, disabled: true }));
        fireEvent.click(screen.getByRole('button'));
        expect(handleClick).not.toHaveBeenCalled();
    });
    it('shows loading state with spinning icon', () => {
        render(_jsx(PageToolbarButton, { icon: _jsx(Icons.RefreshCw, { className: "h-4 w-4" }), label: "Refresh", loading: true }));
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-busy', 'true');
        expect(button).toBeDisabled();
        expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
    it('shows active state when isActive prop is true', () => {
        render(_jsx(PageToolbarButton, { icon: _jsx(Icons.Grid, { className: "h-4 w-4" }), label: "Grid View", isActive: true }));
        const button = screen.getByRole('button');
        expect(button).toHaveClass('bg-accent-primary/20', 'text-accent-primary');
    });
    it('hides label on small screens', () => {
        render(_jsx(PageToolbarButton, { icon: _jsx(Icons.Search, { className: "h-4 w-4" }), label: "Search" }));
        const label = screen.getByText('Search');
        expect(label).toHaveClass('hidden', 'sm:inline');
    });
    it('has focus ring on keyboard focus', () => {
        render(_jsx(PageToolbarButton, { icon: _jsx(Icons.Search, { className: "h-4 w-4" }), label: "Search" }));
        const button = screen.getByRole('button');
        expect(button).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-accent-primary/50');
    });
    it('has transition effects', () => {
        render(_jsx(PageToolbarButton, { icon: _jsx(Icons.Search, { className: "h-4 w-4" }), label: "Search" }));
        const button = screen.getByRole('button');
        expect(button).toHaveClass('transition-colors');
    });
    it('shows hover effect on non-active state', () => {
        render(_jsx(PageToolbarButton, { icon: _jsx(Icons.Search, { className: "h-4 w-4" }), label: "Search", isActive: false }));
        const button = screen.getByRole('button');
        expect(button).toHaveClass('hover:bg-surface-3', 'hover:text-text-primary');
    });
});
//# sourceMappingURL=PageToolbarButton.test.js.map