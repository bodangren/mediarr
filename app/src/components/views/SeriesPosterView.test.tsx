import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
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

function renderSeriesPosterView(props: React.ComponentProps<typeof SeriesPosterView>) {
  return render(
    <MemoryRouter>
      <SeriesPosterView {...props} />
    </MemoryRouter>,
  );
}

describe('SeriesPosterView', () => {
  it('renders series poster cards', () => {
    const onToggleMonitored = vi.fn();
    renderSeriesPosterView({ items: mockSeries, onToggleMonitored });

    expect(screen.getByText('Test Series 1')).toBeInTheDocument();
    expect(screen.getByText('Test Series 2')).toBeInTheDocument();
    expect(screen.getByText('2022')).toBeInTheDocument();
    expect(screen.getByText('2021')).toBeInTheDocument();
  });

  it('calls onToggleMonitored when monitoring button is clicked', () => {
    const onToggleMonitored = vi.fn();
    renderSeriesPosterView({ items: mockSeries, onToggleMonitored });

    const toggleButton = screen.getByRole('button', { name: 'Disable monitoring' });

    fireEvent.click(toggleButton);
    expect(onToggleMonitored).toHaveBeenCalledWith(1, false);
  });

  it('calls onDelete when delete button is clicked', () => {
    const onToggleMonitored = vi.fn();
    const onDelete = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderSeriesPosterView({ items: mockSeries, onToggleMonitored, onDelete });

    fireEvent.click(screen.getByRole('button', { name: 'Delete Test Series 1' }));

    expect(confirmSpy).toHaveBeenCalledWith('Delete Test Series 1?');
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('displays empty state when no items', () => {
    const onToggleMonitored = vi.fn();
    renderSeriesPosterView({ items: [], onToggleMonitored });

    expect(screen.getByText('No series found')).toBeInTheDocument();
  });

  it('shows progress bar with correct percentage', () => {
    const onToggleMonitored = vi.fn();
    renderSeriesPosterView({ items: mockSeries, onToggleMonitored });

    // First series has 2 of 3 episodes complete = ~67%
    const progressBar = screen.getByRole('progressbar', { name: 'Episode progress: 67%' });
    expect(progressBar).toHaveAttribute('aria-valuenow', '66.66666666666666');
  });

  it('navigates to series detail when card is clicked', () => {
    const onToggleMonitored = vi.fn();
    renderSeriesPosterView({ items: mockSeries, onToggleMonitored });

    const link = screen.getByRole('link', { name: /test series 1/i });
    expect(link).toHaveAttribute('href', '/library/tv/1');
  });
});
