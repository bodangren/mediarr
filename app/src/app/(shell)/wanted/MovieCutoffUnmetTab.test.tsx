import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MovieCutoffUnmetTab } from './MovieCutoffUnmetTab';
import type { CutoffUnmetMovie } from '@/types/wanted';

const mockOnSearchMovie = vi.fn();
const mockOnBulkSearch = vi.fn();

describe('MovieCutoffUnmetTab', () => {
  beforeEach(() => {
    mockOnSearchMovie.mockClear();
    mockOnBulkSearch.mockClear();
  });

  it('renders cutoff unmet movies table', () => {
    render(
      <MovieCutoffUnmetTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    expect(screen.getByText('Cutoff Unmet Movies')).toBeInTheDocument();
    expect(screen.getByText('Movies that have files but don\'t meet the quality cutoff.')).toBeInTheDocument();
  });

  it('renders movie data including titles and years', () => {
    render(
      <MovieCutoffUnmetTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    // Check for some movies from mock data
    expect(screen.getByText('The Matrix')).toBeInTheDocument();
    expect(screen.getByText('1999')).toBeInTheDocument();
    expect(screen.getByText('Pulp Fiction')).toBeInTheDocument();
  });

  it('shows quality comparison for movies', () => {
    render(
      <MovieCutoffUnmetTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    expect(screen.getByText('Bluray-720p')).toBeInTheDocument();
    expect(screen.getByText('Bluray-1080p')).toBeInTheDocument();
    expect(screen.getByText('Bluray-2160p')).toBeInTheDocument();
  });

  it('shows quality profile information', () => {
    render(
      <MovieCutoffUnmetTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    expect(screen.getByText('HD-1080p')).toBeInTheDocument();
    expect(screen.getByText('UHD-2160p')).toBeInTheDocument();
  });

  it('shows file size information', () => {
    render(
      <MovieCutoffUnmetTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    expect(screen.getByText(/4\.50 GB/i)).toBeInTheDocument();
    expect(screen.getByText(/2\.10 GB/i)).toBeInTheDocument();
    expect(screen.getByText(/8\.70 GB/i)).toBeInTheDocument();
  });

  it('calls onSearchMovie when Search button is clicked', async () => {
    render(
      <MovieCutoffUnmetTab
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
      <MovieCutoffUnmetTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    // Initially no bulk search button
    expect(screen.queryByText(/Search for upgrades \(\d+\)/i)).not.toBeInTheDocument();

    // Select first checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);

    fireEvent.click(checkboxes[0]);

    // Should show bulk search button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Search for upgrades \(1\)/i })).toBeInTheDocument();
    });
  });

  it('calls onBulkSearch when bulk search button is clicked', async () => {
    render(
      <MovieCutoffUnmetTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    await waitFor(() => {
      const bulkSearchButton = screen.getByRole('button', { name: /Search for upgrades \(2\)/i });
      expect(bulkSearchButton).toBeInTheDocument();
    });

    fireEvent.click(bulkSearchButton);

    await waitFor(() => {
      expect(mockOnBulkSearch).toHaveBeenCalledTimes(1);
    });
  });

  it('shows monitored status for movies', () => {
    render(
      <MovieCutoffUnmetTab
        onSearchMovie={mockOnSearchMovie}
        onBulkSearch={mockOnBulkSearch}
      />,
    );

    expect(screen.getAllByText('Monitored').length).toBeGreaterThan(0);
    expect(screen.getByText('Unmonitored')).toBeInTheDocument();
  });
});
