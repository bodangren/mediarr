import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilterMenu } from './filter-menu-compat';

describe('FilterMenu', () => {
  const mockOnChange = vi.fn();
  const mockOnCustomFilter = vi.fn();

  const defaultOptions = [
    { key: 'all', label: 'All' },
    { key: 'monitored', label: 'Monitored' },
    { key: 'missing', label: 'Missing' },
  ];

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnCustomFilter.mockClear();
  });

  it('renders correctly with initial value', () => {
    render(
      <FilterMenu
        label="Filter"
        value="all"
        options={defaultOptions}
        onChange={mockOnChange}
      />,
    );

    expect(screen.getByText('Filter')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter' })).toHaveTextContent('All');
  });

  it('renders with custom label', () => {
    render(
      <FilterMenu
        label="Status"
        value="monitored"
        options={defaultOptions}
        onChange={mockOnChange}
      />,
    );

    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Status' })).toHaveTextContent('Monitored');
  });

  it('renders all options in dropdown when clicked', async () => {
    const user = userEvent.setup();
    render(
      <FilterMenu
        value="all"
        options={defaultOptions}
        onChange={mockOnChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Filter' }));

    // Items are in a portal, so we search globally
    expect(screen.getByRole('menuitem', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Monitored' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Missing' })).toBeInTheDocument();
  });

  it('calls onChange when option is selected', async () => {
    const user = userEvent.setup();
    render(
      <FilterMenu
        value="all"
        options={defaultOptions}
        onChange={mockOnChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Filter' }));
    await user.click(screen.getByRole('menuitem', { name: 'Monitored' }));

    expect(mockOnChange).toHaveBeenCalledWith('monitored');
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('calls onCustomFilter when custom option is selected', async () => {
    const user = userEvent.setup();
    render(
      <FilterMenu
        value="all"
        options={defaultOptions}
        onChange={mockOnChange}
        onCustomFilter={mockOnCustomFilter}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Filter' }));
    await user.click(screen.getByRole('menuitem', { name: 'Custom...' }));

    expect(mockOnCustomFilter).toHaveBeenCalled();
    expect(mockOnCustomFilter).toHaveBeenCalledTimes(1);
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('shows custom as selected when customFilterActive is true', () => {
    render(
      <FilterMenu
        value="all"
        options={defaultOptions}
        onChange={mockOnChange}
        onCustomFilter={mockOnCustomFilter}
        customFilterActive
      />,
    );

    expect(screen.getByRole('button', { name: 'Filter' })).toHaveTextContent('Custom...');
  });

  it('shows original value when customFilterActive is false', () => {
    render(
      <FilterMenu
        value="monitored"
        options={defaultOptions}
        onChange={mockOnChange}
        onCustomFilter={mockOnCustomFilter}
        customFilterActive={false}
      />,
    );

    expect(screen.getByRole('button', { name: 'Filter' })).toHaveTextContent('Monitored');
  });

  it('handles multiple value changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <FilterMenu
        value="all"
        options={defaultOptions}
        onChange={mockOnChange}
      />,
    );

    // First change
    await user.click(screen.getByRole('button', { name: 'Filter' }));
    await user.click(screen.getByRole('menuitem', { name: 'Monitored' }));
    expect(mockOnChange).toHaveBeenLastCalledWith('monitored');

    // Simulate parent state update
    rerender(
      <FilterMenu
        value="monitored"
        options={defaultOptions}
        onChange={mockOnChange}
      />,
    );

    // Second change
    await user.click(screen.getByRole('button', { name: 'Filter' }));
    await user.click(screen.getByRole('menuitem', { name: 'Missing' }));
    expect(mockOnChange).toHaveBeenLastCalledWith('missing');

    expect(mockOnChange).toHaveBeenCalledTimes(2);
  });

  it('respects the label prop for accessibility', () => {
    render(
      <FilterMenu
        label="Movie Status"
        value="all"
        options={defaultOptions}
        onChange={mockOnChange}
      />,
    );

    expect(screen.getByRole('button', { name: 'Movie Status' })).toBeInTheDocument();
  });
});
