import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PageLayout } from '@/components/shell/PageLayout';

vi.mock('@/components/shell/PageSidebar', () => ({
  PageSidebar: () => <div data-testid="page-sidebar">PageSidebar</div>,
}));

vi.setConfig({ testTimeout: 30000 });

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('PageLayout mobile navigation', () => {
  it('renders mobile bottom navigation with 4 primary items and a More button', () => {
    const { container } = renderWithRouter(
      <PageLayout
        pathname="/"
        sidebarCollapsed={false}
        onToggleSidebar={vi.fn()}
        header={<div>Header</div>}
      >
        <div>Content</div>
      </PageLayout>,
    );

    // Should have mobile bottom nav
    const mobileNav = container.querySelector('[aria-label="Mobile Navigation"]');
    expect(mobileNav).toBeInTheDocument();

    // Should have 5 slots (4 primary items + 1 More button)
    const navItems = mobileNav?.querySelectorAll('li');
    expect(navItems?.length).toBe(5);

    // First 4 items should be navigation links
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Movies')).toBeInTheDocument();
    expect(screen.getByText('TV')).toBeInTheDocument();

    // 5th item should be More button
    expect(screen.getByRole('button', { name: 'More navigation options' })).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
  });

  it('opens More overflow modal when More button is clicked', async () => {
    renderWithRouter(
      <PageLayout
        pathname="/"
        sidebarCollapsed={false}
        onToggleSidebar={vi.fn()}
        header={<div>Header</div>}
      >
        <div>Content</div>
      </PageLayout>,
    );

    // Initially More modal should be closed
    expect(screen.queryByRole('dialog', { name: 'More' })).not.toBeInTheDocument();

    // Click the More button
    const moreButton = screen.getByRole('button', { name: 'More navigation options' });
    fireEvent.click(moreButton);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'More' })).toBeInTheDocument();
    });

    // Modal should contain overflow navigation items
    expect(screen.getByRole('menuitem', { name: 'Collections' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Wanted' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Calendar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Queue' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Indexers' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Statistics' })).toBeInTheDocument();
  }, 30000);

  it('closes More overflow modal when Close button is clicked', async () => {
    renderWithRouter(
      <PageLayout
        pathname="/"
        sidebarCollapsed={false}
        onToggleSidebar={vi.fn()}
        header={<div>Header</div>}
      >
        <div>Content</div>
      </PageLayout>,
    );

    // Open the modal
    const moreButton = screen.getByRole('button', { name: 'More navigation options' });
    fireEvent.click(moreButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'More' })).toBeInTheDocument();
    });

    // Click Close button in modal header
    const closeButton = screen.getByRole('button', { name: 'Close modal' });
    fireEvent.click(closeButton);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'More' })).not.toBeInTheDocument();
    });
  }, 30000);

  it('closes More overflow modal when clicking on backdrop', async () => {
    renderWithRouter(
      <PageLayout
        pathname="/"
        sidebarCollapsed={false}
        onToggleSidebar={vi.fn()}
        header={<div>Header</div>}
      >
        <div>Content</div>
      </PageLayout>,
    );

    // Open the modal
    const moreButton = screen.getByRole('button', { name: 'More navigation options' });
    fireEvent.click(moreButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'More' })).toBeInTheDocument();
    });

    // Click backdrop using data-testid
    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(backdrop);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'More' })).not.toBeInTheDocument();
    });
  }, 30000);

  it('closes More overflow modal when pressing Escape key', async () => {
    renderWithRouter(
      <PageLayout
        pathname="/"
        sidebarCollapsed={false}
        onToggleSidebar={vi.fn()}
        header={<div>Header</div>}
      >
        <div>Content</div>
      </PageLayout>,
    );

    // Open the modal
    const moreButton = screen.getByRole('button', { name: 'More navigation options' });
    fireEvent.click(moreButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'More' })).toBeInTheDocument();
    });

    // Press Escape key
    fireEvent.keyDown(document, { key: 'Escape' });

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'More' })).not.toBeInTheDocument();
    });
  }, 30000);

  it('has accessible labels and roles for mobile navigation', async () => {
    renderWithRouter(
      <PageLayout
        pathname="/"
        sidebarCollapsed={false}
        onToggleSidebar={vi.fn()}
        header={<div>Header</div>}
      >
        <div>Content</div>
      </PageLayout>,
    );

    // Mobile nav should have proper ARIA label
    expect(screen.getByRole('navigation', { name: 'Mobile Navigation' })).toBeInTheDocument();

    // More button should have proper ARIA attributes
    const moreButton = screen.getByRole('button', { name: 'More navigation options' });
    expect(moreButton).toHaveAttribute('aria-expanded', 'false');

    // Click More button and check aria-expanded
    fireEvent.click(moreButton);

    await waitFor(() => {
      expect(moreButton).toHaveAttribute('aria-expanded', 'true');
    });

    // More modal should have role="dialog"
    expect(screen.getByRole('dialog', { name: 'More' })).toBeInTheDocument();

    // Menu items in modal have role="menuitem"
    expect(screen.getByRole('menuitem', { name: 'Collections' })).toBeInTheDocument();
  }, 30000);

  it('navigates to page when clicking a link in More menu and closes modal', async () => {
    renderWithRouter(
      <PageLayout
        pathname="/"
        sidebarCollapsed={false}
        onToggleSidebar={vi.fn()}
        header={<div>Header</div>}
      >
        <div>Content</div>
      </PageLayout>,
    );

    // Open the modal
    const moreButton = screen.getByRole('button', { name: 'More navigation options' });
    fireEvent.click(moreButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'More' })).toBeInTheDocument();
    });

    // Find an overflow link - Collections is the first overflow item
    const collectionsLink = screen.getByRole('menuitem', { name: 'Collections' });
    expect(collectionsLink).toBeInTheDocument();

    // Simulate clicking the link (modal should close)
    fireEvent.click(collectionsLink);

    // Modal should close after clicking a link
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'More' })).not.toBeInTheDocument();
    });
  }, 30000);
});
