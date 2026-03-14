
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PageToolbarButton } from '@/components/ui/page-toolbar-button-compat';
import * as Icons from 'lucide-react';

describe('PageToolbarButton', () => {
  it('renders button with icon and label', () => {
    render(
      <PageToolbarButton
        icon={<Icons.Search className="h-4 w-4" />}
        label="Search"
      />,
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
  });

  it('renders custom aria label when provided', () => {
    render(
      <PageToolbarButton
        icon={<Icons.Search className="h-4 w-4" />}
        label="Search"
        ariaLabel="Search movies"
      />,
    );

    expect(screen.getByRole('button', { name: 'Search movies' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(
      <PageToolbarButton
        icon={<Icons.Search className="h-4 w-4" />}
        label="Search"
        onClick={handleClick}
      />,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <PageToolbarButton
        icon={<Icons.Search className="h-4 w-4" />}
        label="Search"
        disabled
      />,
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
  });

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(
      <PageToolbarButton
        icon={<Icons.Search className="h-4 w-4" />}
        label="Search"
        onClick={handleClick}
        disabled
      />,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows loading state with spinning icon', () => {
    render(
      <PageToolbarButton
        icon={<Icons.RefreshCw className="h-4 w-4" />}
        label="Refresh"
        loading
      />,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    expect(button.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows active state when isActive prop is true', () => {
    render(
      <PageToolbarButton
        icon={<Icons.Grid className="h-4 w-4" />}
        label="Grid View"
        isActive
      />,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-accent-primary/20', 'text-accent-primary');
  });

  it('hides label on small screens', () => {
    render(
      <PageToolbarButton
        icon={<Icons.Search className="h-4 w-4" />}
        label="Search"
      />,
    );

    const label = screen.getByText('Search');
    expect(label).toHaveClass('hidden', 'sm:inline');
  });

  it('has focus ring on focus', () => {
    render(
      <PageToolbarButton
        icon={<Icons.Search className="h-4 w-4" />}
        label="Search"
      />,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('focus-visible:ring-2');
  });

  it('has transition effects', () => {
    render(
      <PageToolbarButton
        icon={<Icons.Search className="h-4 w-4" />}
        label="Search"
      />,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('transition-colors');
  });
});
