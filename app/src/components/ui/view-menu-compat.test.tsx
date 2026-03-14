
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ViewMenu, type ViewMode } from './view-menu-compat';

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
    const user = userEvent.setup();
    render(<ViewMenu value="poster" onChange={mockOnChange} />);

    const button = screen.getByRole('button', { name: /view: poster/i });
    await user.click(button);

    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Poster' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Table' })).toBeInTheDocument();
  });

  it('calls onChange with correct value when selecting option', async () => {
    const user = userEvent.setup();
    render(<ViewMenu value="poster" onChange={mockOnChange} />);

    const button = screen.getByRole('button', { name: /view: poster/i });
    await user.click(button);

    const overviewOption = await screen.findByRole('menuitem', { name: 'Overview' });
    await user.click(overviewOption);

    expect(mockOnChange).toHaveBeenCalledWith('overview');
    expect(mockOnChange).toHaveBeenCalledTimes(1);

    // Menu should close after selection
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('highlights active view with checkmark', async () => {
    const user = userEvent.setup();
    render(<ViewMenu value="overview" onChange={mockOnChange} />);

    const button = screen.getByRole('button', { name: /view: overview/i });
    await user.click(button);

    const overviewOption = await screen.findByRole('menuitem', { name: 'Overview' });
    expect(overviewOption.querySelector('[data-testid="active-checkmark"]')).toBeInTheDocument();

    const posterOption = screen.getByRole('menuitem', { name: 'Poster' });
    expect(posterOption.querySelector('[data-testid="active-checkmark"]')).not.toBeInTheDocument();
  });

  it('displays correct icon for each view mode', async () => {
    const user = userEvent.setup();
    render(<ViewMenu value="table" onChange={mockOnChange} />);

    const button = screen.getByRole('button', { name: /view: table/i });
    // Button should have an icon (svg inside)
    expect(button.querySelector('svg')).toBeInTheDocument();

    await user.click(button);

    // All options should have icons
    const options = await screen.findAllByRole('menuitem');
    options.forEach(option => {
      expect(option.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('closes menu on second click', async () => {
    render(<ViewMenu value="poster" onChange={mockOnChange} />);

    const button = screen.getByRole('button', { name: /view: poster/i });

    // Open menu
    fireEvent.click(button);
    expect(await screen.findByRole('menu')).toBeInTheDocument();

    // Close menu by clicking button again
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', () => {
    render(<ViewMenu value="poster" onChange={mockOnChange} />);

    const button = screen.getByRole('button', { name: /view: poster/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('updates accessibility attributes when menu opens', async () => {
    const user = userEvent.setup();
    render(<ViewMenu value="poster" onChange={mockOnChange} />);

    const button = screen.getByRole('button', { name: /view: poster/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);

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
    const user = userEvent.setup();
    render(<ViewMenu value="poster" onChange={mockOnChange} />);

    const button = screen.getByRole('button', { name: /view: poster/i });
    await user.click(button);

    let tableOption = await screen.findByRole('menuitem', { name: 'Table' });

    // Click table option
    await user.click(tableOption);
    expect(mockOnChange).toHaveBeenCalledWith('table');

    // Wait for menu to close
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    // Reopen menu
    await user.click(button);

    // Click poster option
    let posterOption = await screen.findByRole('menuitem', { name: 'Poster' });
    await user.click(posterOption);

    expect(mockOnChange).toHaveBeenLastCalledWith('poster');
  });
});
