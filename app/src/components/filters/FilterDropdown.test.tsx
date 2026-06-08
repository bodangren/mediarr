import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FilterDropdown } from './FilterDropdown';
import type { CustomFilter } from '@/lib/api/filters';

const baseFilters: CustomFilter[] = [
  {
    id: 1,
    name: 'HBO Shows',
    type: 'series',
    conditions: { operator: 'and', conditions: [{ field: 'network', operator: 'equals', value: 'HBO' }] },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Continuing Only',
    type: 'series',
    conditions: { operator: 'and', conditions: [{ field: 'status', operator: 'equals', value: 'continuing' }] },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const renderDropdown = (props = {}) => {
  const defaults = {
    filters: baseFilters,
    selectedFilterId: null as number | 'custom' | null,
    onSelectFilter: vi.fn(),
    onOpenBuilder: vi.fn(),
  };
  return render(<FilterDropdown {...defaults} {...props} />);
};

describe('FilterDropdown', () => {
  it('renders options', () => {
    renderDropdown();

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    expect(screen.getByRole('option', { name: 'All series' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'HBO Shows' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Continuing Only' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Custom...' })).toBeInTheDocument();
  });

  it('calls onSelectFilter with null when "All" is selected', async () => {
    const onSelectFilter = vi.fn();
    const user = userEvent.setup();
    renderDropdown({ selectedFilterId: 1, onSelectFilter });

    await user.selectOptions(screen.getByRole('combobox'), 'all');

    expect(onSelectFilter).toHaveBeenCalledWith(null);
  });

  it('calls onSelectFilter with the filter id when a saved filter is selected', async () => {
    const onSelectFilter = vi.fn();
    const user = userEvent.setup();
    renderDropdown({ onSelectFilter });

    await user.selectOptions(screen.getByRole('combobox'), '1');

    expect(onSelectFilter).toHaveBeenCalledWith(1);
  });

  it('calls onSelectFilter with "custom" and onOpenBuilder when Custom is selected', async () => {
    const onSelectFilter = vi.fn();
    const onOpenBuilder = vi.fn();
    const user = userEvent.setup();
    renderDropdown({ onSelectFilter, onOpenBuilder });

    await user.selectOptions(screen.getByRole('combobox'), 'custom');

    expect(onSelectFilter).toHaveBeenCalledWith('custom');
    expect(onOpenBuilder).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenBuilder when the Build Filter button is clicked', async () => {
    const onOpenBuilder = vi.fn();
    const user = userEvent.setup();
    renderDropdown({ onOpenBuilder });

    await user.click(screen.getByRole('button', { name: 'Build Filter' }));

    expect(onOpenBuilder).toHaveBeenCalledTimes(1);
  });

  it('shows "Edit Filter" button label when a saved filter is selected', () => {
    renderDropdown({ selectedFilterId: 1 });

    expect(screen.getByRole('button', { name: 'Edit Filter' })).toBeInTheDocument();
  });
});
