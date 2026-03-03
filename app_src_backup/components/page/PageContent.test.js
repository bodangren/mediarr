import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageContent } from './PageContent';
describe('PageContent', () => {
    it('renders children without title', () => {
        render(_jsx(PageContent, { children: _jsx("div", { children: "Test content" }) }));
        expect(screen.getByText('Test content')).toBeInTheDocument();
        expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    });
    it('renders title when provided', () => {
        render(_jsx(PageContent, { title: "Page Title", children: _jsx("div", { children: "Content" }) }));
        const heading = screen.getByRole('heading', { level: 1, name: 'Page Title' });
        expect(heading).toBeInTheDocument();
    });
    it('has correct heading styles', () => {
        const { container } = render(_jsx(PageContent, { title: "Page Title", children: _jsx("div", { children: "Content" }) }));
        const heading = container.querySelector('h1');
        expect(heading).toHaveClass('text-2xl', 'font-semibold', 'text-text-primary', 'mb-4');
    });
    it('applies default layout classes', () => {
        const { container } = render(_jsx(PageContent, { children: _jsx("div", { children: "Content" }) }));
        const content = container.firstChild;
        expect(content).toHaveClass('flex', 'flex-col');
    });
    it('applies custom className', () => {
        const { container } = render(_jsx(PageContent, { className: "custom-class", children: _jsx("div", { children: "Content" }) }));
        const content = container.firstChild;
        expect(content).toHaveClass('custom-class');
    });
    it('renders multiple children', () => {
        render(_jsxs(PageContent, { children: [_jsx("div", { children: "First child" }), _jsx("div", { children: "Second child" }), _jsx("div", { children: "Third child" })] }));
        expect(screen.getByText('First child')).toBeInTheDocument();
        expect(screen.getByText('Second child')).toBeInTheDocument();
        expect(screen.getByText('Third child')).toBeInTheDocument();
    });
});
//# sourceMappingURL=PageContent.test.js.map