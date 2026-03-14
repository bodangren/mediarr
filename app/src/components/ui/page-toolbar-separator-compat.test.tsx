import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageToolbarSeparator } from './page-toolbar-separator-compat';

describe('PageToolbarSeparator', () => {
  it('renders separator element', () => {
    render(<PageToolbarSeparator />);
    const separator = screen.getByRole('separator');
    expect(separator).toBeInTheDocument();
  });

  it('has correct orientation', () => {
    render(<PageToolbarSeparator />);
    const separator = screen.getByRole('separator');
    expect(separator).toHaveAttribute('data-orientation', 'vertical');
  });

  it('has correct dimensions and color classes', () => {
    render(<PageToolbarSeparator />);
    const separator = screen.getByRole('separator');
    // shadcn separator default: shrink-0 bg-border
    expect(separator).toHaveClass('h-6', 'mx-1', 'bg-border');
  });
});
