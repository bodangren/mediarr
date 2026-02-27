import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ViewMenu, type ViewMode } from './ViewMenu';

describe('ViewMenu', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders correctly with initial value', () => {
    render(<ViewMenu value="poster" onChange={mockOnChange} />);

    expect(screen.getByRole('button')).toHaveTextContent('Poster');
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'View: Poster');
  });

  it('renders with custom label', () => {
    render(<ViewMenu value="table" onChange={mockOnChange} label="Display" />);

    expect(screen.getByRole('button')).toHaveTextContent('Table');
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Display: Table');
  });

  it('opens menu on click', async () => {
    render(<ViewMenu value="poster" onChange={mockOnChange} />);

    const button = screen.getByRole('button', { name: /view: poster/i });
    await userEvent.click(button);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Poster' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Table' })).toBeInTheDocument();
  });

  it('closes menu when clicking backdrop', async () => {
    render(<ViewMenu value="poster" onChange={mockOnChange} />);

    const button = screen.getByRole('button', { name: /view: poster/i });
    await userEvent.click(button);

    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Click backdrop (fixed inset-0 button)
    const backdrop = screen.getByLabelText('Close view menu');
    await userEvent.click(backdrop);

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('calls onChange with correct value when selecting option', async () => {
    render(<ViewMenu value="poster" onChange={mockOnChange} />);

    const button = screen.getByRole('button', { name: /view: poster/i });
    await userEvent.click(button);

    const overviewOption = screen.getByRole('option', { name: 'Overview' });
    const overviewButton = within(overviewOption).getByRole('button');
    await userEvent.click(overviewButton);

    expect(mockOnChange).toHaveBeenCalledWith('overview');
    expect(mockOnChange).toHaveBeenCalledTimes(1);

    // Menu should close after selection
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('highlights active view with checkmark', async () => {
    render(<ViewMenu value="overview" onChange={mockOnChange} />);

    const button = screen.getByRole('button', { name: /view: overview/i });
    await userEvent.click(button);

    const overviewOption = screen.getByRole('option', { name: 'Overview' });
    expect(overviewOption).toHaveAttribute('aria-selected', 'true');
    expect(overviewOption.querySelector('[data-testid="active-checkmark"]')).toBeInTheDocument();

    const posterOption = screen.getByRole('option', { name: 'Poster' });
    expect(posterOption).toHaveAttribute('aria-selected', 'false');
    expect(posterOption.querySelector('[data-testid="active-checkmark"]')).not.toBeInTheDocument();
  });

  it('displays correct icon for each view mode', async () => {
    render(<ViewMenu value="table" onChange={mockOnChange} />);

    const button = screen.getByRole('button', { name: /view: table/i });
    // Button should have an icon (svg inside)
    expect(button.querySelector('svg')).toBeInTheDocument();

    await userEvent.click(button);

    // All options should have icons
    const options = screen.getAllByRole('option');
    options.forEach(option => {
      expect(option.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('toggles menu open/close on repeated clicks', async () => {
    render(<ViewMenu value="poster" onChange={mockOnChange} />);

    const button = screen.getByRole('button', { name: /view: poster/i });

    // Open menu
    await userEvent.click(button);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Close menu by clicking button again
    await userEvent.click(button);
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    // Open again
    await userEvent.click(button);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('applies correct styling to active option', async () => {
    render(<ViewMenu value="table" onChange={mockOnChange} />);

    const button = screen.getByRole('button', { name: /view: table/i });
    await userEvent.click(button);

    const tableOption = screen.getByRole('option', { name: 'Table' });
    const tableButton = within(tableOption).getByRole('button');
    expect(tableButton).toHaveClass('bg-surface-2', 'text-text-primary', 'font-medium');

    const posterOption = screen.getByRole('option', { name: 'Poster' });
    const posterButton = within(posterOption).getByRole('button');
    expect(posterButton).toHaveClass('text-text-secondary');
    expect(posterButton).not.toHaveClass('bg-surface-2', 'font-medium');
  });

  it('has proper accessibility attributes', () => {
    render(<ViewMenu value="poster" onChange={mockOnChange} />);

    const button = screen.getByRole('button', { name: /view: poster/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-haspopup', 'listbox');
  });

  it('updates accessibility attributes when menu opens', async () => {
    render(<ViewMenu value="poster" onChange={mockOnChange} />);

    const button = screen.getByRole('button', { name: /view: poster/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  describe('view modes', () => {
    it.each<ViewMode>(['poster', 'overview', 'table'])('renders correct label for %s mode', viewMode => {
      render(<ViewMenu value={viewMode} onChange={mockOnChange} />);

      const expectedLabels: Record<ViewMode, string> = {
        poster: 'Poster',
        overview: 'Overview',
        table: 'Table',
      };

      expect(screen.getByRole('button')).toHaveTextContent(expectedLabels[viewMode]);
    });
  });

  it('handles rapid option clicks correctly', async () => {
    render(<ViewMenu value="poster" onChange={mockOnChange} />);

    const button = screen.getByRole('button', { name: /view: poster/i });
    await userEvent.click(button);

    let tableOption = screen.getByRole('option', { name: 'Table' });
    const tableButton = within(tableOption).getByRole('button');

    // Click table option
    await userEvent.click(tableButton);
    expect(mockOnChange).toHaveBeenCalledWith('table');

    // Wait for menu to close
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    // Reopen menu
    await userEvent.click(button);

    // Wait for menu to open
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    // Click poster option
    let posterOption = screen.getByRole('option', { name: 'Poster' });
    const posterButton = within(posterOption).getByRole('button');
    await userEvent.click(posterButton);

    expect(mockOnChange).toHaveBeenLastCalledWith('poster');
  });
});
