import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MovieMissingTab } from './MovieMissingTab';
import type { MissingMovie } from '@/types/wanted';

const mockOnSearchMovie = vi.fn();
const mockOnBulkSearch = vi.fn();

describe('MovieMissingTab', () => {
  beforeEach(() => {
    mockOnSearchMovie.mockClear();
    mockOnBulkSearch.mockClear();
  });

  it('renders missing movies table', () => {
    render(
      <MovieMissingTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    expect(screen.getByText('Missing Movies')).toBeInTheDocument();
    expect(screen.getByText('Monitored movies that are not yet downloaded.')).toBeInTheDocument();
  });

  it('renders movie data including posters and titles', () => {
    render(
      <MovieMissingTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    // Check for some movies from mock data
    expect(screen.getByText('Dune: Part Two')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();
    expect(screen.getByText('Godzilla x Kong: The New Empire')).toBeInTheDocument();
  });

  it('shows release dates for movies', () => {
    render(
      <MovieMissingTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    expect(screen.getByText(/Cinema:/i)).toBeInTheDocument();
    expect(screen.getByText(/Digital:/i)).toBeInTheDocument();
    expect(screen.getByText(/Physical:/i)).toBeInTheDocument();
  });

  it('shows quality profile information', () => {
    render(
      <MovieMissingTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    expect(screen.getByText('HD-1080p')).toBeInTheDocument();
  });

  it('shows runtime information', () => {
    render(
      <MovieMissingTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    expect(screen.getByText('166 min')).toBeInTheDocument();
    expect(screen.getByText('115 min')).toBeInTheDocument();
  });

  it('calls onSearchMovie when Search button is clicked', async () => {
    render(
      <MovieMissingTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    const searchButtons = screen.getAllByRole('button', { name: 'Search' });
    expect(searchButtons.length).toBeGreaterThan(0);

    fireEvent.click(searchButtons[0]);
    await waitFor(() => {
      expect(mockOnSearchMovie).toHaveBeenCalledTimes(1);
    });
  });

  it('shows bulk search button when items are selected', async () => {
    render(
      <MovieMissingTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    // Initially no bulk search button
    expect(screen.queryByText(/Search \d+ selected/i)).not.toBeInTheDocument();

    // Select first checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);

    fireEvent.click(checkboxes[0]);

    // Should show bulk search button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Search 1 selected/i })).toBeInTheDocument();
    });
  });

  it('calls onBulkSearch when bulk search button is clicked', async () => {
    render(
      <MovieMissingTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    await waitFor(() => {
      const bulkSearchButton = screen.getByRole('button', { name: /Search 2 selected/i });
      expect(bulkSearchButton).toBeInTheDocument();
    });

    fireEvent.click(bulkSearchButton);

    await waitFor(() => {
      expect(mockOnBulkSearch).toHaveBeenCalledTimes(1);
    });
  });

  it('shows monitored status for movies', () => {
    render(
      <MovieMissingTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    expect(screen.getAllByText('Monitored').length).toBeGreaterThan(0);
    expect(screen.getByText('Unmonitored')).toBeInTheDocument();
  });
});
