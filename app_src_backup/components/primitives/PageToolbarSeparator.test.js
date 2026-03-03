import { jsx as _jsx } from "react/jsx-runtime";
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageToolbarSeparator } from './PageToolbarSeparator';
describe('PageToolbarSeparator', () => {
    it('renders separator element', () => {
        render(_jsx(PageToolbarSeparator, {}));
        const separator = screen.getByRole('separator');
        expect(separator).toBeInTheDocument();
    });
    it('has correct dimensions', () => {
        const { container } = render(_jsx(PageToolbarSeparator, {}));
        const separator = container.firstChild;
        expect(separator).toHaveClass('h-6', 'w-px');
    });
    it('has correct color', () => {
        const { container } = render(_jsx(PageToolbarSeparator, {}));
        const separator = container.firstChild;
        expect(separator).toHaveClass('bg-border-subtle');
    });
    it('has separator role for accessibility', () => {
        render(_jsx(PageToolbarSeparator, {}));
        expect(screen.getByRole('separator')).toBeInTheDocument();
    });
});
//# sourceMappingURL=PageToolbarSeparator.test.js.map