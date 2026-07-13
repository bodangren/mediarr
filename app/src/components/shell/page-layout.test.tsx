import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PageLayout } from './PageLayout';

function renderPageLayout(pathname: string, header: string, children: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[pathname]}>
        <PageLayout pathname={pathname} sidebarCollapsed={false} onToggleSidebar={vi.fn()} header={<div>{header}</div>}>
          <div>{children}</div>
        </PageLayout>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PageLayout', () => {
  it('renders header, sidebar nav, mobile nav, and content', () => {
    renderPageLayout('/activity/queue', 'Page Header', 'Queue content');

    expect(screen.getByText('Page Header')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /sidebar navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /mobile navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('Queue content');
  });

  it('renders bottom mobile nav actions', () => {
    renderPageLayout('/dashboard', 'Header', 'Content');

    expect(screen.getByRole('button', { name: /more navigation options/i })).toBeInTheDocument();
  });
});
