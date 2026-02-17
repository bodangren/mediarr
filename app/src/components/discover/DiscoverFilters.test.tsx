import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { DiscoverFilters } from './DiscoverFilters';

const mockOnChange = vi.fn();
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
    render(
      <DiscoverFilters
        filters={defaultFilters}
        onChange={mockOnChange}
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
    render(
      <DiscoverFilters
        filters={defaultFilters}
        onChange={mockOnChange}
        onApply={mockOnApply}
        onClear={mockOnClear}
      />
    );

    const minYearInput = screen.getByLabelText('Min Year');
    await user.type(minYearInput, '2010');

    expect(mockOnChange).toHaveBeenCalledWith({ ...defaultFilters, minYear: 2010 });
  });

  it('updates max year filter', async () => {
    const user = userEvent.setup();
    render(
      <DiscoverFilters
        filters={defaultFilters}
        onChange={mockOnChange}
        onApply={mockOnApply}
        onClear={mockOnClear}
      />
    );

    const maxYearInput = screen.getByLabelText('Max Year');
    await user.type(maxYearInput, '2020');

    expect(mockOnChange).toHaveBeenCalledWith({ ...defaultFilters, maxYear: 2020 });
  });

  it('toggles genre filter', async () => {
    const user = userEvent.setup();
    render(
      <DiscoverFilters
        filters={defaultFilters}
        onChange={mockOnChange}
        onApply={mockOnApply}
        onClear={mockOnClear}
      />
    );

    const actionCheckbox = screen.getByLabelText(/action/i);
    await user.click(actionCheckbox);

    expect(mockOnChange).toHaveBeenCalledWith({ ...defaultFilters, genres: ['Action'] });

    await user.click(actionCheckbox);

    expect(mockOnChange).toHaveBeenCalledWith({ ...defaultFilters, genres: [] });
  });

  it('updates certification filter', async () => {
    const user = userEvent.setup();
    render(
      <DiscoverFilters
        filters={defaultFilters}
        onChange={mockOnChange}
        onApply={mockOnApply}
        onClear={mockOnClear}
      />
    );

    const certificationSelect = screen.getByRole('combobox', { name: /certification/i });
    await user.selectOptions(certificationSelect, 'PG-13');

    expect(mockOnChange).toHaveBeenCalledWith({ ...defaultFilters, certification: 'PG-13' });
  });

  it('updates language filter', async () => {
    const user = userEvent.setup();
    render(
      <DiscoverFilters
        filters={defaultFilters}
        onChange={mockOnChange}
        onApply={mockOnApply}
        onClear={mockOnClear}
      />
    );

    const languageSelect = screen.getByRole('combobox', { name: /language/i });
    await user.selectOptions(languageSelect, 'English');

    expect(mockOnChange).toHaveBeenCalledWith({ ...defaultFilters, language: 'English' });
  });

  it('calls onApply when Apply button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <DiscoverFilters
        filters={defaultFilters}
        onChange={mockOnChange}
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
    render(
      <DiscoverFilters
        filters={defaultFilters}
        onChange={mockOnChange}
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

    render(
      <DiscoverFilters
        filters={filtersWithValue}
        onChange={mockOnChange}
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
    render(
      <DiscoverFilters
        filters={defaultFilters}
        onChange={mockOnChange}
        onApply={mockOnApply}
        onClear={mockOnClear}
      />
    );

    const genreCheckboxes = screen.getAllByRole('checkbox');
    expect(genreCheckboxes.length).toBeGreaterThan(15);
  });
});
