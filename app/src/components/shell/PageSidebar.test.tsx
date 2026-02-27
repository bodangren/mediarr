import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { PageSidebar } from './PageSidebar';

function renderSidebar(pathname = '/settings/indexers', collapsed = false) {
  return render(
    <BrowserRouter>
      <PageSidebar pathname={pathname} collapsed={collapsed} onToggle={vi.fn()} />
    </BrowserRouter>,
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

  it('allows section collapse and expand', async () => {
    const user = userEvent.setup();
    renderSidebar('/library/movies');

    const libraryHeader = screen.getByRole('button', { name: /^Library/i });
    expect(screen.getByRole('link', { name: /Movies/i })).toBeInTheDocument();

    await user.click(libraryHeader);
    expect(screen.queryByRole('link', { name: /Movies/i })).not.toBeInTheDocument();

    await user.click(libraryHeader);
    expect(screen.getByRole('link', { name: /Movies/i })).toBeInTheDocument();
  });

  it('shows short labels when collapsed', () => {
    renderSidebar('/library/movies', true);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Movies')).toBeInTheDocument();
  });
});
