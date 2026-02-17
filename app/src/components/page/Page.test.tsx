import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Page } from './Page';

describe('Page', () => {
  it('renders title', () => {
    render(<Page title="Test Page" onMenuToggle={vi.fn()}>Content</Page>);

    const heading = screen.getByRole('heading', { name: 'Test Page' });
    expect(heading).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <Page title="Test Page" onMenuToggle={vi.fn()}>
        <div>Page content</div>
      </Page>,
    );

    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('renders header actions when provided', () => {
    const testAction = <button type="button">Test Action</button>;
    render(
      <Page title="Test Page" onMenuToggle={vi.fn()} headerActions={testAction}>
        Content
      </Page>,
    );

    expect(screen.getByText('Test Action')).toBeInTheDocument();
  });

  it('does not render header actions when not provided', () => {
    const { container } = render(
      <Page title="Test Page" onMenuToggle={vi.fn()}>
        Content
      </Page>,
    );

    const actionsContainer = container.querySelector('.flex.items-center.gap-2');
    expect(actionsContainer).not.toBeInTheDocument();
  });

  it('has correct container styles', () => {
    const { container } = render(
      <Page title="Test Page" onMenuToggle={vi.fn()}>
        Content
      </Page>,
    );

    const page = container.firstChild as HTMLElement;
    expect(page).toHaveClass('h-full');
  });

  it('has correct inner container padding on small screens', () => {
    const { container } = render(
      <Page title="Test Page" onMenuToggle={vi.fn()}>
        Content
      </Page>,
    );

    const innerContainer = container.querySelector('.px-4');
    expect(innerContainer).toBeInTheDocument();
    expect(innerContainer).toHaveClass('py-3');
  });

  it('has correct inner container padding on medium screens', () => {
    const { container } = render(
      <Page title="Test Page" onMenuToggle={vi.fn()}>
        Content
      </Page>,
    );

    const innerContainer = container.querySelector('.sm\\:px-4');
    expect(innerContainer).toBeInTheDocument();
    expect(innerContainer).toHaveClass('sm:py-4');
  });

  it('has correct inner container padding on large screens', () => {
    const { container } = render(
      <Page title="Test Page" onMenuToggle={vi.fn()}>
        Content
      </Page>,
    );

    const innerContainer = container.querySelector('.lg\\:px-6');
    expect(innerContainer).toBeInTheDocument();
    expect(innerContainer).toHaveClass('lg:py-4');
  });

  it('has correct heading styles', () => {
    const { container } = render(
      <Page title="Test Page" onMenuToggle={vi.fn()}>
        Content
      </Page>,
    );

    const heading = container.querySelector('h1');
    expect(heading).toHaveClass('flex-1', 'truncate', 'text-2xl', 'font-semibold', 'text-text-primary');
  });

  it('truncates long titles', () => {
    const longTitle = 'This is a very long title that should be truncated when it overflows the available space';
    render(<Page title={longTitle} onMenuToggle={vi.fn()}>Content</Page>);

    const heading = screen.getByRole('heading');
    expect(heading).toHaveClass('truncate');
  });

  it('renders multiple children', () => {
    render(
      <Page title="Test Page" onMenuToggle={vi.fn()}>
        <div>First child</div>
        <div>Second child</div>
        <div>Third child</div>
      </Page>,
    );

    expect(screen.getByText('First child')).toBeInTheDocument();
    expect(screen.getByText('Second child')).toBeInTheDocument();
    expect(screen.getByText('Third child')).toBeInTheDocument();
  });
});
