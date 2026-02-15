import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PageSidebar } from './PageSidebar';
import { NAV_ITEMS } from '@/lib/navigation';

describe('PageSidebar with grouped navigation', () => {
  it('renders navigation sections with headers', () => {
    render(<PageSidebar pathname="/indexers" collapsed={false} onToggle={vi.fn()} />);

    // Look for section headers (they are buttons)
    expect(screen.getByRole('button', { name: /Media Library/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Indexers & Search/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /System/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Other/i })).toBeInTheDocument();
  });

  it('renders navigation items with icons', () => {
    render(<PageSidebar pathname="/indexers" collapsed={false} onToggle={vi.fn()} />);

    // Check that icons are rendered (Lucide icons render as SVGs)
    const icons = document.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('marks active route correctly within sections', () => {
    render(<PageSidebar pathname="/indexers" collapsed={false} onToggle={vi.fn()} />);

    const indexersLink = screen.getByRole('link', { name: /indexers/i });
    expect(indexersLink).toHaveAttribute('aria-current', 'page');
  });

  it('allows section collapse/expand', async () => {
    const user = userEvent.setup();
    render(<PageSidebar pathname="/indexers" collapsed={false} onToggle={vi.fn()} />);

    // Find a section header button
    const mediaLibraryHeader = screen.getByRole('button', { name: /Media Library/i });
    expect(mediaLibraryHeader).toBeInTheDocument();

    // Items should be visible initially
    const seriesLink = screen.queryByRole('link', { name: /Series Library/i });
    expect(seriesLink).toBeInTheDocument();

    // Click to collapse
    await user.click(mediaLibraryHeader);

    // The section items should not be visible when collapsed
    const seriesLinkAfter = screen.queryByRole('link', { name: /Series Library/i });
    expect(seriesLinkAfter).not.toBeInTheDocument();
  });

  it('renders collapsed section items when section is expanded', async () => {
    const user = userEvent.setup();
    render(<PageSidebar pathname="/indexers" collapsed={false} onToggle={vi.fn()} />);

    // Find and collapse a section
    const mediaLibraryHeader = screen.getByRole('button', { name: /Media Library/i });
    await user.click(mediaLibraryHeader);

    // Items should be hidden
    let seriesLink = screen.queryByRole('link', { name: /Series Library/i });
    expect(seriesLink).not.toBeInTheDocument();

    // Click to expand
    await user.click(mediaLibraryHeader);

    // Items should be visible again
    seriesLink = screen.queryByRole('link', { name: /Series Library/i });
    expect(seriesLink).toBeInTheDocument();
  });

  it('shows icons and labels when sidebar is expanded', () => {
    render(<PageSidebar pathname="/indexers" collapsed={false} onToggle={vi.fn()} />);

    // Should show full labels
    expect(screen.getByText('Series Library')).toBeInTheDocument();
    expect(screen.getByText('Movie Library')).toBeInTheDocument();

    // Should show icons
    const icons = document.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('shows only icons when sidebar is collapsed', () => {
    render(<PageSidebar pathname="/indexers" collapsed={true} onToggle={vi.fn()} />);

    // Should show short labels (or icons only)
    expect(screen.getByText('Series')).toBeInTheDocument();
    expect(screen.getByText('Movies')).toBeInTheDocument();
  });
});
