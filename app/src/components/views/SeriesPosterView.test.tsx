import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SeriesPosterView } from './SeriesPosterView';
import type { SeriesListItem } from '@/types/series';

const mockSeries: SeriesListItem[] = [
  {
    id: 1,
    title: 'Test Series 1',
    year: 2022,
    status: 'continuing',
    monitored: true,
    seasons: [
      {
        episodes: [
          { path: '/path/to/episode1.mkv', seasonNumber: 1, episodeNumber: 1 },
          { path: '/path/to/episode2.mkv', seasonNumber: 1, episodeNumber: 2 },
          { path: null, seasonNumber: 1, episodeNumber: 3 },
        ],
      },
    ],
    posterUrl: '/test-poster.jpg',
  },
  {
    id: 2,
    title: 'Test Series 2',
    year: 2021,
    status: 'ended',
    monitored: false,
    seasons: [],
    posterUrl: '/test-poster2.jpg',
  },
];

describe('SeriesPosterView', () => {
  it('renders series poster cards', () => {
    const onToggleMonitored = vi.fn();
    render(<SeriesPosterView items={mockSeries} onToggleMonitored={onToggleMonitored} />);

    expect(screen.getByText('Test Series 1')).toBeInTheDocument();
    expect(screen.getByText('Test Series 2')).toBeInTheDocument();
    expect(screen.getByText('2022')).toBeInTheDocument();
    expect(screen.getByText('2021')).toBeInTheDocument();
  });

  it('calls onToggleMonitored when monitoring button is clicked', () => {
    const onToggleMonitored = vi.fn();
    render(<SeriesPosterView items={mockSeries} onToggleMonitored={onToggleMonitored} />);

    const firstSeriesCard = screen.getByText('Test Series 1').closest('a');
    const toggleButton = firstSeriesCard?.querySelector('button[aria-label*="Disable"]');
    expect(toggleButton).toBeInTheDocument();

    if (toggleButton) {
      fireEvent.click(toggleButton);
      expect(onToggleMonitored).toHaveBeenCalledWith(1, false);
    }
  });

  it('calls onDelete when delete button is clicked', () => {
    const onToggleMonitored = vi.fn();
    const onDelete = vi.fn();
    // Mock window.confirm
    window.confirm = vi.fn(() => true);

    render(
      <SeriesPosterView
        items={mockSeries}
        onToggleMonitored={onToggleMonitored}
        onDelete={onDelete}
      />,
    );

    // First hover over the card to show action buttons
    const firstSeriesCard = screen.getByText('Test Series 1').closest('a');
    if (firstSeriesCard) {
      fireEvent.mouseEnter(firstSeriesCard);

      // Then find and click delete button
      const deleteButton = firstSeriesCard.querySelector('button[aria-label*="Delete"]');
      expect(deleteButton).toBeInTheDocument();

      if (deleteButton) {
        fireEvent.click(deleteButton);
        expect(window.confirm).toHaveBeenCalledWith('Delete Test Series 1?');
        expect(onDelete).toHaveBeenCalledWith(1);
      }
    }
  });

  it('displays empty state when no items', () => {
    const onToggleMonitored = vi.fn();
    render(<SeriesPosterView items={[]} onToggleMonitored={onToggleMonitored} />);

    expect(screen.getByText('No series found')).toBeInTheDocument();
  });

  it('shows progress bar with correct percentage', () => {
    const onToggleMonitored = vi.fn();
    render(<SeriesPosterView items={mockSeries} onToggleMonitored={onToggleMonitored} />);

    // First series has 2 of 3 episodes complete = ~67%
    const progressBar = screen.getAllByRole('progressbar')[0];
    expect(progressBar).toHaveAttribute('aria-valuenow', '66.66666666666666');
  });

  it('navigates to series detail when card is clicked', () => {
    const onToggleMonitored = vi.fn();
    render(<SeriesPosterView items={mockSeries} onToggleMonitored={onToggleMonitored} />);

    const link = screen.getByText('Test Series 1').closest('a');
    expect(link).toHaveAttribute('href', '/library/series/1');
  });
});
