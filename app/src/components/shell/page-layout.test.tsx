import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageLayout } from './PageLayout';
import { PageSidebar } from './PageSidebar';

describe('PageSidebar', () => {
  it('renders navigation links and marks active route', () => {
    render(<PageSidebar pathname="/indexers" collapsed={false} onToggle={vi.fn()} />);

    expect(screen.getByRole('navigation', { name: /sidebar navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /indexers/i })).toHaveAttribute('aria-current', 'page');
  });

  it('renders short labels when collapsed', () => {
    render(<PageSidebar pathname="/indexers" collapsed={true} onToggle={vi.fn()} />);

    expect(screen.getByRole('link', { name: /^home$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
  });
});

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
});
