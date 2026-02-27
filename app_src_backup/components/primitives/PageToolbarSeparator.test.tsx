import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageToolbarSeparator } from './PageToolbarSeparator';

describe('PageToolbarSeparator', () => {
  it('renders separator element', () => {
    render(<PageToolbarSeparator />);
    const separator = screen.getByRole('separator');
    expect(separator).toBeInTheDocument();
  });

  it('has correct dimensions', () => {
    const { container } = render(<PageToolbarSeparator />);
    const separator = container.firstChild as HTMLElement;
    expect(separator).toHaveClass('h-6', 'w-px');
  });

  it('has correct color', () => {
    const { container } = render(<PageToolbarSeparator />);
    const separator = container.firstChild as HTMLElement;
    expect(separator).toHaveClass('bg-border-subtle');
  });

  it('has separator role for accessibility', () => {
    render(<PageToolbarSeparator />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });
});
