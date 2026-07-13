import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PageSidebar } from './PageSidebar';

function renderSidebar(pathname = '/settings/indexers', collapsed = false) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[pathname]}>
        <PageSidebar pathname={pathname} collapsed={collapsed} onToggle={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PageSidebar unified navigation', () => {
  it('renders unified section headers', () => {
    renderSidebar();

    expect(screen.getByRole('button', { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Library/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Calendar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Activity/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /System/i })).toBeInTheDocument();
  });

  it('marks active route correctly', () => {
    renderSidebar('/settings/indexers');

    const activeLink = screen.getByRole('link', { name: /Indexers/i });
    expect(activeLink).toHaveAttribute('aria-current', 'page');
  });

  it('allows section collapse and expand', () => {
    renderSidebar('/library/movies');

    const libraryHeader = screen.getByText('Library');
    expect(screen.getByText('Movies')).toBeInTheDocument();

    fireEvent.click(libraryHeader);
    expect(screen.queryByText('Movies')).not.toBeInTheDocument();

    fireEvent.click(libraryHeader);
    expect(screen.getByText('Movies')).toBeInTheDocument();
  });

  it('renders icon-only navigation when collapsed', () => {
    renderSidebar('/library/movies', true);

    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByRole('link', { current: 'page' })).toHaveAttribute('href', '/library/movies');
    expect(screen.queryByText('Movies')).not.toBeInTheDocument();
  });
});
