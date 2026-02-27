import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageLayout } from './PageLayout';

describe('PageLayout', () => {
  it('renders page header, sidebar, mobile nav, and main content area', () => {
    render(
      <PageLayout pathname="/queue" sidebarCollapsed={false} onToggleSidebar={vi.fn()} header={<div>Page Header</div>}>
        <div>Queue content</div>
      </PageLayout>,
    );

    expect(screen.getByText('Page Header')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /sidebar navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /mobile navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('Queue content');
  });

  it('renders mobile navigation with icons and labels', () => {
    render(
      <PageLayout pathname="/indexers" sidebarCollapsed={false} onToggleSidebar={vi.fn()} header={<div>Header</div>}>
        <div>Content</div>
      </PageLayout>,
    );

    const mobileNav = screen.getByRole('navigation', { name: /mobile navigation/i });
    expect(mobileNav).toBeInTheDocument();

    // Check for icons (Lucide icons render as SVGs)
    const icons = mobileNav.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });
});
