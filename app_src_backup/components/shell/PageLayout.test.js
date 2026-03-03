import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageLayout } from '@/components/shell/PageLayout';
import { NAV_ITEMS } from '@/lib/navigation';
vi.mock('@/components/shell/PageSidebar', () => ({
    PageSidebar: () => _jsx("div", { "data-testid": "page-sidebar", children: "PageSidebar" }),
}));
describe('PageLayout mobile navigation', () => {
    it('renders mobile bottom navigation with 4 primary items and a More button', () => {
        const { container } = render(_jsx(PageLayout, { pathname: "/", sidebarCollapsed: false, onToggleSidebar: vi.fn(), header: _jsx("div", { children: "Header" }), children: _jsx("div", { children: "Content" }) }));
        // Should have mobile bottom nav
        const mobileNav = container.querySelector('[aria-label="Mobile Navigation"]');
        expect(mobileNav).toBeInTheDocument();
        // Should have 5 slots (4 primary items + 1 More button)
        const navItems = mobileNav?.querySelectorAll('li');
        expect(navItems?.length).toBe(5);
        // First 4 items should be navigation links
        expect(screen.getByText('Series')).toBeInTheDocument();
        expect(screen.getByText('Movies')).toBeInTheDocument();
        expect(screen.getByText('Indexers')).toBeInTheDocument();
        expect(screen.getByText('Stats')).toBeInTheDocument();
        // 5th item should be More button
        expect(screen.getByRole('button', { name: 'More navigation options' })).toBeInTheDocument();
        expect(screen.getByText('More')).toBeInTheDocument();
    });
    it('opens More overflow modal when More button is clicked', async () => {
        render(_jsx(PageLayout, { pathname: "/", sidebarCollapsed: false, onToggleSidebar: vi.fn(), header: _jsx("div", { children: "Header" }), children: _jsx("div", { children: "Content" }) }));
        // Initially More modal should be closed
        expect(screen.queryByRole('dialog', { name: 'More navigation' })).not.toBeInTheDocument();
        // Click the More button
        const moreButton = screen.getByRole('button', { name: 'More navigation options' });
        moreButton.click();
        // Modal should open
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'More navigation' })).toBeInTheDocument();
        });
        // Modal should contain overflow navigation items
        expect(screen.getByText('Search')).toBeInTheDocument();
        expect(screen.getByText('History')).toBeInTheDocument();
        expect(screen.getByText('System Status')).toBeInTheDocument();
        expect(screen.getByText('System Tasks')).toBeInTheDocument();
        expect(screen.getByText('System Backup')).toBeInTheDocument();
        expect(screen.getByText('System Updates')).toBeInTheDocument();
        expect(screen.getByText('System Events')).toBeInTheDocument();
        expect(screen.getByText('System Logs')).toBeInTheDocument();
    });
    it('closes More overflow modal when Close button is clicked', async () => {
        render(_jsx(PageLayout, { pathname: "/", sidebarCollapsed: false, onToggleSidebar: vi.fn(), header: _jsx("div", { children: "Header" }), children: _jsx("div", { children: "Content" }) }));
        // Open the modal
        const moreButton = screen.getByRole('button', { name: 'More navigation options' });
        moreButton.click();
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'More navigation' })).toBeInTheDocument();
        });
        // Click Close button in modal (find the button with text "Close")
        const closeButton = screen.getByText('Close');
        closeButton.click();
        // Modal should close
        await waitFor(() => {
            expect(screen.queryByRole('dialog', { name: 'More navigation' })).not.toBeInTheDocument();
        });
    });
    it('closes More overflow modal when clicking on backdrop', async () => {
        render(_jsx(PageLayout, { pathname: "/", sidebarCollapsed: false, onToggleSidebar: vi.fn(), header: _jsx("div", { children: "Header" }), children: _jsx("div", { children: "Content" }) }));
        // Open the modal
        const moreButton = screen.getByRole('button', { name: 'More navigation options' });
        moreButton.click();
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'More navigation' })).toBeInTheDocument();
        });
        // Click backdrop using data-testid
        const backdrop = screen.getByTestId('modal-backdrop');
        backdrop.click();
        // Modal should close
        await waitFor(() => {
            expect(screen.queryByRole('dialog', { name: 'More navigation' })).not.toBeInTheDocument();
        });
    });
    it('closes More overflow modal when pressing Escape key', async () => {
        render(_jsx(PageLayout, { pathname: "/", sidebarCollapsed: false, onToggleSidebar: vi.fn(), header: _jsx("div", { children: "Header" }), children: _jsx("div", { children: "Content" }) }));
        // Open the modal
        const moreButton = screen.getByRole('button', { name: 'More navigation options' });
        moreButton.click();
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'More navigation' })).toBeInTheDocument();
        });
        // Press Escape key
        fireEvent.keyDown(document, { key: 'Escape' });
        // Modal should close
        await waitFor(() => {
            expect(screen.queryByRole('dialog', { name: 'More navigation' })).not.toBeInTheDocument();
        });
    });
    it('has accessible labels and roles for mobile navigation', async () => {
        render(_jsx(PageLayout, { pathname: "/", sidebarCollapsed: false, onToggleSidebar: vi.fn(), header: _jsx("div", { children: "Header" }), children: _jsx("div", { children: "Content" }) }));
        // Mobile nav should have proper ARIA label
        expect(screen.getByRole('navigation', { name: 'Mobile Navigation' })).toBeInTheDocument();
        // More button should have proper ARIA attributes
        const moreButton = screen.getByRole('button', { name: 'More navigation options' });
        expect(moreButton).toHaveAttribute('aria-expanded', 'false');
        // Click More button and check aria-expanded
        moreButton.click();
        await waitFor(() => {
            expect(moreButton).toHaveAttribute('aria-expanded', 'true');
        });
        // More modal should have role="dialog" and aria-modal="true"
        expect(screen.getByRole('dialog', { name: 'More navigation' })).toHaveAttribute('aria-modal', 'true');
        // Menu items in modal have role="menuitem"
        expect(screen.getByRole('menuitem', { name: 'Search' })).toBeInTheDocument();
    });
    it('navigates to page when clicking a link in More menu and closes modal', async () => {
        render(_jsx(PageLayout, { pathname: "/", sidebarCollapsed: false, onToggleSidebar: vi.fn(), header: _jsx("div", { children: "Header" }), children: _jsx("div", { children: "Content" }) }));
        // Open the modal
        const moreButton = screen.getByRole('button', { name: 'More navigation options' });
        moreButton.click();
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'More navigation' })).toBeInTheDocument();
        });
        // Find the Search link - it's a link with role="menuitem" in the component
        const searchLink = screen.getByRole('menuitem', { name: 'Search' });
        expect(searchLink).toBeInTheDocument();
        // Simulate clicking the link (modal should close)
        searchLink.click();
        // Modal should close after clicking a link
        await waitFor(() => {
            expect(screen.queryByRole('dialog', { name: 'More navigation' })).not.toBeInTheDocument();
        });
    });
});
//# sourceMappingURL=PageLayout.test.js.map