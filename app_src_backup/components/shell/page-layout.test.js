import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageLayout } from './PageLayout';
describe('PageLayout', () => {
    it('renders page header, sidebar, mobile nav, and main content area', () => {
        render(_jsx(PageLayout, { pathname: "/queue", sidebarCollapsed: false, onToggleSidebar: vi.fn(), header: _jsx("div", { children: "Page Header" }), children: _jsx("div", { children: "Queue content" }) }));
        expect(screen.getByText('Page Header')).toBeInTheDocument();
        expect(screen.getByRole('navigation', { name: /sidebar navigation/i })).toBeInTheDocument();
        expect(screen.getByRole('navigation', { name: /mobile navigation/i })).toBeInTheDocument();
        expect(screen.getByRole('main')).toHaveTextContent('Queue content');
    });
    it('renders mobile navigation with icons and labels', () => {
        render(_jsx(PageLayout, { pathname: "/indexers", sidebarCollapsed: false, onToggleSidebar: vi.fn(), header: _jsx("div", { children: "Header" }), children: _jsx("div", { children: "Content" }) }));
        const mobileNav = screen.getByRole('navigation', { name: /mobile navigation/i });
        expect(mobileNav).toBeInTheDocument();
        // Check for icons (Lucide icons render as SVGs)
        const icons = mobileNav.querySelectorAll('svg');
        expect(icons.length).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=page-layout.test.js.map