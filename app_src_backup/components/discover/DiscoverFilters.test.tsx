import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { DiscoverFilters } from './DiscoverFilters';
import { useState } from 'react';

const mockOnApply = vi.fn();
const mockOnClear = vi.fn();

describe('DiscoverFilters', () => {
  const defaultFilters = {
    genres: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders filter sections correctly', () => {
    const filters = defaultFilters;
    const onChange = vi.fn();

    render(
      <DiscoverFilters
        filters={filters}
        onChange={onChange}
        onApply={mockOnApply}
        onClear={mockOnClear}
      />
    );

    expect(screen.getByLabelText('Min Year')).toBeInTheDocument();
    expect(screen.getByLabelText('Max Year')).toBeInTheDocument();
    expect(screen.getByText('Genres')).toBeInTheDocument();
    expect(screen.getByText('Certification')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
  });

  it('renders filter sections correctly', () => {
    const onChange = vi.fn();

    render(
      <DiscoverFilters
        filters={defaultFilters}
        onChange={onChange}
        onApply={mockOnApply}
        onClear={mockOnClear}
      />
    );

    expect(screen.getByLabelText('Min Year')).toBeInTheDocument();
    expect(screen.getByLabelText('Max Year')).toBeInTheDocument();
    expect(screen.getByText('Genres')).toBeInTheDocument();
    expect(screen.getByText('Certification')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
  });

  it('updates min year filter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DiscoverFilters
        filters={defaultFilters}
        onChange={onChange}
        onApply={mockOnApply}
        onClear={mockOnClear}
      />
    );

    const minYearInput = screen.getByLabelText('Min Year') as HTMLInputElement;
    fireEvent.change(minYearInput, { target: { value: '2010' } });

    expect(onChange).toHaveBeenLastCalledWith({ ...defaultFilters, minYear: 2010 });
  });

  it('updates max year filter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DiscoverFilters
        filters={defaultFilters}
        onChange={onChange}
        onApply={mockOnApply}
        onClear={mockOnClear}
      />
    );

    const maxYearInput = screen.getByLabelText('Max Year') as HTMLInputElement;
    fireEvent.change(maxYearInput, { target: { value: '2020' } });

    expect(onChange).toHaveBeenLastCalledWith({ ...defaultFilters, maxYear: 2020 });
  });

  it('updates max year filter', async () => {
    const onChange = vi.fn();

    render(
      <DiscoverFilters
        filters={defaultFilters}
        onChange={onChange}
        onApply={mockOnApply}
        onClear={mockOnClear}
      />
    );

    const maxYearInput = screen.getByLabelText('Max Year') as HTMLInputElement;
    fireEvent.change(maxYearInput, { target: { value: '2020' } });

    expect(onChange).toHaveBeenLastCalledWith({ ...defaultFilters, maxYear: 2020 });
  });

  it('toggles genre filter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DiscoverFilters
        filters={defaultFilters}
        onChange={onChange}
        onApply={mockOnApply}
        onClear={mockOnClear}
      />
    );

    const actionCheckbox = screen.getByLabelText(/action/i);

    // Click to add genre
    await user.click(actionCheckbox);
    expect(onChange).toHaveBeenCalledWith({ ...defaultFilters, genres: ['Action'] });
  });

  it('updates certification filter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DiscoverFilters
        filters={defaultFilters}
        onChange={onChange}
        onApply={mockOnApply}
        onClear={mockOnClear}
      />
    );

    const certificationHeading = screen.getByText('Certification');
    const certificationSelect = certificationHeading.nextElementSibling as HTMLSelectElement;
    await user.selectOptions(certificationSelect, 'PG-13');

    expect(onChange).toHaveBeenCalledWith({ ...defaultFilters, certification: 'PG-13' });
  });

  it('updates language filter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DiscoverFilters
        filters={defaultFilters}
        onChange={onChange}
        onApply={mockOnApply}
        onClear={mockOnClear}
      />
    );

    const languageHeading = screen.getByText('Language');
    const languageSelect = languageHeading.nextElementSibling as HTMLSelectElement;
    await user.selectOptions(languageSelect, 'English');

    expect(onChange).toHaveBeenCalledWith({ ...defaultFilters, language: 'English' });
  });

  it('calls onApply when Apply button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DiscoverFilters
        filters={defaultFilters}
        onChange={onChange}
        onApply={mockOnApply}
        onClear={mockOnClear}
      />
    );

    const applyButton = screen.getByRole('button', { name: /apply filters/i });
    await user.click(applyButton);

    expect(mockOnApply).toHaveBeenCalledTimes(1);
  });

  it('calls onClear when Clear button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DiscoverFilters
        filters={defaultFilters}
        onChange={onChange}
        onApply={mockOnApply}
        onClear={mockOnClear}
      />
    );

    const clearButton = screen.getByRole('button', { name: /^clear$/i });
    await user.click(clearButton);

    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });

  it('renders with existing filter values', () => {
    const filtersWithValue = {
      minYear: 2010,
      maxYear: 2020,
      genres: ['Action', 'Comedy'],
      certification: 'PG-13' as const,
      language: 'English',
    };
    const onChange = vi.fn();

    render(
      <DiscoverFilters
        filters={filtersWithValue}
        onChange={onChange}
        onApply={mockOnApply}
        onClear={mockOnClear}
      />
    );

    expect(screen.getByDisplayValue('2010')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2020')).toBeInTheDocument();
    expect(screen.getByLabelText(/action/i)).toBeChecked();
    expect(screen.getByLabelText(/comedy/i)).toBeChecked();
  });

  it('displays all genre checkboxes', () => {
    const onChange = vi.fn();

    render(
      <DiscoverFilters
        filters={defaultFilters}
        onChange={onChange}
        onApply={mockOnApply}
        onClear={mockOnClear}
      />
    );

    const genreCheckboxes = screen.getAllByRole('checkbox');
    expect(genreCheckboxes.length).toBeGreaterThan(15);
  });
});
