import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageContentBody } from './PageContentBody';

describe('PageContentBody', () => {
  it('renders children correctly', () => {
    render(
      <PageContentBody>
        <div>Test content</div>
      </PageContentBody>,
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies default classes', () => {
    const { container } = render(
      <PageContentBody>
        <div>Content</div>
      </PageContentBody>,
    );

    const body = container.firstChild as HTMLElement;
    expect(body).toHaveClass('overflow-y-auto', 'scroll-smooth', 'scrollbar-thin');
  });

  it('applies custom className', () => {
    const { container } = render(
      <PageContentBody className="custom-class">
        <div>Content</div>
      </PageContentBody>,
    );

    const body = container.firstChild as HTMLElement;
    expect(body).toHaveClass('custom-class');
  });

  it('has scrollbar styling classes', () => {
    const { container } = render(
      <PageContentBody>
        <div>Content</div>
      </PageContentBody>,
    );

    const body = container.firstChild as HTMLElement;
    expect(body).toHaveClass(
      'scrollbar-thumb-border-subtle',
      'scrollbar-track-transparent',
      'hover:scrollbar-thumb-text-muted',
    );
  });
});
