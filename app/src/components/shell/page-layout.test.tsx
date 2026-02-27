import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PageLayout } from './PageLayout';

describe('PageLayout', () => {
  it('renders header, sidebar nav, mobile nav, and content', () => {
    render(
      <BrowserRouter>
        <PageLayout pathname="/activity/queue" sidebarCollapsed={false} onToggleSidebar={vi.fn()} header={<div>Page Header</div>}>
          <div>Queue content</div>
        </PageLayout>
      </BrowserRouter>,
    );

    expect(screen.getByText('Page Header')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /sidebar navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /mobile navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('Queue content');
  });

  it('renders bottom mobile nav actions', () => {
    render(
      <BrowserRouter>
        <PageLayout pathname="/dashboard" sidebarCollapsed={false} onToggleSidebar={vi.fn()} header={<div>Header</div>}>
          <div>Content</div>
        </PageLayout>
      </BrowserRouter>,
    );

    expect(screen.getByRole('button', { name: /more navigation options/i })).toBeInTheDocument();
  });
});
