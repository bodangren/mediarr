import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PageHeader } from './PageHeader';
import * as Icons from 'lucide-react';

describe('PageHeader', () => {
  it('renders title', () => {
    render(<PageHeader title="Test Page" onMenuToggle={vi.fn()} />);

    const heading = screen.getByRole('heading', { name: 'Test Page' });
    expect(heading).toBeInTheDocument();
  });

  it('renders menu toggle button on mobile', () => {
    render(<PageHeader title="Test Page" onMenuToggle={vi.fn()} />);

    const menuButton = screen.getByRole('button', { name: 'Toggle sidebar' });
    expect(menuButton).toBeInTheDocument();
  });

  it('calls onMenuToggle when menu button is clicked', () => {
    const handleToggle = vi.fn();
    render(<PageHeader title="Test Page" onMenuToggle={handleToggle} />);

    const menuButton = screen.getByRole('button', { name: 'Toggle sidebar' });
    fireEvent.click(menuButton);

    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('renders actions when provided', () => {
    const testAction = <button type="button">Test Action</button>;
    render(<PageHeader title="Test Page" onMenuToggle={vi.fn()} actions={testAction} />);

    expect(screen.getByText('Test Action')).toBeInTheDocument();
  });

  it('does not render actions when not provided', () => {
    const { container } = render(<PageHeader title="Test Page" onMenuToggle={vi.fn()} />);

    const actionsContainer = container.querySelector('.flex.items-center.gap-2');
    expect(actionsContainer).not.toBeInTheDocument();
  });

  it('truncates long titles', () => {
    const longTitle = 'This is a very long title that should be truncated when it overflows the available space';
    render(<PageHeader title={longTitle} onMenuToggle={vi.fn()} />);

    const heading = screen.getByRole('heading');
    expect(heading).toHaveClass('truncate');
  });

  it('has correct heading styles', () => {
    const { container } = render(<PageHeader title="Test Page" onMenuToggle={vi.fn()} />);

    const heading = container.querySelector('h1');
    expect(heading).toHaveClass('flex-1', 'truncate', 'text-xl', 'font-semibold', 'text-text-primary');
  });

  it('has correct container styles', () => {
    const { container } = render(<PageHeader title="Test Page" onMenuToggle={vi.fn()} />);

    const header = container.firstChild as HTMLElement;
    expect(header).toHaveClass('mb-4', 'flex', 'items-center', 'justify-between', 'gap-4');
  });

  it('renders multiple actions', () => {
    const actions = (
      <>
        <button type="button">Action 1</button>
        <button type="button">Action 2</button>
        <button type="button">Action 3</button>
      </>
    );
    render(<PageHeader title="Test Page" onMenuToggle={vi.fn()} actions={actions} />);

    expect(screen.getByText('Action 1')).toBeInTheDocument();
    expect(screen.getByText('Action 2')).toBeInTheDocument();
    expect(screen.getByText('Action 3')).toBeInTheDocument();
  });
});
