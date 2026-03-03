import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageToolbar, PageToolbarSection } from './PageToolbar';
import * as Icons from 'lucide-react';
describe('PageToolbar', () => {
    it('renders PageToolbar with children', () => {
        render(_jsx(PageToolbar, { children: _jsx("span", { children: "Test content" }) }));
        const toolbar = screen.getByText('Test content');
        expect(toolbar).toBeInTheDocument();
    });
    it('applies correct CSS classes to PageToolbar', () => {
        const { container } = render(_jsx(PageToolbar, { children: _jsx("span", { children: "Content" }) }));
        const toolbar = container.firstChild;
        expect(toolbar).toHaveClass('flex');
        expect(toolbar).toHaveClass('flex-wrap');
        expect(toolbar).toHaveClass('items-center');
        expect(toolbar).toHaveClass('justify-between');
        expect(toolbar).toHaveClass('gap-2');
        expect(toolbar).toHaveClass('rounded-md');
        expect(toolbar).toHaveClass('border');
        expect(toolbar).toHaveClass('border-border-subtle');
        expect(toolbar).toHaveClass('bg-surface-1');
        expect(toolbar).toHaveClass('px-3');
        expect(toolbar).toHaveClass('py-2');
    });
    it('renders multiple children correctly', () => {
        render(_jsxs(PageToolbar, { children: [_jsx("span", { children: "First" }), _jsx("span", { children: "Second" }), _jsx("span", { children: "Third" })] }));
        expect(screen.getByText('First')).toBeInTheDocument();
        expect(screen.getByText('Second')).toBeInTheDocument();
        expect(screen.getByText('Third')).toBeInTheDocument();
    });
    it('renders complex nested content', () => {
        render(_jsxs(PageToolbar, { children: [_jsx("div", { children: _jsx("span", { children: "Nested content" }) }), _jsx("button", { type: "button", children: "Action" })] }));
        expect(screen.getByText('Nested content')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });
    it('has semantic HTML structure', () => {
        const { container } = render(_jsx(PageToolbar, { children: _jsx("span", { children: "Content" }) }));
        const toolbar = container.firstChild;
        expect(toolbar.tagName).toBe('DIV');
    });
});
describe('PageToolbarSection', () => {
    it('renders PageToolbarSection with children', () => {
        render(_jsx(PageToolbarSection, { children: _jsx("span", { children: "Section content" }) }));
        const section = screen.getByText('Section content');
        expect(section).toBeInTheDocument();
    });
    it('renders PageToolbarSection with left alignment (default)', () => {
        const { container } = render(_jsx(PageToolbarSection, { children: _jsx("span", { children: "Left aligned" }) }));
        const section = container.firstChild;
        expect(section).toHaveClass('flex');
        expect(section).toHaveClass('flex-wrap');
        expect(section).toHaveClass('items-center');
        expect(section).toHaveClass('gap-2');
        expect(section).toHaveClass('justify-start');
    });
    it('renders PageToolbarSection with right alignment', () => {
        const { container } = render(_jsx(PageToolbarSection, { align: "right", children: _jsx("span", { children: "Right aligned" }) }));
        const section = container.firstChild;
        expect(section).toHaveClass('flex');
        expect(section).toHaveClass('flex-wrap');
        expect(section).toHaveClass('items-center');
        expect(section).toHaveClass('gap-2');
        expect(section).toHaveClass('justify-end');
    });
    it('does not have justify-start when align is right', () => {
        const { container } = render(_jsx(PageToolbarSection, { align: "right", children: _jsx("span", { children: "Right" }) }));
        const section = container.firstChild;
        expect(section.className).not.toContain('justify-start');
    });
    it('does not have justify-end when align is left', () => {
        const { container } = render(_jsx(PageToolbarSection, { align: "left", children: _jsx("span", { children: "Left" }) }));
        const section = container.firstChild;
        expect(section.className).not.toContain('justify-end');
    });
    it('does not have justify-end when align is not specified (default left)', () => {
        const { container } = render(_jsx(PageToolbarSection, { children: _jsx("span", { children: "Default" }) }));
        const section = container.firstChild;
        expect(section.className).not.toContain('justify-end');
    });
    it('renders multiple children in section', () => {
        render(_jsxs(PageToolbarSection, { children: [_jsx("button", { type: "button", "aria-label": "First", children: "First" }), _jsx("button", { type: "button", "aria-label": "Second", children: "Second" }), _jsx("button", { type: "button", "aria-label": "Third", children: "Third" })] }));
        expect(screen.getByRole('button', { name: 'First' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Second' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Third' })).toBeInTheDocument();
    });
    it('has semantic HTML structure', () => {
        const { container } = render(_jsx(PageToolbarSection, { children: _jsx("span", { children: "Content" }) }));
        const section = container.firstChild;
        expect(section.tagName).toBe('DIV');
    });
});
describe('PageToolbar and PageToolbarSection integration', () => {
    it('combines PageToolbar and PageToolbarSection correctly', () => {
        const { container } = render(_jsx(PageToolbar, { children: _jsx(PageToolbarSection, { children: _jsx("span", { children: "Left section" }) }) }));
        const toolbar = container.firstChild;
        expect(toolbar).toBeInTheDocument();
        expect(screen.getByText('Left section')).toBeInTheDocument();
    });
    it('renders multiple sections in toolbar', () => {
        const { container } = render(_jsxs(PageToolbar, { children: [_jsx(PageToolbarSection, { align: "left", children: _jsx("span", { children: "Left content" }) }), _jsx(PageToolbarSection, { align: "right", children: _jsx("span", { children: "Right content" }) })] }));
        const toolbar = container.firstChild;
        expect(toolbar).toBeInTheDocument();
        expect(screen.getByText('Left content')).toBeInTheDocument();
        expect(screen.getByText('Right content')).toBeInTheDocument();
    });
    it('maintains flex layout between toolbar and sections', () => {
        const { container } = render(_jsxs(PageToolbar, { children: [_jsx(PageToolbarSection, { align: "left", children: _jsx("span", { children: "Left" }) }), _jsx(PageToolbarSection, { align: "right", children: _jsx("span", { children: "Right" }) })] }));
        const toolbar = container.firstChild;
        expect(toolbar.className).toContain('justify-between');
    });
    it('handles nested toolbar content with multiple sections', () => {
        render(_jsxs(PageToolbar, { children: [_jsxs(PageToolbarSection, { align: "left", children: [_jsx("button", { type: "button", "aria-label": "Filter", children: "Filter" }), _jsx("button", { type: "button", "aria-label": "Sort", children: "Sort" })] }), _jsxs(PageToolbarSection, { align: "right", children: [_jsx("button", { type: "button", "aria-label": "Add", children: "Add" }), _jsx("button", { type: "button", "aria-label": "Refresh", children: "Refresh" })] })] }));
        expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sort' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    });
    it('supports icons in sections', () => {
        render(_jsx(PageToolbar, { children: _jsx(PageToolbarSection, { children: _jsx(Icons.Search, { "data-testid": "search-icon" }) }) }));
        expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });
    it('renders realistic toolbar with multiple elements', () => {
        render(_jsxs(PageToolbar, { children: [_jsxs(PageToolbarSection, { align: "left", children: [_jsxs("button", { type: "button", "aria-label": "Search", children: [_jsx(Icons.Search, { "data-testid": "search" }), _jsx("span", { children: "Search" })] }), _jsxs("button", { type: "button", "aria-label": "Filter", children: [_jsx(Icons.Filter, { "data-testid": "filter" }), _jsx("span", { children: "Filter" })] })] }), _jsxs(PageToolbarSection, { align: "right", children: [_jsxs("button", { type: "button", "aria-label": "Add New", children: [_jsx(Icons.Plus, { "data-testid": "plus" }), _jsx("span", { children: "Add New" })] }), _jsx("button", { type: "button", "aria-label": "View Options", children: _jsx(Icons.MoreHorizontal, { "data-testid": "more" }) })] })] }));
        expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add New' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'View Options' })).toBeInTheDocument();
        expect(screen.getByTestId('search')).toBeInTheDocument();
        expect(screen.getByTestId('filter')).toBeInTheDocument();
        expect(screen.getByTestId('plus')).toBeInTheDocument();
        expect(screen.getByTestId('more')).toBeInTheDocument();
    });
    it('wraps content on small screens with flex-wrap', () => {
        const { container } = render(_jsxs(PageToolbar, { children: [_jsxs(PageToolbarSection, { align: "left", children: [_jsx("button", { type: "button", "aria-label": "Button 1", children: "Button 1" }), _jsx("button", { type: "button", "aria-label": "Button 2", children: "Button 2" }), _jsx("button", { type: "button", "aria-label": "Button 3", children: "Button 3" }), _jsx("button", { type: "button", "aria-label": "Button 4", children: "Button 4" })] }), _jsx(PageToolbarSection, { align: "right", children: _jsx("button", { type: "button", "aria-label": "Button 5", children: "Button 5" }) })] }));
        const toolbar = container.firstChild;
        const sections = container.querySelectorAll('div > div');
        expect(toolbar.className).toContain('flex-wrap');
        sections.forEach((section) => {
            expect(section).toHaveClass('flex-wrap');
        });
    });
    it('applies gap spacing between sections', () => {
        const { container } = render(_jsxs(PageToolbar, { children: [_jsx(PageToolbarSection, { children: _jsx("span", { children: "Section 1" }) }), _jsx(PageToolbarSection, { children: _jsx("span", { children: "Section 2" }) })] }));
        const toolbar = container.firstChild;
        expect(toolbar.className).toContain('gap-2');
    });
    it('applies gap spacing within sections', () => {
        const { container } = render(_jsx(PageToolbar, { children: _jsxs(PageToolbarSection, { children: [_jsx("button", { type: "button", "aria-label": "Button 1", children: "Button 1" }), _jsx("button", { type: "button", "aria-label": "Button 2", children: "Button 2" })] }) }));
        const section = container.querySelector('div > div');
        expect(section.className).toContain('gap-2');
    });
});
//# sourceMappingURL=PageToolbar.test.js.map