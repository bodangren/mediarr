import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageContent } from './PageContent';

describe('PageContent', () => {
  it('renders children without title', () => {
    render(
      <PageContent>
        <div>Test content</div>
      </PageContent>,
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(
      <PageContent title="Page Title">
        <div>Content</div>
      </PageContent>,
    );

    const heading = screen.getByRole('heading', { level: 1, name: 'Page Title' });
    expect(heading).toBeInTheDocument();
  });

  it('has correct heading styles', () => {
    const { container } = render(
      <PageContent title="Page Title">
        <div>Content</div>
      </PageContent>,
    );

    const heading = container.querySelector('h1');
    expect(heading).toHaveClass('text-2xl', 'font-semibold', 'text-text-primary', 'mb-4');
  });

  it('applies default layout classes', () => {
    const { container } = render(
      <PageContent>
        <div>Content</div>
      </PageContent>,
    );

    const content = container.firstChild as HTMLElement;
    expect(content).toHaveClass('flex', 'flex-col');
  });

  it('applies custom className', () => {
    const { container } = render(
      <PageContent className="custom-class">
        <div>Content</div>
      </PageContent>,
    );

    const content = container.firstChild as HTMLElement;
    expect(content).toHaveClass('custom-class');
  });

  it('renders multiple children', () => {
    render(
      <PageContent>
        <div>First child</div>
        <div>Second child</div>
        <div>Third child</div>
      </PageContent>,
    );

    expect(screen.getByText('First child')).toBeInTheDocument();
    expect(screen.getByText('Second child')).toBeInTheDocument();
    expect(screen.getByText('Third child')).toBeInTheDocument();
  });
});
