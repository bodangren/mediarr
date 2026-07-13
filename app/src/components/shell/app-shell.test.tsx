import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppShell } from './AppShell';

function renderShell(pathname = '/library/series') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[pathname]}>
        <AppShell pathname={pathname}>
          <div>Page content</div>
        </AppShell>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('app shell', () => {
  it('highlights active route and renders breadcrumbs', () => {
    renderShell('/library/tv/42');
    const tvLinks = screen.getAllByRole('link', { name: /tv shows/i });
    expect(tvLinks.some(link => link.getAttribute('aria-current') === 'page')).toBe(true);
    expect(screen.getAllByText('Library').length).toBeGreaterThan(0);
    expect(screen.getAllByText('TV Shows').length).toBeGreaterThan(0);
  }, 30000);

  it('opens and closes command palette with ctrl/cmd+k', () => {
    renderShell('/');
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows realtime connection status indicator', () => {
    renderShell('/');
    expect(screen.getByRole('status')).toHaveTextContent('Realtime: Idle');
  });

  it('opens keyboard shortcuts help with question mark', () => {
    renderShell('/');

    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByRole('dialog', { name: /keyboard shortcuts/i })).toBeInTheDocument();
  });

  it('renders mobile bottom nav with active state', () => {
    renderShell('/wanted');
    const wantedLinks = screen.getAllByRole('link', { name: /^wanted$/i });
    expect(wantedLinks.some(link => link.getAttribute('aria-current') === 'page')).toBe(true);
  });

  it('supports collapsing and expanding the desktop sidebar', () => {
    renderShell('/library/series');

    const collapseButton = screen.getByRole('button', { name: /collapse sidebar/i });
    fireEvent.click(collapseButton);
    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /expand sidebar/i }));
    expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeInTheDocument();
  });
});
