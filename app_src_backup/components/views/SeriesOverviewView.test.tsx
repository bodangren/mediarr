import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SeriesOverviewView } from './SeriesOverviewView';
import type { SeriesListItem } from '@/types/series';

const mockSeries: SeriesListItem[] = [
  {
    id: 1,
    title: 'Test Series 1',
    year: 2022,
    status: 'continuing',
    monitored: true,
    network: 'Test Network',
    overview: 'This is a test overview for the series.',
    seasons: [
      {
        episodes: [
          { path: '/path/to/episode1.mkv', seasonNumber: 1, episodeNumber: 1, airDate: '2024-01-01' },
          { path: '/path/to/episode2.mkv', seasonNumber: 1, episodeNumber: 2, airDate: '2024-01-08' },
          { path: null, seasonNumber: 1, episodeNumber: 3, airDate: '2024-01-15' },
          { path: null, seasonNumber: 1, episodeNumber: 4, airDate: '2024-01-22' },
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
    overview: 'Another test series overview.',
    posterUrl: '/test-poster2.jpg',
  },
];

describe('SeriesOverviewView', () => {
  it('renders series overview cards', () => {
    const onToggleMonitored = vi.fn();
    render(<SeriesOverviewView items={mockSeries} onToggleMonitored={onToggleMonitored} />);

    expect(screen.getByText('Test Series 1')).toBeInTheDocument();
    expect(screen.getByText('Test Series 2')).toBeInTheDocument();
    expect(screen.getByText('2022')).toBeInTheDocument();
    expect(screen.getByText('2021')).toBeInTheDocument();
    expect(screen.getByText('Test Network')).toBeInTheDocument();
  });

  it('calls onToggleMonitored when monitoring button is clicked', () => {
    const onToggleMonitored = vi.fn();
    render(<SeriesOverviewView items={mockSeries} onToggleMonitored={onToggleMonitored} />);

    const toggleButton = screen.getAllByRole('button', { name: /Enable|Disable/ })[0];
    fireEvent.click(toggleButton);

    expect(onToggleMonitored).toHaveBeenCalledWith(1, false);
  });

  it('toggles description expansion', () => {
    const onToggleMonitored = vi.fn();
    render(<SeriesOverviewView items={mockSeries} onToggleMonitored={onToggleMonitored} />);

    // Initially, description should not be expanded
    expect(screen.queryByText('This is a test overview for the series.')).not.toBeInTheDocument();

    // Click first "Show more" button
    const showMoreButton = screen.getAllByText('Show more')[0];
    fireEvent.click(showMoreButton);

    // Now description should be visible
    expect(screen.getByText('This is a test overview for the series.')).toBeInTheDocument();
    expect(screen.getAllByText('Show less')).toHaveLength(1);
  });

  it('displays episode progress correctly', () => {
    const onToggleMonitored = vi.fn();
    render(<SeriesOverviewView items={mockSeries} onToggleMonitored={onToggleMonitored} />);

    expect(screen.getByText('2/4 episodes')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', () => {
    const onToggleMonitored = vi.fn();
    const onDelete = vi.fn();
    window.confirm = vi.fn(() => true);

    render(
      <SeriesOverviewView
        items={mockSeries}
        onToggleMonitored={onToggleMonitored}
        onDelete={onDelete}
      />,
    );

    const deleteButton = screen.getAllByRole('button', { name: /Delete/ })[0];
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith('Delete Test Series 1?');
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('does not call onDelete when confirm is cancelled', () => {
    const onToggleMonitored = vi.fn();
    const onDelete = vi.fn();
    window.confirm = vi.fn(() => false);

    render(
      <SeriesOverviewView
        items={mockSeries}
        onToggleMonitored={onToggleMonitored}
        onDelete={onDelete}
      />,
    );

    const deleteButton = screen.getAllByRole('button', { name: /Delete/ })[0];
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith('Delete Test Series 1?');
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('displays empty state when no items', () => {
    const onToggleMonitored = vi.fn();
    render(<SeriesOverviewView items={[]} onToggleMonitored={onToggleMonitored} />);

    expect(screen.getByText('No series found')).toBeInTheDocument();
  });

  it('navigates to series detail when title is clicked', () => {
    const onToggleMonitored = vi.fn();
    render(<SeriesOverviewView items={mockSeries} onToggleMonitored={onToggleMonitored} />);

    const link = screen.getByText('Test Series 1');
    expect(link).toHaveAttribute('href', '/library/series/1');
  });

  it('navigates to series detail when poster thumbnail is clicked', () => {
    const onToggleMonitored = vi.fn();
    render(<SeriesOverviewView items={mockSeries} onToggleMonitored={onToggleMonitored} />);

    const posterLinks = screen.getAllByRole('link');
    const firstPosterLink = posterLinks.find(link => link.querySelector('img'));
    expect(firstPosterLink).toHaveAttribute('href', '/library/series/1');
  });
});
