import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('opens keyboard shortcuts help as a focus-contained modal and restores focus on Escape', async () => {
    const user = userEvent.setup();
    renderShell('/');
    const invoker = screen.getByRole('button', { name: 'Cmd/Ctrl + K' });
    invoker.focus();

    await user.keyboard('?');
    const dialog = screen.getByRole('dialog', { name: /keyboard shortcuts/i });
    const closeButton = screen.getByRole('button', { name: /close keyboard shortcuts/i });

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-describedby', 'keyboard-shortcuts-description');
    expect(closeButton).toHaveFocus();

    await user.tab();
    expect(closeButton).toHaveFocus();
    await user.tab({ shift: true });
    expect(closeButton).toHaveFocus();

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
      expect(invoker).toHaveFocus();
    });
  });

  it('closes keyboard shortcuts help from the backdrop and restores focus', async () => {
    renderShell('/');
    const invoker = screen.getByRole('button', { name: 'Cmd/Ctrl + K' });
    invoker.focus();

    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByRole('dialog', { name: /keyboard shortcuts/i })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('keyboard-shortcuts-backdrop'));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
      expect(invoker).toHaveFocus();
    });
  });

  it('closes keyboard shortcuts help from its close button and restores focus', async () => {
    const user = userEvent.setup();
    renderShell('/');
    const invoker = screen.getByRole('button', { name: 'Cmd/Ctrl + K' });
    invoker.focus();

    await user.keyboard('?');
    await user.click(screen.getByRole('button', { name: /close keyboard shortcuts/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
      expect(invoker).toHaveFocus();
    });
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
