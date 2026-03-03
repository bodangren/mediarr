import { jsx as _jsx } from "react/jsx-runtime";
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageContentBody } from './PageContentBody';
describe('PageContentBody', () => {
    it('renders children correctly', () => {
        render(_jsx(PageContentBody, { children: _jsx("div", { children: "Test content" }) }));
        expect(screen.getByText('Test content')).toBeInTheDocument();
    });
    it('applies default classes', () => {
        const { container } = render(_jsx(PageContentBody, { children: _jsx("div", { children: "Content" }) }));
        const body = container.firstChild;
        expect(body).toHaveClass('overflow-y-auto', 'scroll-smooth', 'scrollbar-thin');
    });
    it('applies custom className', () => {
        const { container } = render(_jsx(PageContentBody, { className: "custom-class", children: _jsx("div", { children: "Content" }) }));
        const body = container.firstChild;
        expect(body).toHaveClass('custom-class');
    });
    it('has scrollbar styling classes', () => {
        const { container } = render(_jsx(PageContentBody, { children: _jsx("div", { children: "Content" }) }));
        const body = container.firstChild;
        expect(body).toHaveClass('scrollbar-thumb-border-subtle', 'scrollbar-track-transparent', 'hover:scrollbar-thumb-text-muted');
    });
});
//# sourceMappingURL=PageContentBody.test.js.map